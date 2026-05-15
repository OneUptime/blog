# Validation Summary: How to Install Node.js Using nvm on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF
- nvm
- Node.js
- npm
- firewalld

## Sources Consulted
- nvm README, installation and profile initialization instructions: https://github.com/nvm-sh/nvm/blob/master/README.md
- Red Hat Enterprise Linux 9 DNF documentation, package and group installation commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Customer Portal EPEL guidance: https://access.redhat.com/solutions/3358

## Issues Found
- The post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`. These were replaced with actual nvm installation and verification commands.
- The post installed `epel-release`, but nvm installation does not require EPEL. The dependency step now installs `curl` and `git`, plus the RHEL "Development Tools" package group for builds that need compilation.
- The post treated Node.js installed through nvm as a systemd service with `<service>` placeholders. nvm is a per-user shell-based version manager, so the service start, status, test, and journal commands were replaced with shell loading and `node`/`npm`/`npx` verification.
- The post referenced a generic service configuration file under `/etc/<service>/config.conf`. nvm does not use a system service configuration file, so this was replaced with `nvm install --lts` and default-version configuration.
- The section titles for service configuration and startup were inaccurate for nvm. They were renamed while preserving the step order.
- The firewall example used `--add-service=<service>`, which is not applicable to nvm. It now explains that only Node.js applications that listen on network ports need firewall rules and shows an example TCP port rule.
- The troubleshooting section focused on generic systemd service failures. It now covers common nvm issues such as missing shell initialization, non-persistent default versions, npm permission errors, and application port conflicts.

## Review Notes
The guide intentionally uses the upstream nvm install script version `v0.40.4`, which is the current version shown in the upstream nvm README at review time. Future updates should check the nvm README for the latest install script version before publishing.
