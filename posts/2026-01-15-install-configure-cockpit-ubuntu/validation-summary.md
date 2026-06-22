# Validation Summary: How to Install and Configure Cockpit for Ubuntu Server Management

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Cockpit (web-based server management)
- Ubuntu Server (20.04 / 22.04 / 24.04)
- systemd / systemd sockets (cockpit.service, cockpit.socket)
- UFW and iptables (firewall configuration)
- PAM (`/etc/pam.d/cockpit`, `pam_succeed_if`)
- OpenSSH (`sshd_config`)
- Let's Encrypt / TLS certificates
- Cockpit add-on modules (packagekit, podman, machines, storaged, networkmanager, sosreport, pcp, file-sharing)
- Performance Co-Pilot (PCP)

## Sources Consulted
- Cockpit `cockpit.conf` manual — https://cockpit-project.org/guide/latest/cockpit.conf.5.html
- Cockpit SSL/TLS usage guide — https://cockpit-project.org/guide/latest/https
- Cockpit cockpit-tls(8) man page — https://manpages.debian.org/unstable/cockpit-ws/cockpit-tls.8.en.html
- Cockpit discussion: dashboard/multi-host removal — https://github.com/cockpit-project/cockpit/discussions/22225 and issue #15122
- 45Drives cockpit-file-sharing repository — https://github.com/45Drives/cockpit-file-sharing and https://knowledgebase.45drives.com/kb/kb451400-using-45drives-repositories/

## Issues Found
1. **Invalid `IdleTimeout` key under `[WebService]`** — The example `cockpit.conf` placed `IdleTimeout = 15` under `[WebService]`. Per the official `cockpit.conf(5)` manual, `IdleTimeout` is only valid under `[Session]` (it is not a recognized `[WebService]` key). Removed the duplicate/invalid `[WebService]` entry and kept it under `[Session]`.
2. **Non-existent `cockpit-dashboard` package** — The post instructed `sudo apt install cockpit-dashboard -y`. The dashboard (multi-machine timeline) was removed in Cockpit 234 and there is no such package in current Ubuntu repositories; that command would fail. Replaced with an explanation that multi-host connection is now built into cockpit-ws via the "Add new host" workflow.
3. **`cockpit-file-sharing` not in Ubuntu repositories** — `sudo apt install cockpit-file-sharing -y` fails on a stock Ubuntu system because the module is a third-party 45Drives package. Added the required `curl -sSL https://repo.45drives.com/setup | sudo bash` repository setup step before the install.
4. **Wrong `cockpit-certificate-ensure` path and flag** — The troubleshooting section used `/usr/share/cockpit/ws/cockpit-certificate-ensure --for-host=$(hostname)`. On Debian/Ubuntu the helper is at `/usr/lib/cockpit/cockpit-certificate-ensure`, and `--for-host` is not a documented flag (only `--check` is). Corrected the path and replaced the invalid flag with `--check`.

## Review Notes
- The combined certificate approach (`cat fullchain.pem privkey.pem > server.cert`) is valid — Cockpit accepts a single `.cert` file containing the certificate chain followed by an unencrypted private key block, in addition to the separate `.cert`/`.key` file pair. Left as-is.
- `Fatal = criticals warnings` under `[Log]` is correct; `criticals` and `warnings` are the documented values.
- The post starts/enables `cockpit.service` directly; because Cockpit is socket-activated, `systemctl enable --now cockpit.socket` is the more idiomatic choice. Both work due to the service/socket aliasing, so this was left unchanged.
- The "Add new host" multi-host switcher was deprecated in Cockpit 322; it still functions in the Cockpit versions shipped with Ubuntu 20.04/22.04/24.04, so the manual steps remain accurate for the versions in scope.
- Symlinking Let's Encrypt certs over `0-self-signed.cert`/`.key` works, but note Cockpit selects the alphabetically last `.cert`/`.crt` file — fine on a default install where it is the only certificate.
