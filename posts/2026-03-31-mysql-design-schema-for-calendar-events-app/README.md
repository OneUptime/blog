# How to Design a Schema for a Calendar/Events Application in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Calendar, Event, Schema Design

Description: Learn how to model a calendar application schema in MySQL with events, recurring patterns, attendees, and time zone handling.

---

A calendar schema must handle one-time and recurring events, multiple attendees, RSVP status, and time zone-aware storage. Getting the time zone handling right from the start is critical.

## Calendars and Users

```sql
CREATE TABLE users (
    id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email    VARCHAR(255) NOT NULL,
    timezone VARCHAR(50)  NOT NULL DEFAULT 'UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email)
);

CREATE TABLE calendars (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_id   INT UNSIGNED NOT NULL,
    name       VARCHAR(150) NOT NULL,
    color      CHAR(7)      NOT NULL DEFAULT '#3498db',
    is_default TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_owner (owner_id),
    CONSTRAINT fk_cal_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Events

Store all timestamps as UTC. Display layer handles conversion to the user's time zone.

```sql
CREATE TABLE events (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    calendar_id    INT UNSIGNED NOT NULL,
    creator_id     INT UNSIGNED NOT NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT         NULL,
    location       VARCHAR(255) NULL,
    start_at       DATETIME     NOT NULL,
    end_at         DATETIME     NOT NULL,
    all_day        TINYINT(1)   NOT NULL DEFAULT 0,
    recurrence_id  INT UNSIGNED NULL,
    is_exception   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_calendar_start (calendar_id, start_at),
    KEY idx_start_end      (start_at, end_at),
    KEY idx_recurrence     (recurrence_id),
    CONSTRAINT fk_evt_calendar   FOREIGN KEY (calendar_id)   REFERENCES calendars (id) ON DELETE CASCADE,
    CONSTRAINT fk_evt_creator    FOREIGN KEY (creator_id)    REFERENCES users     (id),
    CONSTRAINT fk_evt_recurrence FOREIGN KEY (recurrence_id) REFERENCES events    (id) ON DELETE CASCADE
);
```

## Recurrence Rules

Store recurrence patterns in iCalendar-compatible format:

```sql
CREATE TABLE recurrence_rules (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id  INT UNSIGNED NOT NULL,
    freq      ENUM('daily','weekly','monthly','yearly') NOT NULL,
    interval_ INT UNSIGNED NOT NULL DEFAULT 1,
    until     DATETIME     NULL,
    count     INT UNSIGNED NULL,
    byday     VARCHAR(50)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event (event_id),
    CONSTRAINT fk_rr_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);
```

## Attendees

```sql
CREATE TABLE event_attendees (
    event_id  INT UNSIGNED NOT NULL,
    user_id   INT UNSIGNED NOT NULL,
    rsvp      ENUM('pending','accepted','declined','tentative') NOT NULL DEFAULT 'pending',
    PRIMARY KEY (event_id, user_id),
    KEY idx_user_events (user_id, event_id),
    CONSTRAINT fk_ea_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_ea_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE
);
```

## Querying Events in a Date Range

```sql
SELECT e.title, e.start_at, e.end_at, c.name AS calendar
FROM   events e
JOIN   calendars c ON c.id = e.calendar_id
WHERE  c.owner_id = 1
  AND  e.start_at >= '2026-04-01'
  AND  e.start_at <  '2026-05-01'
ORDER BY e.start_at;
```

## Upcoming Events for a User (Including Shared)

```sql
SELECT e.title, e.start_at, ea.rsvp
FROM   events e
JOIN   event_attendees ea ON ea.event_id = e.id
WHERE  ea.user_id = 1
  AND  e.start_at >= NOW()
  AND  ea.rsvp != 'declined'
ORDER BY e.start_at
LIMIT 20;
```

## Summary

Store all event timestamps as UTC in `DATETIME` columns and handle time zone conversion in the application. Index `(calendar_id, start_at)` for range queries. Use a separate `recurrence_rules` table to store iCalendar-compatible RRULE data. Track exception events with an `is_exception` flag and a `recurrence_id` pointing back to the master recurring event.
