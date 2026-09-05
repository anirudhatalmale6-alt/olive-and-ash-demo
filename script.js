/* ============================================================
   Olive & Ash — front-end behaviour
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     Business configuration — the only block that changes per
     restaurant. Times are minutes from midnight, in the
     restaurant's OWN timezone (never the visitor's).
     ---------------------------------------------------------- */
  var CONFIG = {
    timezone: "Europe/London",
    lastSeating: 75,          // minutes before close that the kitchen stops
    slotStep: 30,             // booking slots every N minutes
    maxPartyOnline: 6,
    // 0 = Sunday … 6 = Saturday. Keyed explicitly: day 0 must never be
    // dropped by a truthiness test.
    hours: {
      0: [[12 * 60, 16 * 60]],
      1: [],
      2: [[17 * 60, 22 * 60 + 30]],
      3: [[17 * 60, 22 * 60 + 30]],
      4: [[17 * 60, 22 * 60 + 30]],
      5: [[12 * 60, 15 * 60], [17 * 60, 23 * 60 + 30]],
      6: [[12 * 60, 15 * 60], [17 * 60, 23 * 60 + 30]]
    }
  };

  var DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function fmtTime(mins) {
    var h = Math.floor(mins / 60) % 24, m = mins % 60;
    var ampm = h < 12 ? "am" : "pm";
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + (m ? ":" + pad(m) : "") + ampm;
  }

  /* Current time inside the restaurant's timezone, not the visitor's. */
  function businessNow() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: CONFIG.timezone, weekday: "short",
        hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date());
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    var hour = parseInt(out.hour, 10);
    if (hour === 24) hour = 0;                       // some engines emit 24
    return {
      day: DAY_INDEX[out.weekday] != null ? DAY_INDEX[out.weekday] : new Date().getDay(),
      minutes: hour * 60 + parseInt(out.minute, 10)
    };
  }

  function rangesFor(day) {
    return Object.prototype.hasOwnProperty.call(CONFIG.hours, day) ? CONFIG.hours[day] : [];
  }

  /* ---------------------------------------------------------- open / closed */
  function renderStatus() {
    var box = document.getElementById("status");
    var text = document.getElementById("statusText");
    if (!box || !text) return;

    var now = businessNow();
    var today = rangesFor(now.day);
    var open = null;

    for (var i = 0; i < today.length; i++) {
      if (now.minutes >= today[i][0] && now.minutes < today[i][1]) { open = today[i]; break; }
    }

    box.hidden = false;
    box.classList.remove("is-open", "is-shut");

    if (open) {
      box.classList.add("is-open");
      text.textContent = "Open now · until " + fmtTime(open[1]);
      return;
    }

    box.classList.add("is-shut");

    /* next opening: later today, else scan forward up to 7 days */
    for (var j = 0; j < today.length; j++) {
      if (today[j][0] > now.minutes) {
        text.textContent = "Closed · opens " + fmtTime(today[j][0]);
        return;
      }
    }
    for (var k = 1; k <= 7; k++) {
      var d = (now.day + k) % 7;
      var r = rangesFor(d);
      if (r.length) {
        var name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d];
        text.textContent = "Closed · opens " + (k === 1 ? "tomorrow" : name) + " " + fmtTime(r[0][0]);
        return;
      }
    }
    text.textContent = "Closed";
  }

  /* ---------------------------------------------------------- today's row */
  function markToday() {
    var day = businessNow().day;
    var rows = document.querySelectorAll("#hoursTable tr[data-day]");
    Array.prototype.forEach.call(rows, function (row) {
      row.classList.toggle("today", parseInt(row.getAttribute("data-day"), 10) === day);
    });
  }

  /* ---------------------------------------------------------- header */
  (function header() {
    var head = document.getElementById("siteHead");
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    if (!head) return;

    var last = 0;
    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      head.classList.toggle("solid", y > 40);
      head.classList.toggle("hide", y > 480 && y > last && !nav.classList.contains("open"));
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        document.body.style.overflow = open ? "hidden" : "";
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A" && nav.classList.contains("open")) {
          nav.classList.remove("open");
          burger.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) burger.click();
      });
    }
  })();

  /* ---------------------------------------------------------- scroll reveals */
  (function reveals() {
    var items = document.querySelectorAll(".reveal-up");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------- booking form */
  (function booking() {
    var form = document.getElementById("bookForm");
    if (!form) return;

    var dateEl = document.getElementById("f-date");
    var timeEl = document.getElementById("f-time");
    var msg = document.getElementById("formMsg");

    /* today .. 90 days ahead, in the restaurant's timezone */
    function isoInTz(offsetDays) {
      var f = new Intl.DateTimeFormat("en-CA", {
        timeZone: CONFIG.timezone, year: "numeric", month: "2-digit", day: "2-digit"
      });
      var d = new Date();
      d.setDate(d.getDate() + (offsetDays || 0));
      return f.format(d);
    }
    try {
      dateEl.min = isoInTz(0);
      dateEl.max = isoInTz(90);
    } catch (e) { /* older engines: leave unbounded */ }

    /* Parse yyyy-mm-dd as a plain calendar date — no timezone shift. */
    function dayOfWeek(iso) {
      var p = String(iso).split("-");
      if (p.length !== 3) return null;
      var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
      return isNaN(d.getTime()) ? null : d.getUTCDay();
    }

    function fillTimes() {
      var iso = dateEl.value;
      timeEl.innerHTML = "";
      if (!iso) {
        timeEl.appendChild(new Option("Pick a date", ""));
        timeEl.disabled = true;
        return;
      }
      var dow = dayOfWeek(iso);
      var ranges = dow === null ? [] : rangesFor(dow);
      if (!ranges.length) {
        timeEl.appendChild(new Option("Closed this day", ""));
        timeEl.disabled = true;
        setMsg("We are closed that day — Monday is our day off. Try another date.", "bad");
        return;
      }
      timeEl.disabled = false;
      timeEl.appendChild(new Option("—", ""));

      var todayIso = isoInTz(0);
      var nowMins = businessNow().minutes;

      ranges.forEach(function (r) {
        var last = r[1] - CONFIG.lastSeating;
        for (var t = r[0]; t <= last; t += CONFIG.slotStep) {
          if (iso === todayIso && t <= nowMins + 60) continue;  // an hour's notice
          timeEl.appendChild(new Option(fmtTime(t), pad(Math.floor(t / 60)) + ":" + pad(t % 60)));
        }
      });

      if (timeEl.options.length <= 1) {
        timeEl.innerHTML = "";
        timeEl.appendChild(new Option("No slots left today", ""));
        timeEl.disabled = true;
        setMsg("Nothing left online for today — give us a ring and we will squeeze you in.", "bad");
      } else {
        setMsg("", "");
      }
    }

    dateEl.addEventListener("change", fillTimes);
    fillTimes();

    function setMsg(t, cls) {
      msg.textContent = t;
      msg.className = "form-msg" + (cls ? " " + cls : "");
    }

    function showErr(field, text) {
      var wrap = field.closest(".field");
      var slot = wrap ? wrap.querySelector(".err") : null;
      if (wrap) wrap.classList.toggle("invalid", !!text);
      if (slot) slot.textContent = text || "";
    }

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;

      [["f-name", "We need a name for the book."],
       ["f-phone", "A number, in case we have to call."],
       ["f-email", "An email for the confirmation."],
       ["f-date", "Which day?"],
       ["f-time", "Pick a time."]].forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        var val = (el.value || "").trim();
        var bad = "";
        if (!val) bad = pair[1];
        else if (pair[0] === "f-email" && !EMAIL.test(val)) bad = "That email does not look right.";
        else if (pair[0] === "f-phone" && val.replace(/[^\d]/g, "").length < 7) bad = "That number looks too short.";
        showErr(el, bad);
        if (bad) { ok = false; if (!first) first = el; }
      });

      if (!ok) {
        setMsg("Have another look at the fields marked above.", "bad");
        if (first) first.focus();
        return;
      }

      var btn = document.getElementById("submitBtn");
      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Sending…";
      setMsg("", "");

      /* Demo build: no back end wired up yet. On the live site this posts to
         the booking system / the restaurant's inbox. */
      window.setTimeout(function () {
        btn.disabled = false;
        btn.textContent = original;
        var name = document.getElementById("f-name").value.trim().split(" ")[0];
        setMsg("Thank you " + name + " — this is the demo build, so nothing was actually sent. "
             + "On the live site this books the table and emails you both a confirmation.", "ok");
      }, 700);
    });

    /* clear an error as soon as the visitor fixes it */
    form.addEventListener("input", function (e) {
      if (e.target.closest(".field.invalid")) showErr(e.target, "");
    });
  })();

  renderStatus();
  markToday();
  window.setInterval(function () { renderStatus(); markToday(); }, 60000);
})();
