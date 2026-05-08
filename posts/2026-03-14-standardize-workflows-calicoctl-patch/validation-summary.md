# Validation Summary: How to Standardize Team Workflows Around calicoctl patch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- GitHub Actions
- Bash
- Python and PyYAML
- YAML and JSON patch payloads

## Sources Consulted
- Calico Open Source documentation: calicoctl patch command, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source documentation: calicoctl get command, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: configure calicoctl for the Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico Open Source documentation: WireGuard examples using calicoctl patch, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- GitHub Actions documentation: workflow syntax, https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The patch request template described the payload as "JSON merge patch format", but Calico's calicoctl patch reference documents strategic merge as the default patch type. Updated the wording to "JSON-formatted strategic merge patch" to match the command shown.
- The wrapper script used Python's yaml module without listing PyYAML as a prerequisite or installing it in CI. Added PyYAML to prerequisites and added a GitHub Actions dependency installation step.
- The rollback command used `ls | head` under `set -euo pipefail`, which could exit before reaching the intended "No backup found" check when no backup exists. Replaced it with a `find | sort | head | cut || true` pipeline so the empty-backup case is handled explicitly.
- The history command could fail on a fresh installation because the log file was not created before `tail`. Added `touch "$LOG_FILE"` after creating the backup directory.
- The repository layout example was fenced as `bash` even though it is not a runnable shell snippet. Changed the fence to `text`.

## Review Notes
- The examples assume the wrapper has permission to write under `/var/backups` and `/var/log`; teams may need to run it with appropriate privileges or adjust those paths in their environment.
- The GitHub workflow validates patch request structure and JSON serialization only; it does not perform a dry-run against a Calico API server.
