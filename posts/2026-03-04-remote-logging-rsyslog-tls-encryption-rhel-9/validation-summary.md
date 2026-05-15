# Validation Summary: How to Set Up Remote Logging with rsyslog and TLS Encryption on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsyslog
- TLS-encrypted syslog forwarding
- systemd-journald
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Configuring a remote logging solution": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Local `rsyslogd(8)` man page, especially `rsyslogd -N 1` configuration validation behavior.
- Local `journalctl --help`, confirming `--since` usage.

## Issues Found
- The post claimed to set up TLS-encrypted remote logging but did not install a TLS stream-driver package or provide any TLS configuration. I changed the package command to install `rsyslog-openssl` and `gnutls-utils`, then added minimal server and client rsyslog TLS configuration using Red Hat's documented `ossl` stream driver pattern.
- The post said to edit rsyslog and journald files generically, but TLS forwarding is configured in rsyslog, not journald. I kept the existing file list but added the needed `/etc/rsyslog.d/securelogser.conf` and `/etc/rsyslog.d/securelogcli.conf` examples.
- The restart step did not validate rsyslog syntax before restart and suggested restarting `systemd-journald` for the TLS forwarding change. I added `sudo rsyslogd -N 1` and kept the restart focused on `rsyslog`.
- The verification step checked only local logs. I added `logger test` so the client can generate a test syslog message before checking server-side logs.

## Review Notes
- The article remains a concise setup guide and assumes certificates already exist. A future improvement would be to add a certificate-generation and certificate-distribution walkthrough, but that would be beyond the minimal technical correction requested here.
