# Validation Summary: How to Use Ansible to Configure ClamAV Antivirus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ClamAV
- freshclam
- clamd
- clamdscan
- clamonacc
- Linux systemd services
- cron

## Sources Consulted
- ClamAV documentation: third-party package names and distro packaging caveats, https://docs.clamav.net/manual/Installing/Packages.html
- ClamAV documentation: clamd and freshclam configuration overview, https://docs.clamav.net/manual/Usage/Configuration.html
- ClamAV documentation: on-access scanning and clamonacc usage, https://docs.clamav.net/manual/OnAccess.html
- Debian manpage for clamd.conf options, https://manpages.debian.org/experimental/clamav-daemon/clamd.conf.5.en.html
- Debian manpage for freshclam.conf options, https://manpages.debian.org/experimental/clamav-freshclam/freshclam.conf.5.en.html
- Debian manpage for clamdscan options and return codes, https://manpages.debian.org/unstable/clamdscan/clamdscan.1.en.html
- Debian manpage for clamscan options, https://manpages.debian.org/unstable/clamav/clamscan.1.en.html
- Ansible apt module documentation, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible yum module documentation, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible service module documentation, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible cron module documentation, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible service_facts module documentation, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- PCI Security Standards Council SAQ D for Service Providers, Requirement 5.2.1, https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf

## Issues Found
- The PCI DSS statement was too broad because PCI DSS scopes anti-malware to in-scope systems commonly affected by malware, with evaluation-based exceptions. Updated the wording to avoid implying blanket antivirus requirements on every system.
- The install section mixed Debian/Ubuntu and RHEL/EPEL packages, but later examples used Debian/Ubuntu-specific paths and service names. Added an explicit caveat that the remaining examples use Debian/Ubuntu defaults and need path/unit variables for RHEL, Fedora, and EPEL-based systems.
- The scheduled scan script used `clamscan` even though the article later advises using `clamdscan` on busy servers. Updated the script to use `clamdscan --fdpass --multiscan`, relying on the running daemon and the clamd configuration limits.
- The alert email command combined a pipe with `< "$SCAN_LOG"`, so the one-line alert text would not be sent to `mail`. Replaced it with a grouped command that sends both the alert line and the scan log.
- The on-access example used `OnAccessMountPath` for ordinary upload/shared directories. ClamAV documents `OnAccessIncludePath` for watching specific directories, so the example now uses `OnAccessIncludePath`.

## Review Notes
- The playbooks remain example-quality and still require environment-specific package repositories, service names, config paths, and mail transport setup.
- `clamdscan --fdpass` requires a local Unix socket and suitable permissions; use `--stream` or adjust clamd permissions if file descriptor passing is not appropriate for the target hosts.
