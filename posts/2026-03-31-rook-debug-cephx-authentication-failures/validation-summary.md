# Validation Summary: How to Debug CephX Authentication Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- CephX (Ceph authentication protocol)
- Kubernetes (kubectl, Secrets, pod exec)

## Sources Consulted
- [Ceph Health Checks Documentation](https://docs.ceph.com/en/quincy/rados/operations/health-checks/) — verified `mon_clock_drift_allowed` default (0.05s)
- [Ceph Logging and Debugging Documentation](https://docs.ceph.com/en/reef/rados/troubleshooting/log-and-debug/) — verified `debug_auth` subsystem and level range (1–20)
- [Ceph User Management Documentation](https://docs.ceph.com/en/latest/rados/operations/user-management/) — verified `ceph auth` subcommands (`get`, `get-or-create`, `get-key`, `caps`)
- [CephX Developer Documentation](https://docs.ceph.com/en/latest/dev/cephx/) — verified `auth_service_ticket_ttl` and clock skew behavior
- [Rook Issue #4474 — keyring path](https://github.com/rook/rook/issues/4474) — verified Rook tools pod keyring location
- [Red Hat Ceph Storage 6 Troubleshooting Guide](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/troubleshooting_guide/troubleshooting-ceph-monitors) — cross-referenced clock skew impact on CephX

## Issues Found

1. **Step 2 — TTY flag in command substitution**: The `kubectl exec -it` used inside `$()` command substitution included the `-t` flag, which allocates a pseudo-TTY and injects `\r` (carriage return) characters into captured output. This would cause the key comparison to report a mismatch even when the keys are identical. Fixed by removing `-t` from the command substitution line and adding a comment explaining why.

2. **Step 4 — Debug log reset command**: The post used `ceph config set global debug_auth 0` to reset logging. This sets the level to 0 (completely off) rather than restoring the default. The correct way to restore the default is `ceph config rm global debug_auth`. Fixed accordingly.

3. **Step 5 — Clock skew threshold claim**: The post stated "CephX fails if clocks are skewed more than 5 minutes." This is inaccurate — Ceph's default `mon_clock_drift_allowed` is 0.05 seconds, and even small drifts beyond that threshold can cause authentication failures. The "5 minutes" figure is far too generous and could lead users to dismiss clock skew as a cause. Fixed to reference the actual default threshold and describe the sensitivity accurately.

4. **Step 6 — Keyring path for custom client**: The command `ceph --id myapp --keyring /etc/ceph/keyring status` assumed the Rook tools pod keyring contains the `client.myapp` key. In practice, `/etc/ceph/keyring` holds the admin key, not custom client keys. Fixed to first export the client keyring with `ceph auth get client.myapp -o /tmp/myapp.keyring` and then use it for the auth test.

## Review Notes
- The `base64 -d` flag in Step 2 is Linux-specific. On macOS, the equivalent is `base64 -D` or `base64 --decode`. Since the command runs locally (not inside a pod), macOS users may need to adjust. This is a common convention in Kubernetes tutorials and not changed here.
- The error messages table is accurate for common CephX failures, though exact message wording can vary across Ceph versions.
- All `ceph auth` subcommands (`get`, `get-or-create`, `get-key`, `caps`) use correct syntax per current Ceph documentation.
