# Validation Summary: How to Set Up AWX Schedules for Recurring Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- Ansible Automation Platform Controller scheduling concepts
- AWX REST API
- iCalendar RRULE syntax
- curl
- JSON

## Sources Consulted
- AWX schedules user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/scheduling.html
- awx.awx.schedule module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/schedule_module.html
- AWX upstream schedule API RRULE detail: https://github.com/ansible/awx/blob/devel/awx/api/templates/api/_schedule_detail.md
- AWX upstream schedule serializer validation: https://github.com/ansible/awx/blob/devel/awx/api/serializers.py
- AWX upstream schedule model and timezone handling: https://github.com/ansible/awx/blob/devel/awx/main/models/schedules.py

## Issues Found
- Several RRULE examples omitted `INTERVAL`, but current AWX schedule validation requires `INTERVAL` in RRULE entries. Added `INTERVAL=1` to the affected weekly, monthly, daily-with-UNTIL, yearly, and practical pattern examples.
- The monthly example used numeric `BYDAY` values such as `1MO`, `2MO`, and `-1FR`. AWX rejects `BYDAY` with a numeric prefix, so the example and explanation were changed to use `BYSETPOS` with `BYDAY`.
- The opening RRULE example omitted `INTERVAL`. Added `INTERVAL=1` so it matches AWX validation requirements.
- The timezone section described February 21st as daylight saving time and said the UTC value shifts when daylight saving ends. Corrected the example to state that February 21st 2026 is UTC-5 for US Eastern and that 3 AM Eastern shifts to `T070000Z` during daylight saving time.
- The monitoring command comment said it fetched the next 5 scheduled runs, but the command reads only the schedule detail `next_run` field. Updated the comment to say it fetches the next scheduled run.

## Review Notes
The API endpoint patterns, `extra_data` usage, `enabled` updates, schedule deletion, `next_run`, timezone-aware `DTSTART`, and `launch_type=scheduled` filtering are consistent with AWX/API behavior. AWX can also preview schedule occurrences through its schedule preview API, but adding that was outside the scope of correcting technical errors.
