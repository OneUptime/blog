# Validation Summary: How to Install and Configure the Splunk Universal Forwarder on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- Splunk Universal Forwarder
- Splunk CLI
- systemd

## Sources Consulted
- Splunk Docs: Install a *nix universal forwarder: https://help.splunk.com/en/splunk-enterprise/forward-and-process-data/universal-forwarder-manual/10.2/install-the-universal-forwarder/install-a-nix-universal-forwarder
- Splunk Docs: Configure the universal forwarder using configuration files and CLI examples: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/10.0/configure-the-universal-forwarder/configure-the-universal-forwarder-using-configuration-files
- Splunk Docs: Start or stop the universal forwarder: https://help.splunk.com/en/data-management/get-data-in/forward-data-with-universal-forwarders/9.3/configure-the-universal-forwarder/start-or-stop-the-universal-forwarder
- Splunk Docs: Manage a Linux least-privileged user: https://help.splunk.com/data-management/get-data-in/forward-data-with-universal-forwarders/9.3/working-with-the-universal-forwarder/manage-a-linux-least-privileged-user
- Red Hat Docs: Installing RHEL 9 content with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The original installation command used the placeholder `sudo dnf install -y <package-name>`, which did not identify the Splunk Universal Forwarder package. Changed it to install a downloaded `splunkforwarder-<version>-<build>.x86_64.rpm` file with `dnf`, matching Red Hat's documented local RPM installation pattern.
- The original configuration path `/etc/<service>/config.conf` was not a Splunk Universal Forwarder configuration path. Replaced it with Splunk CLI configuration commands from `/opt/splunkforwarder/bin`.
- The original service commands used `<service-name>` placeholders and did not match Splunk's documented forwarder management workflow. Replaced them with `splunk start`, `splunk restart`, `splunk status`, and `splunk enable boot-start` commands.
- The original post did not configure a forwarding destination or input, so it did not actually complete a Universal Forwarder setup. Added `add forward-server` and `add monitor /var/log` commands using Splunk's documented CLI syntax.
- The original verification and troubleshooting commands referenced a placeholder systemd unit and package name. Replaced them with Splunk forwarder status, forward-server listing, `splunkd.log`, and `rpm -qa | grep splunkforwarder`.

## Review Notes
The post now gives a minimal working setup for an RPM-based Splunk Universal Forwarder installation on RHEL. In a production environment, teams may prefer deployment server apps, Splunk Cloud credential packages, TLS settings, and more targeted input definitions instead of directly monitoring all of `/var/log`.
