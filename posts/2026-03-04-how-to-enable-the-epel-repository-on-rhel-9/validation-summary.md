# Validation Summary: How to Enable the EPEL Repository on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- DNF
- Red Hat Subscription Management
- DNF repository configuration

## Sources Consulted
- Red Hat Customer Portal: Enabling or disabling a repository using Red Hat Subscription Management: https://access.redhat.com/solutions/265523
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/managing_software_with_the_dnf_tool/red_hat_enterprise_linux-9-managing_software_with_the_dnf_tool-en-us.pdf
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF config-manager Plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/config_manager.html
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- Fedora Packages: epel-release for EPEL 9: https://packages.fedoraproject.org/pkgs/epel-release/epel-release/epel-9.html
- Fedora Packages: htop for EPEL 9: https://packages.fedoraproject.org/pkgs/htop/htop/epel-9.html
- Fedora Packages: neofetch: https://packages.fedoraproject.org/pkgs/neofetch/neofetch/
- Fedora Packages: certbot for EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html

## Issues Found
- The EPEL priority example said to add `priority=10` while describing a configuration that prioritizes base RHEL repositories over EPEL. DNF chooses the repository with the lowest numeric priority value, and the default priority is `99`, so `priority=10` would make EPEL higher priority than default RHEL repositories. Changed the example to `priority=100` and clarified that EPEL should use a higher numeric value than the default.
- The text referred to installing a priorities plugin for DNF repository priority behavior. DNF supports the `priority` repository option directly, so the wording was changed to describe setting the repository priority instead.

## Review Notes
- The Fedora Docs EPEL page was protected from direct automated access during review, so EPEL installation was cross-checked against Red Hat's official EPEL installation article and Fedora Packages metadata.
- The prerequisite repository IDs shown in the post are correct for x86_64 RHEL 9 systems. Other architectures require replacing `x86_64` with the matching architecture.
