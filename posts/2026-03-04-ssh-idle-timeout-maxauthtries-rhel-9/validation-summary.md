# Validation Summary: How to Set SSH Idle Timeout and MaxAuthTries on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server (`sshd`)
- SSH client configuration
- SSH hardening and compliance settings

## Sources Consulted
- OpenSSH `sshd_config(5)` manual page: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual page: https://man.openbsd.org/ssh_config
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/index
- Red Hat Customer Portal solution, "SSH server no longer terminate inactive sessions when setting ClientAliveCountMax=0": https://access.redhat.com/solutions/6962538
- DISA STIG Viewer for RHEL 9 ClientAliveInterval and ClientAliveCountMax controls: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-257996 and https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-257995

## Issues Found
- `ClientAliveCountMax 0` was described as disconnecting after one interval. Current OpenSSH/RHEL behavior is that `ClientAliveCountMax 0` disables client-alive connection termination, so the examples were changed to `ClientAliveCountMax 1` where a one-interval disconnect was intended.
- The timeout formula was stated as `ClientAliveInterval * (ClientAliveCountMax + 1)`. OpenSSH documents the effective unresponsive-client timeout as approximately `ClientAliveInterval * ClientAliveCountMax`, so the formula was corrected.
- The post described `ClientAliveInterval` and `ClientAliveCountMax` as a true idle session timeout. These directives detect clients that stop responding to server keepalive requests, not a responsive but idle shell, so the wording was corrected to "client-alive" or "unresponsive" timeout.
- The STIG and PCI DSS examples used `ClientAliveCountMax 0`, which would not enforce client-alive termination on current RHEL 9/OpenSSH. They were changed to `ClientAliveCountMax 1`.
- The idle-timeout test procedure said to open a session and do nothing. A responsive SSH client can still answer client-alive messages, so the test was changed to make the client stop responding, such as by disconnecting it from the network.

## Review Notes
The `MaxAuthTries`, `LoginGraceTime`, `MaxSessions`, `MaxStartups`, `IdentitiesOnly`, and `NumberOfPasswordPrompts` examples were consistent with OpenSSH documentation. For a strict interactive shell idle logout policy on RHEL 9, consider systemd-logind `StopIdleSessionSec` or another session-level control in a future post; this was not added because the review scope was limited to correcting the existing content.
