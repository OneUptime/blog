# Validation Summary: How to Deploy OSSEC Host-Based Intrusion Detection on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OSSEC HIDS
- Red Hat Enterprise Linux 9
- Linux service management
- Linux log inspection

## Sources Consulted
- OSSEC 4.0.0 documentation: Manager/Agent Installation, https://www.ossec.net/docs/docs/manual/installation/install-source.html
- OSSEC 4.0.0 documentation: Installation requirements for RedHat / Centos / Fedora / Amazon Linux, https://www.ossec.net/docs/docs/manual/installation/installation-requirements.html
- OSSEC documentation: ossec-control command reference, https://ossec-docs.readthedocs.io/en/latest/docs/programs/ossec-control.html
- OSSEC 4.0.0 documentation: OSSEC FAQ log locations, https://www.ossec.net/docs/docs/faq/ossec.html
- OSSEC 4.0.0 documentation: Supported systems, https://www.ossec.net/docs/docs/manual/supported-systems.html
- Red Hat Enterprise Linux 9 documentation: Managing system services and logs with systemctl and journalctl, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index

## Issues Found
- The post used placeholder configuration paths such as `/etc/<service>/config.conf`. Updated this to OSSEC's default Linux configuration file, `/var/ossec/etc/ossec.conf`.
- The post used placeholder systemd commands such as `systemctl restart <service-name>` and `systemctl status <service-name>`. Updated these to OSSEC's documented control script commands under `/var/ossec/bin/ossec-control`.
- The verification and troubleshooting sections used `journalctl -u <service-name>`, which is not the documented OSSEC log location for a source-style OSSEC installation. Updated log checks to use `/var/ossec/logs/ossec.log`.
- The package verification command used `rpm -qa | grep <package-name>`. Updated it to check the RHEL-family OSSEC build prerequisites listed in the official OSSEC installation requirements.
- The configuration description referred to generic service settings. Updated it to OSSEC-specific configuration areas such as monitored log files, file integrity monitoring paths, alerting options, and remote manager settings.

## Review Notes
The post is still high level and does not include a full OSSEC installation step, even though the title says "deploy." The remaining content is technically plausible after replacing the invalid placeholders, but a future revision should add the official OSSEC download, dependency installation, and `install.sh` flow for a complete RHEL 9 deployment guide.
