# Olive & Ash — restaurant homepage (design demonstration)

A hand-built restaurant homepage, made to show design and front-end work before
any commitment. No framework, no page builder, no template — three files.

    index.html    semantic markup
    style.css     ~700 lines, written by hand
    script.js     no dependencies, no jQuery
    img/          photography (Wikimedia Commons, CC0)

## What actually works

- **Live open/closed indicator.** Computed in the visitor's browser against the
  restaurant's *own* timezone, so it stays correct behind any cache or CDN and
  for a visitor in another country. Re-checks every minute.
- **Booking form tied to the opening hours.** Pick a date and the time options
  are rebuilt from that day's service — lunch and dinner on Friday and Saturday,
  dinner only midweek, and Monday refuses outright because the kitchen is shut.
  Today's slots stop an hour from now; every service stops taking bookings 75
  minutes before close.
- **Today's row highlighted** in the opening-hours table, again in the
  restaurant's timezone.
- **Inline validation** that says something useful rather than "invalid input".
- **Mobile navigation**, closes on tap, on Escape, and locks the body scroll.

Opening hours, timezone, slot length and last seating are one config block at the
top of `script.js`. Nothing else needs touching to fit a different restaurant.

## Built in

Responsive from 320px up, `prefers-reduced-motion` respected, skip link, visible
focus rings, labelled form fields, semantic headings, `alt` text on every
photograph, page title and meta description, no horizontal overflow at any width.

## Not built yet

This is a front end. The booking form validates and confirms but does not send —
on a live site it would post to the restaurant's booking system or inbox. No CMS
is wired up, and there is one page rather than a full site.

Restaurant name, all copy and all photography are placeholders.
