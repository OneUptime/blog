# Validation Summary: How to Create Post-Mortem Reports for Ceph Incidents

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (health states, OSD management, PG recovery, BlueStore)
- Rook (referenced in tags)
- Linux system tools (grep, journalctl)

## Sources Consulted
- Ceph official documentation on health checks and cluster states (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph documentation on OSD management (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- journalctl man page for --since, --until, and -u flag syntax
- grep man page for -E (extended regex) flag

## Issues Found
- **Incorrect code fence label on Corrective Actions block**: The corrective actions example was wrapped in a ` ```json ` code fence, but the content is not valid JSON — it uses a custom plain-text format with `[DONE]` and `[TODO]` prefixes. Changed the fence label from `json` to `text` to accurately reflect the content format and avoid confusion.

## Review Notes
- The post lists six sections for a post-mortem (Incident Summary, Timeline, Root Cause, Impact, Corrective Actions, Lessons Learned) but only demonstrates four of them in the body. The "Impact" and "Lessons Learned" sections are not shown as examples. This is a content gap rather than a technical error.
- The heading "Root Cause Analysis" in the body doesn't exactly match "Root Cause" in the numbered list — minor naming inconsistency.
- The log path `/var/log/ceph/ceph.log` is correct for traditional (non-containerized) Ceph deployments. In Rook/Kubernetes environments, logs are typically accessed via `kubectl logs` rather than filesystem paths. Since the post is tagged with Rook, a note about containerized log access could be useful in a future revision.
- The `ceph-osd@*` systemd unit pattern in the journalctl command is correct for bare-metal Ceph deployments but would not apply in Rook-managed containerized environments.
