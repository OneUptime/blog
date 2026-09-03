# Validation Summary: How to Export kube-hunter JSON Results and Fail CI Only on Actionable Findings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- kube-hunter
- Kubernetes security scanning
- Docker
- jq and JSON validation
- Shell scripting
- CI/CD security policy gates

## Sources Consulted
- [kube-hunter reporting, dispatch, scanning, active hunting, and test-list documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter command-line argument definitions](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter JSON reporter](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/json.py)
- [kube-hunter base report schema](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter vulnerability severity mapping](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/types.py)
- [kube-hunter event worker exception handling](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/event_handler.py)
- [kube-hunter port discovery and attempt logging](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kube-hunter logging configuration](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/logging.py)
- [jq manual: `--exit-status` and `halt_error`](https://jqlang.org/manual/)

## Issues Found
- The schema check accepted any string as a severity. An allowlisted VID with a new or malformed severity could therefore pass validation and then be excluded by the policy filter. The check now enforces kube-hunter's current `low`, `medium`, and `high` values.
- The policy filter included a `critical` branch even though kube-hunter's current severity mapping does not emit that value and the corrected pinned-schema check rejects it. The unreachable branch was removed.
- The schema check did not type-check several fields emitted by the pinned reporter, including `vulnerability`, even though the policy formats that field. The check now validates every vulnerability field in the current base reporter.
- The policy example allowed jq parse, input, or runtime failures to escape with jq-specific statuses rather than the documented CI infrastructure status `2`. The example now captures jq's status, preserves `1` for actionable findings, and maps every other nonzero status to `2`.
- The fixture guidance grouped unknown severities with harmless extra fields even though they require different expected outcomes. It now states that unknown severity must fail validation while an extra field remains accepted.

## Review Notes
- The post intentionally relies on implementation details from kube-hunter's current `main` source, including its report fields, fixed port list, debug marker, and worker exception handling. Its advice to pin a digest and re-review these details during upgrades is therefore important.
- The sample image digest remains an explicit placeholder and must be replaced by the release process before execution, as the post states.
