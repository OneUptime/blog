# Validation Summary: How to Install HashiCorp Packer on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- HashiCorp RPM repository
- HashiCorp Packer CLI
- Packer HCL templates and plugins

## Sources Consulted
- HashiCorp Developer: Install Packer: https://developer.hashicorp.com/packer/install
- HashiCorp Developer: Install Packer tutorial: https://developer.hashicorp.com/packer/tutorials/docker-get-started/get-started-install-cli
- HashiCorp official packaging guide: https://www.hashicorp.com/en/official-packaging-guide
- HashiCorp Developer: Packer commands overview: https://developer.hashicorp.com/packer/docs/commands
- HashiCorp Developer: packer init command reference: https://developer.hashicorp.com/packer/docs/commands/init
- HashiCorp Developer: packer validate command reference: https://developer.hashicorp.com/packer/docs/commands/validate
- Red Hat Enterprise Linux 9 Managing software with the DNF tool: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/

## Issues Found
- The installation steps used `dnf config-manager` without first installing the package that provides the DNF config-manager plugin. Added `sudo dnf install -y dnf-plugins-core`.
- The post incorrectly described Packer as a systemd service with a configuration file under `/etc/<service>/config.conf`, service restart commands, enable/start commands, systemctl status checks, and journalctl logs. Packer is controlled through the `packer` CLI. Replaced those commands with `packer version`, `packer`, `packer init .`, and `packer validate .`.
- The troubleshooting section used placeholder service and package checks. Replaced them with Packer-specific checks for `dnf config-manager`, `rpm -q packer`, and template initialization/validation.
- The conclusion referred to monitoring a service and reviewing logs. Updated it to refer to testing image builds instead.

## Review Notes
The HashiCorp RPM repository supports RHEL/CentOS 9. Packer itself is installed as a CLI; the exact build workflow depends on the user's Packer HCL template and selected builder plugins.
