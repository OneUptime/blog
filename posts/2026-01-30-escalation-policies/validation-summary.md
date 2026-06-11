# Validation Summary: How to Build Escalation Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- YAML
- Mermaid flowcharts
- Incident management escalation policies
- On-call scheduling concepts

## Sources Consulted
- Python `asyncio` documentation: https://docs.python.org/3/library/asyncio.html
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `enum` documentation: https://docs.python.org/3/library/enum.html
- Python 3.12 deprecations for `datetime.utcnow()`: https://docs.python.org/3/whatsnew/3.12.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html
- PagerDuty escalation policy documentation: https://support.pagerduty.com/main/docs/escalation-policies
- PagerDuty incident escalation behavior documentation: https://support.pagerduty.com/main/docs/incidents

## Issues Found
- The time-based escalation Python example notified L1 immediately, then waited and notified L1 again instead of escalating to L2. Updated the loop to wait for the current level's timeout and notify the next escalation rule.
- The same time-based escalation example imported `timedelta` without using it. Removed the unused import while fixing the loop.
- The multi-team escalation example listed `Team.NETWORK` as a supporting team for `api-gateway` but did not define a network team policy, which caused `route_incident("api-gateway")` to raise `KeyError`. Added a `Team.NETWORK` policy.
- The override example used `datetime.utcnow()`, which is deprecated as of Python 3.12. Updated it to use `datetime.now(timezone.utc)` and changed the `timestamp` annotation to `Optional[datetime]`.

## Review Notes
The YAML examples are illustrative, not vendor-specific schemas. They parse as valid YAML, but teams adopting them would need to map the fields to their incident-management tool's API or configuration model.
