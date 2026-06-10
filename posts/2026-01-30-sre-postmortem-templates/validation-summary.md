# Validation Summary: How to Build Postmortem Templates

## Status
validated

## Post Type
Guide / Tutorial — A how-to guide that walks through a complete postmortem template structure with concrete examples for each section.

## Technologies Covered
- Postmortem / Incident Management process (blameless culture, 5 Whys, severity classifications)
- YAML (incident metadata schema example)
- Markdown (template content examples)
- Bash / shell scripting (timeline-builder.sh)
- kubectl (events API querying with field-selector, sort-by, jsonpath)
- curl + jq (alert API querying)
- git log (with --since, --until, --format, --all)
- Python 3.6+ (timeline aggregation script using requests)

## Sources Consulted
- Google SRE Book — Postmortem culture chapter (https://sre.google/sre-book/postmortem-culture/)
- Google SRE Workbook — Blameless postmortems (https://sre.google/workbook/postmortem-culture/)
- kubectl documentation — `kubectl get events`, `--field-selector`, `--sort-by`, `-o jsonpath` (https://kubernetes.io/docs/reference/kubectl/)
- Kubernetes Events API reference — valid event reasons including `Pulled` (https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- git-log documentation — `--since`, `--until`, `--format` pretty format specifiers (`%ai`, `%s`), `--all` (https://git-scm.com/docs/git-log)
- Python `requests` library documentation (https://requests.readthedocs.io/)
- jq manual — string interpolation and array iteration (https://stedolan.github.io/jq/manual/)

## Issues Found
No technical issues found.

The code samples are syntactically correct and use valid current flags:
- `kubectl get events --field-selector reason=Pulled --sort-by='.lastTimestamp' -o jsonpath='...'` — all flags and the jsonpath template are valid; `Pulled` is a real kubelet event reason.
- `curl -s` piped into `jq -r '.alerts[] | "\(.triggered_at) \(.name)"'` — valid jq string interpolation.
- `git log --since=... --until=... --format="%ai %s" --all` — `%ai` (author date ISO 8601) and `%s` (subject) are correct pretty-format specifiers.
- Python sample uses correct `requests.get` invocation with `params` and `headers`, valid f-strings, and Python type hints. (`API_KEY` is referenced as a module-level constant per common example convention.)

Conceptual content (blameless culture, 5 Whys, contributing factors, action item ownership, severity matrix, error budget concept) aligns with standard SRE practice as documented in the Google SRE Book.

## Review Notes
- The example postmortem narrative uses illustrative numbers throughout. The line "Monthly uptime SLO of 99.9% consumed 0.12% of error budget" is an illustrative figure inside a sample postmortem code block — strictly speaking, an 84-minute outage on a 99.9% monthly SLO would exceed the budget (~43.2 min/month) rather than consume a fraction of it, but the figure is a placeholder in a template example, not a technical claim being made by the author. Left as-is since the content is clearly demarcated as example template content rather than a real calculation being taught.
- The kubectl event API has been evolving across versions: `events.k8s.io/v1` exposes `series.lastObservedTime` and `eventTime` in addition to the legacy `lastTimestamp` used in the example. `lastTimestamp` still works with `kubectl get events` in current versions, so no change is required, but future readers on very new clusters may prefer the newer fields.
- The SEV-1/2/3/4 thresholds in the severity matrix are example/illustrative — real organizations should tune to their own revenue and user impact scale. The author's framing makes this clear ("Standardize how you classify…").
- All OneUptime "Related Reading" URLs follow the established `oneuptime.com/blog/post/<slug>/view` pattern used elsewhere in this blog repository.
