# Validation Summary: How to Create Alert Suppression Rules

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager silences API
- Alertmanager routing, time intervals, and inhibition rules
- Prometheus alerting rules and PromQL
- Prometheus Pushgateway
- Python `requests` and `datetime`
- Bash, `curl`, and `jq`
- Slack Web API

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager concepts documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Pushgateway README/API documentation: https://github.com/prometheus/pushgateway/blob/master/README.md
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Slack `chat.postMessage` documentation: https://docs.slack.dev/reference/methods/chat.postMessage

## Issues Found
- The Alertmanager route examples used the deprecated `match` field. Updated route examples to use current `matchers` syntax.
- The silence listing examples used `filter=active`, but the Alertmanager v2 `filter` query parameter is for matcher expressions, not silence state. Updated the bash and Python examples to fetch silences and filter by `.status.state`.
- The Python maintenance scheduler claimed Alertmanager cannot update silences directly and recreated silences by deleting and posting a new one. Updated it to POST a payload with the existing silence `id`, matching the Alertmanager v2 API behavior.
- The Python datetime code used `datetime.utcnow()` and a timestamp parser that could fail on fractional seconds or timezone offsets. Updated it to timezone-aware UTC datetimes and ISO parsing.
- The after-hours interval ended at `23:59`, leaving a one-minute gap. Changed it to `24:00`.
- The monitoring rule used `ALERTS{alertstate="suppressed"}`, but Prometheus `ALERTS` uses pending/firing states and does not know Alertmanager silenced/inhibited state. Replaced it with a rule on Alertmanager's `alertmanager_silences{state="active"}` metric and adjusted surrounding text.
- The silence approval example intended to regex-match production clusters but did not mark the protected matcher as regex. Added `isRegex: True`.

## Review Notes
- `amtool`/`promtool` were not available in the local environment, so Alertmanager YAML validation was checked against the official configuration schema rather than a local parser.
- The Slack approval workflow is illustrative and still omits a complete approve/deny callback handler; that is outside the narrow technical corrections needed for this post.
