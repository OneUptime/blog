# Validation Summary: How to Install Tuned Custom Profiles via Cockpit on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- TuneD
- systemd
- dnf
- journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 documentation, "Managing systems using the RHEL 9 web console": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index

## Issues Found
- The post is generic placeholder content rather than a technically relevant guide for installing TuneD custom profiles via Cockpit on RHEL 9.
- The package installation command uses `sudo dnf install -y <package-name>` instead of naming the relevant packages, such as TuneD and the RHEL web console components.
- The configuration path `/etc/<service>/config.conf` is not a valid TuneD custom profile path. Red Hat documents TuneD custom profiles under `/etc/tuned/<profile-name>/tuned.conf`.
- The service commands use `<service-name>` placeholders and do not identify the relevant services, such as `tuned` or `cockpit.socket`.
- The article does not describe the documented RHEL web console workflow for selecting performance profiles, nor the documented TuneD workflow for creating or modifying profiles.
- Correcting the article would require replacing the placeholder content with a substantially new guide, which is beyond a technical correction while preserving the post's existing structure and content.

## Review Notes
The title and tags describe a specific RHEL 9 TuneD/Cockpit procedure, but the body contains only generic service-management instructions. This should be removed or replaced with a real tutorial based on Red Hat's documented TuneD profile and RHEL web console workflows.
