# Validation Summary: How to Install Yarn Package Manager on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF
- Node.js
- npm
- Corepack
- Yarn

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9.5 Release Notes, Node.js 22 module stream: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/new-features
- Yarn official installation documentation: https://yarnpkg.com/getting-started/install
- Yarn official `.yarnrc.yml` settings documentation: https://yarnpkg.com/configuration/yarnrc
- Yarn official `yarn config get` documentation: https://yarnpkg.com/cli/config/get
- Node.js Corepack documentation: https://nodejs.org/download/release/v18.20.7/docs/api/corepack.html

## Issues Found
- The original post used placeholder commands such as `dnf install -y <package-name>`, `/etc/<service>/config.conf`, `systemctl enable --now <service>`, and `<service> --test`. These would not install or verify Yarn. Replaced them with RHEL AppStream Node.js installation, Corepack enablement, Yarn activation, and Yarn verification commands.
- The original post installed `epel-release` and "Development Tools" as required dependencies. These are not required for installing Yarn through Corepack on RHEL. Replaced that step with `dnf module list nodejs` and `dnf module install`.
- The original post described Yarn as a system service with systemd, logs, firewall rules, and service performance tuning. Yarn is a command-line package manager, not a systemd service. Replaced those sections with project initialization, registry/network configuration, and Yarn configuration checks.
- The original security guidance discussed dedicated service users, TLS for a service, and firewall restrictions. Replaced it with relevant package-manager security guidance: update Node.js, use HTTPS registries, protect registry tokens, and pin the Yarn version.

## Review Notes
The example uses `nodejs:20` because it is a supported RHEL 9 AppStream stream on current RHEL 9 releases. RHEL minor releases can expose different Node.js streams, so the post instructs readers to list available streams first and choose a supported stream shown on their system.
