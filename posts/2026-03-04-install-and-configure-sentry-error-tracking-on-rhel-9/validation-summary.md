# Validation Summary: How to Install and Configure Sentry Error Tracking on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Sentry error tracking
- systemd
- DNF
- journald

## Sources Consulted
- Sentry Self-Hosted documentation: https://develop.sentry.dev/self-hosted/
- Red Hat Enterprise Linux 9 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation, Configuring basic system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/

## Issues Found
- The post is a generic placeholder and does not provide a working Sentry installation or configuration process. It uses placeholders such as `<package-name>`, `<service>`, and `<service-name>` instead of Sentry-specific packages, services, files, or Docker Compose commands.
- The official Sentry self-hosted installation flow uses the `getsentry/self-hosted` repository, `./install.sh`, and `docker compose up --wait`; the post does not mention this flow.
- The post implies Sentry can be installed like a conventional RHEL system service package, but the official self-hosted documentation describes a Docker Compose based deployment and notes known installation issues on RHEL-based distributions.
- Because the post contains no concrete, usable Sentry technical guidance, it was classified as not technically relevant rather than edited into a different article.

## Review Notes
The generic RHEL command forms for `dnf`, `systemctl`, and `journalctl` are broadly plausible, but they are not sufficient to make this a correct Sentry installation guide. A future replacement should be written from the official Sentry self-hosted documentation and should include the RHEL-specific caveats, Docker and Docker Compose requirements, resource requirements, startup commands, and verification steps.
