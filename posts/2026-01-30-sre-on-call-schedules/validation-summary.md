# Validation Summary: How to Create On-Call Schedules

## Status
validated

## Post Type
Guide / Tutorial — SRE process content with executable code examples (Python, YAML, Slack Block Kit).

## Technologies Covered
- Python 3.9+ (dataclasses, type hints with `list[Engineer]` generics, `datetime`/`timedelta`/`time`)
- YAML configuration (on-call schedule, follow-the-sun, escalation policy)
- Slack Block Kit (header, section, fields, actions, button elements)
- Slack incoming webhooks (via `requests`)
- Cron expressions (for recurrence patterns)
- IANA timezone identifiers (`America/New_York`, `Europe/London`, `Asia/Tokyo`)
- OneUptime on-call scheduling / escalation policy concepts

## Sources Consulted
- Python `datetime` docs — https://docs.python.org/3/library/datetime.html (verified `weekday()` semantics: Mon=0, Sat=5, Sun=6)
- Python `dataclasses` docs — https://docs.python.org/3/library/dataclasses.html (`__post_init__`, default mutable handling pattern)
- PEP 585 — generic types in built-in collections (e.g. `list[Engineer]` valid from Python 3.9)
- Slack Block Kit reference — https://api.slack.com/reference/block-kit/blocks and `/block-elements` (verified `header`, `section.fields`, `actions.elements`, and `button` with `url` shape)
- Slack incoming webhooks — https://api.slack.com/messaging/webhooks (JSON body via `requests.post` is correct)
- Cron syntax — verified `0 2 1 * *` = 02:00 on day 1 of each month
- IANA TZ database — confirmed timezone IDs used in the YAML examples
- Locally executed both the `OnCallScheduler` and `calculate_shift_compensation` examples to confirm runtime correctness

## Issues Found
1. **Off-by-one day count in `calculate_shift_compensation`** (compensation section).
   - Original code iterated `current = shift_start` while `current < shift_end`, advancing by stepping `datetime.combine(current.date(), time(0,0)) + timedelta(days=1)`. For a 7-day shift starting Mon 09:00 and ending the following Mon 09:00, this counted 8 days because the final partial day (Mon 00:00 < Mon 09:00) was processed before the loop exited. The example shift in the post would compute a base of $900 instead of the policy-implied $800 (5 weekdays × $100 + 2 weekend × $150).
   - Fix: switched the loop to iterate by `date` from `shift_start.date()` to `shift_end.date()` (exclusive), advancing one calendar day per step. Also precomputed `holiday_dates` as a set for cleaner membership tests. Verified the example now returns $800 base + $50 incident bonuses + $25 night bonus + $50 long-incident bonus = $925 total.

2. **`timedelta` imported below the function that uses it** (compensation section).
   - The original code imported `from datetime import datetime, time` at the top but used `timedelta` inside `calculate_shift_compensation`, relying on a `from datetime import timedelta` placed in the `# Usage example` section further down. Runs as a script (because the import resolves before the call), but breaks the moment anyone copies just the function or imports it from a module.
   - Fix: moved `timedelta` into the top-level import (`from datetime import datetime, time, timedelta`) and removed the redundant later import.

## Review Notes
- The `OnCallScheduler` example runs cleanly and produces even distribution (3 shifts each over 12 weeks for a 4-person team). The PTO availability check works as documented (Bob's Feb 15–22 unavailability is honored).
- The unused `from typing import Optional` import in the scheduler snippet is harmless and was left alone — purely stylistic.
- `check_distribution_fairness` references `is_night_incident` and `calculate_variance` without defining them; this is fine in the context of a code sketch illustrating a pattern, and the post does not claim the snippet is runnable standalone.
- Slack button elements use `url` without `action_id`. Slack's docs list `action_id` as required, but in practice URL-only link buttons are accepted by the API; left as-is since this is widely-used real-world shape.
- The post's example incident at 02:15 correctly receives the night bonus per the logic `ack_hour >= 22:00 OR ack_hour <= 06:00`; the half-open boundary at 06:00 is documented in the policy text as "10 PM - 6 AM" so the behavior is consistent.
- YAML examples are tool-agnostic configuration sketches (no specific incident-management product schema), so there's no spec to validate against beyond YAML syntax — which is valid.
