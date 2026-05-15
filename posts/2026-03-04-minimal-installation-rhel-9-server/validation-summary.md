# Validation Summary: How to Perform a Minimal Installation of RHEL for Server Use

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda installer
- DNF and Red Hat Subscription Manager
- systemd-journald
- firewalld
- OpenSSH server
- SELinux
- dnf-automatic
- chrony

## Sources Consulted
- Red Hat Enterprise Linux 9: Interactively installing RHEL from installation media: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/
- Red Hat Enterprise Linux 9: Configuring basic system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/
- Red Hat Enterprise Linux 9: Managing and monitoring security updates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/
- Red Hat Enterprise Linux 9: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/
- Red Hat Enterprise Linux 9: Package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/
- Red Hat Enterprise Linux 9.6 Release Notes, deprecated subscription-manager modules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/deprecated-functionalities
- Subscription Central: Getting Started with RHEL System Registration, Simple Content Access: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/
- systemd-journald.service manual: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html
- journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html

## Issues Found
- The registration section used `subscription-manager attach --auto` as a normal required step. Red Hat documents Simple Content Access as the current default model and lists `attach`/`auto-attach` as deprecated, so I removed the command and added a short note that registration is enough under Simple Content Access.
- The SSH hardening snippet claimed key-only authentication but only set `PasswordAuthentication no`. Red Hat's OpenSSH guidance also sets `KbdInteractiveAuthentication no`, so I added that directive.
- The SSH service command restarted `sshd`. Red Hat's guidance reloads the daemon for this configuration change, so I changed it to `systemctl reload sshd`.
- The installer wording said direct root SSH login is disabled by default if a regular user is created. Red Hat's installer documentation specifically says password-based root SSH access is disabled by default unless allowed, so I corrected the wording.
- The package list included `htop`, which is not listed in the official RHEL 9 package manifest for stock RHEL repositories. I removed it from the default package install command.

## Review Notes
The remaining commands and configuration snippets are consistent with current RHEL 9 documentation. Disk sizing, static IP usage, and the final package-count/service-count claims are reasonable operational baselines but can vary by installation source, architecture, selected add-ons, and later RHEL minor releases.
