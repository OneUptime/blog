# Validation Summary: How to Implement On-Call Rotations

## Status
validated

## Post Type
Implementation Guide / Tutorial

## Technologies Covered
- Python (dataclasses, asyncio, enum, typing)
- Slack Bolt SDK for Python (slack_bolt) with Socket Mode
- Google Calendar API (google-api-python-client, google-auth)
- YAML (policy/configuration files)
- Mermaid (flowchart and gantt diagrams)

## Sources Consulted
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python enum documentation: https://docs.python.org/3/library/enum.html
- Python asyncio documentation: https://docs.python.org/3/library/asyncio.html
- Python typing PEP 585 (built-in generics like `tuple[bool, List[str]]`, Python 3.9+): https://peps.python.org/pep-0585/
- Slack Bolt for Python documentation: https://slack.dev/bolt-python/concepts
- Slack Bolt Socket Mode handler: https://slack.dev/bolt-python/concepts/socket-mode
- Slack Block Kit reference: https://api.slack.com/reference/block-kit/blocks
- Google Calendar API v3 reference (events.insert / list / delete): https://developers.google.com/calendar/api/v3/reference/events
- Google Calendar API extendedProperties / privateExtendedProperty filter: https://developers.google.com/calendar/api/v3/reference/events/list
- Mermaid flowchart and gantt syntax: https://mermaid.js.org/syntax/flowchart.html and https://mermaid.js.org/syntax/gantt.html

## Issues Found
- **Incorrect output comment in `calculate_minimum_team_size` example**: The example invocation used `coverage_hours_per_week=168`, `max_oncall_hours_per_engineer_per_month=40`, and `include_backup=True`. The trailing comment claimed `# Output: Recommended team size: 20 engineers`, but the actual computation yields `int(168 * 4.33 * 2 / 40) + 2 = 38`. (The value 20 corresponds to the `include_backup=False` case.) Updated the comment to `# Output: Recommended team size: 38 engineers` so the documented output matches the function's actual behavior.

## Review Notes
- The override demonstration (`add_override(original="Alice", replacement="Bob", start=Feb 9, end=Feb 16)`) happens to overlap with Bob's natural rotation week (Feb 9-15) given the example schedule, so the printed result "On call Feb 10: Bob" is consistent both with and without the override applied. The output is not incorrect, but the example doesn't strongly demonstrate the override taking precedence over the base rotation. Left as-is since it's an illustrative choice, not a technical error.
- `add_override` validates the replacement against `self.schedule.engineers`, but the Slack `handle_swap_approval` handler passes raw Slack user IDs (e.g. `U12345`) as the replacement. In a real deployment this validation would always fail; the comment in the source acknowledges that "in production, use proper dependency injection," and the code is presented as a foundation rather than a drop-in implementation, so this is acceptable.
- `is_ready_to_complete(self) -> tuple[bool, List[str]]` uses PEP 585 built-in generics (`tuple[...]`), which require Python 3.9+. Modern Python should be fine, but noting for readers on older interpreters.
- `CalendarSync._clear_oncall_events` appends a literal `'Z'` to `start.isoformat()`. This is only correct for naive datetimes that represent UTC; for timezone-aware datetimes (as Google Calendar events typically carry) the isoformat already contains an offset and appending `Z` would be invalid. Not changed because the surrounding code uses naive UTC datetimes consistently, but worth a future tightening.
- The Slack Bolt, Google Calendar API v3, and Mermaid syntax used are all current and match official documentation.
