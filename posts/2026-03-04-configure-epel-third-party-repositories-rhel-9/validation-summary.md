# Validation Summary: How to Configure Third-Party Repositories (EPEL) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- DNF
- RPM GPG keys
- CodeReady Linux Builder / CodeReady Builder
- YUM/DNF repository configuration

## Sources Consulted
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream - https://www.redhat.com/en/blog/install-epel-linux
- Red Hat Customer Portal: Enabling or disabling a repository using Red Hat Subscription Management - https://access.redhat.com/solutions/265523
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Fedora Packages: epel-release - https://packages.fedoraproject.org/pkgs/epel-release/epel-release/index.html
- Fedora EPEL package source: epel.repo and epel-release.spec - https://src.fedoraproject.org/rpms/epel-release
- Fedora EPEL FAQ and guidelines - https://fedoraproject.org/wiki/EPEL/FAQ and https://fedoraproject.org/wiki/EPEL/GuidelinesAndPolicies
- DNF Configuration Reference - https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF Command Reference - https://dnf.readthedocs.io/en/stable/command_ref.html

## Issues Found
- The post presented `sudo dnf config-manager --set-enabled crb` as an RHEL alternative for enabling CodeReady Builder. On RHEL 9, the repository ID is `codeready-builder-for-rhel-9-$(arch)-rpms`, and Red Hat Subscription Management is the canonical way to enable it. Updated the DNF example to use the RHEL repo ID and clarified that it applies when DNF directly manages the repo file.
- The post implied EPEL `repo_gpgcheck=1` could be enabled alongside the default EPEL GPG key configuration. The default EPEL 9 repo file does not enable repository metadata GPG checking, and the current EPEL repodata path does not publish `repomd.xml.asc`. Updated the snippet to keep package `gpgcheck=1` while noting metadata verification should only be enabled for repositories that publish signed metadata.
- The post used `exclude=` for repository package filtering. DNF documents `excludepkgs` for filtering packages in `[main]` or repository sections. Updated the EPEL repo example to use `excludepkgs=kernel* httpd*`.
- The post stated that EPEL "never" replaces or conflicts with BaseOS or AppStream packages. Fedora EPEL policy says EPEL packages should not conflict with or replace packages in the base Enterprise Linux distribution. Softened the wording to "is designed not to" to match the policy more accurately.

## Review Notes
The remaining commands and examples are consistent with the checked documentation for RHEL 9 and DNF. The `epel-release-latest-9.noarch.rpm` URL is valid, and Fedora's `epel-release` package includes EPEL repository configuration and the EPEL GPG key.
