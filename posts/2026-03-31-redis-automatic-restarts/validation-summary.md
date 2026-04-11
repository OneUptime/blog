# Validation Summary: How to Set Up Redis Automatic Restarts

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Redis
- systemd (service management, restart policies, journald)
- Linux process management (SIGKILL, PID)
- Shell scripting (bash, mail)

## Sources Consulted
- systemd.service(5) man page — `Restart=`, `RestartSec=`, `ExecStartPre=` directives
- systemd.unit(5) man page — `OnFailure=`, `StartLimitIntervalSec=`, `StartLimitBurst=` directives
- Redis documentation — `redis-cli info server`, `--test-memory` flag
- systemd documentation on unit failure states and restart behavior

## Issues Found

### 1. `OnFailure` behavior mischaracterized (Section: "Alerting on Restart Events")
- **What was wrong:** The section title was "Alerting on Restart Events" and the text said "Set up an alert when Redis restarts." The `OnFailure=` directive does NOT fire on every restart attempt — it fires only when the unit enters the "failed" state, which happens after all restart attempts (governed by `StartLimitBurst`/`StartLimitIntervalSec`) have been exhausted. The alert script message and service description also incorrectly referenced "restart" instead of "failure."
- **What was changed:**
  - Section title changed from "Alerting on Restart Events" to "Alerting on Persistent Failures"
  - Description changed to clarify the alert fires "when Redis fails permanently (after all restart attempts are exhausted)"
  - Notification script message updated from "Redis restarted at..." to "Redis failed at...after exhausting all restart attempts"
  - Alert service description changed from "Alert on Redis restart" to "Alert on Redis failure"
  - Summary section updated to match
- **Why:** `OnFailure` triggering only on terminal failure (not on each restart) is a critical distinction for operators who need to understand when they will and won't be alerted.

## Review Notes
- The `--test-memory 0` trick for config validation works because `redis-server` parses the config file before running the memory test. With 0 MB, the memory test is a no-op and the process exits. If the config is invalid, it fails at parse time. This is a known community pattern, though it is not the primary purpose of `--test-memory`.
- The Redis service name varies by distribution (`redis` vs `redis-server`). The post uses `redis` which is common but readers on Debian/Ubuntu may need to substitute `redis-server`.
- `StartLimitIntervalSec` and `StartLimitBurst` are shown in the `[Service]` section. These are historically `[Unit]` directives but are accepted in `[Service]` on systemd v230+. This is fine for modern systems.
- The `Restart=on-failure` description ("restart only on non-zero exit codes or signals") is a simplification — certain signals (SIGHUP, SIGINT, SIGTERM, SIGPIPE) are treated as clean exits by default and do NOT trigger a restart under `on-failure`. This is an acceptable simplification for a tutorial.
