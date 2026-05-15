# Validation Summary: How to Install an IdM Server with Integrated DNS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA
- Integrated DNS with BIND
- Kerberos
- 389 Directory Server
- Dogtag Certificate System
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 8 Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/installing_identity_management/installing_identity_management
- Red Hat Customer Portal, "Which network ports are used by Identity Management (IdM)?": https://access.redhat.com/solutions/357673
- Red Hat Enterprise Linux 8 Configuring and managing Identity Management, password policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_identity_management/defining-idm-password-policies_configuring-and-managing-idm
- FreeIPA Quick Start Guide: https://www.freeipa.org/page/Quick_Start_Guide

## Issues Found
- The package installation section enabled the `idm:DL1` module stream. That is outdated for RHEL 9; current RHEL 9 documentation installs `ipa-server` and `ipa-server-dns` from the enabled BaseOS and AppStream repositories. Replaced the module command with `subscription-manager repos` commands for the RHEL 9 BaseOS and AppStream repositories.
- The prerequisites comment said the command verified forward and reverse resolution, but `getent hosts idm1.example.com` verifies only forward name resolution. Updated the comment to say forward resolution.
- The installer comment said IdM configures NTP. In current RHEL IdM documentation, NTP service exposure is deprecated in RHEL 8 and later, and the installer works with `chronyd` for time synchronization. Updated the comment to reference `chronyd`.
- The firewalld command used older individual FreeIPA service names. Red Hat documentation for current RHEL uses `freeipa-4` plus `dns`, and FreeIPA notes that `freeipa-ldap` and `freeipa-ldaps` were superseded by `freeipa-4`. Updated the command accordingly.
- The password policy comment said "Enable password policy", but the command modifies the global password policy. Updated the comment to describe the actual operation.

## Review Notes
The remaining installer options, including `--setup-dns`, `--forwarder`, `--no-reverse`, and `--unattended`, match Red Hat examples for non-interactive IdM server installation with integrated DNS. The example domain, IP address, and public DNS forwarder are placeholders and should be replaced for a real deployment.
