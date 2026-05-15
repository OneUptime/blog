# Validation Summary: How to Install ProFTPD on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL
- ProFTPD
- FTP and explicit FTPS
- firewalld
- SELinux
- systemd
- curl and lftp

## Sources Consulted
- ProFTPD official directive reference: https://www.proftpd.org/docs/directives/configuration_full.html
- ProFTPD official module documentation: https://www.proftpd.org/docs/modules/mod_core.html
- ProFTPD official logging documentation: https://www.proftpd.org/docs/howto/Logging.html
- Fedora/EPEL ProFTPD package metadata: https://packages.fedoraproject.org/pkgs/proftpd/proftpd/
- Fedora/EPEL ProFTPD packaging and default configuration: https://src.fedoraproject.org/rpms/proftpd
- Red Hat EPEL setup guidance for RHEL: https://www.redhat.com/en/blog/install-epel-linux
- Red Hat SELinux FTP boolean documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-file_transfer_protocol-booleans
- curl official manpage: https://curl.se/docs/manpage.html

## Issues Found
- The EPEL installation command used `dnf install epel-release`, which is common on RHEL-compatible derivatives but is not the RHEL setup flow documented by Red Hat. Updated it to enable CodeReady Builder and install the EPEL release RPM from Fedora.
- The ProFTPD configuration omitted `User` and `Group`, while ProFTPD's RHEL/Fedora default configuration sets these to `nobody`. Added both directives.
- `DenyGroup root wheel` uses ProFTPD's default AND semantics, so it only matches users in both groups. Updated it to `DenyGroup OR root,wheel`.
- The `AllowOverwrite on` directive contradicted its comment. Updated the comment to match the directive.
- The log directory was changed to `proftpd:proftpd`, but the Fedora/EPEL package owns `/var/log/proftpd` as `root:root` with restrictive permissions, and ProFTPD warns against non-root-writable log directories. Updated the commands to use `root:root` and mode `750`.
- `ftp_home_dir` is not available on current RHEL SELinux policy, and passive FTP ports may require the `ftpd_use_passive_mode` boolean. Replaced `ftp_home_dir` with `ftpd_use_passive_mode` while keeping `ftpd_full_access`.
- The TLS cipher suite bypassed RHEL system crypto policy. Updated it to `PROFILE=SYSTEM`, matching Fedora/EPEL ProFTPD TLS configuration.
- The curl example used the old `--ftp-ssl` option name, which curl documents as an alias that might be removed. Updated it to `--ssl-reqd`.

## Review Notes
The guide now validates as technically accurate for a RHEL system using EPEL-packaged ProFTPD. In production, `ftpd_full_access` is broad; a more restrictive SELinux labeling approach would be preferable when the deployment requirements are known.
