# Validation Summary: How to Run a Node.js Application as a systemd Service on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- systemd service units
- Node.js
- npm
- DNF modular Application Streams
- firewalld
- journald

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 8 documentation, "Using systemd unit files to customize and optimize your system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/254/systemd.exec.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/254/systemctl.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 10 documentation, "Considerations in adopting RHEL 10": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/considerations_in_adopting_rhel_10/index

## Issues Found
- The original post was a generic placeholder and did not actually show how to run a Node.js application as a systemd service. Replaced placeholder package, service, and config commands with concrete RHEL 8/9 Node.js and systemd commands.
- The original dependency step installed `epel-release` and "Development Tools", which are not required for the described systemd service setup and are not the supported RHEL path for installing Node.js. Replaced this with RHEL module installation for the `nodejs` Application Stream.
- The original service configuration used `/etc/<service>/config.conf`, which is not how a custom systemd service is created. Replaced it with a unit file under `/etc/systemd/system/my-node-app.service`.
- The original start commands used `<service>` placeholders and omitted `systemctl daemon-reload`, which Red Hat documents as required after creating or modifying unit files. Added `daemon-reload` and concrete `systemctl` commands.
- The original verification command `sudo <service> --test` was not valid for a Node.js application. Replaced it with `node --check` for syntax checking and `curl` for a local HTTP check.
- The original firewall command used `--add-service=<service>`, which only works for defined firewalld service names, not arbitrary systemd services. Replaced it with `--add-port=3000/tcp`.
- The original performance command used `pidof <service>`, which is unreliable for a Node.js service name. Replaced it with `systemctl show` using `MainPID`.
- The original guide implied it applied to all RHEL releases. The corrected install commands are for RHEL 8 and 9; the prerequisite now states that scope because RHEL 10 no longer distributes modular Application Streams.

## Review Notes
The guide is now technically accurate for a conventional RHEL 8/9 deployment where the Node.js application has a direct entry point such as `server.js`. Future improvements could add a separate RHEL 10 package-install path and optional SELinux policy guidance for production deployments.
