# Validation Summary: How to Configure Audit Log Rotation and Remote Logging on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit daemon (`auditd`)
- Audit dispatcher plugins (`audisp-syslog`, `audisp-remote`)
- `rsyslog`
- `stunnel`
- Kerberos transport for audit remote logging

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- `auditd.conf(5)` Linux audit man page: https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- `audisp-remote.conf(5)` Linux audit man page: https://www.mankier.com/5/audisp-remote.conf
- `audisp-remote(8)` Linux audit man page: https://www.mankier.com/8/audisp-remote
- `audisp-syslog(8)` Linux audit man page: https://www.mankier.com/8/audisp-syslog
- `auditd-plugins(5)` Linux audit man page: https://www.mankier.com/5/auditd-plugins
- `aureport(8)` Linux audit man page: https://man7.org/linux/man-pages/man8/aureport.8.html
- `ausearch(8)` Linux audit man page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- rsyslog forwarding documentation: https://docs.rsyslog.com/doc/getting_started/forwarding_logs.html
- rsyslog basic structure and action documentation: https://www.rsyslog.com/doc/configuration/basic_structure.html

## Issues Found
- The `max_log_file_action` comment omitted the valid `exec` action and used uppercase examples. I changed the example values to the lowercase forms used by the audit documentation and added `exec` to the valid values list.
- The actions table described `HALT` too broadly for the rotation setting. I clarified that `halt` is applicable to disk-space actions, not `max_log_file_action`.
- The remote rsyslog receiver snippet ended with `EOF` but did not start a heredoc command. I changed it to a complete `sudo tee /etc/rsyslog.d/remote-audit.conf << 'EOF'` example.
- The remote rsyslog receiver used legacy dynamic-file syntax without enabling directory creation. I changed it to a modern `omfile` action with `dynaFile` and `createDirs="on"`.
- The audisp-remote section described the plugin as inherently more secure while the shown configuration used clear-text TCP. I changed the wording to avoid implying encryption where none was configured.
- The transport security section used deprecated `enable_krb5` guidance and labeled it as TLS configuration. I replaced it with the current `transport = KRB5` Kerberos approach and kept TLS as a stunnel wrapping option.
- The stunnel example did not route `audisp-remote` through the local tunnel and omitted the matching server-side tunnel. I added the local `audisp-remote` endpoint settings and a matching server stunnel listener forwarding to the local auditd TCP listener.

## Review Notes
- The guide remains a high-level operational example. Production deployments should also account for firewall rules, SELinux policy, certificate lifecycle, Kerberos keytab setup when using KRB5, and queue sizing based on event volume.
