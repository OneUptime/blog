# Validation Summary: How to Set Up a Cross-Forest Trust Between IdM and Active Directory on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Identity Management
- Active Directory
- FreeIPA
- Kerberos
- Samba
- DNS forwarding
- HBAC rules

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing trust between IdM and AD: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/installing_trust_between_idm_and_ad/Red_Hat_Enterprise_Linux-9-Installing_trust_between_IdM_and_AD-en-US.pdf
- Red Hat Enterprise Linux 9: Managing IdM users, groups, hosts, and access control rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_idm_users_groups_hosts_and_access_control_rules/Red_Hat_Enterprise_Linux-9-Managing_IdM_users_groups_hosts_and_access_control_rules-en-US.pdf
- Red Hat Enterprise Linux 9: Configuring host-based access control rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/configuring-host-based-access-control-rules_managing-users-groups-hosts
- FreeIPA Active Directory trust setup: https://www.freeipa.org/page/Active_Directory_trust_setup.html

## Issues Found
- The package installation example only installed `ipa-server-trust-ad`. Red Hat examples also require trust setup tooling such as `samba-client`, so the command now installs both packages.
- The `ipa trust-add` examples left the ID range type to automatic detection. Red Hat documents `--range-type=ipa-ad-trust` as the common SID-based mapping configuration and warns that auto-detection can choose a POSIX range unexpectedly when AD POSIX attributes are detected. The examples now specify `--range-type=ipa-ad-trust`.
- The two-way trust comment implied normal bidirectional access. Red Hat documents that IdM two-way trust is mainly needed for cross-forest Kerberos S4U use cases and does not allow IdM users to log in to Windows systems. The comment was corrected.
- The HBAC example tried to add a trusted AD group directly to an HBAC rule. Red Hat documents mapping AD users or groups into an IdM external group, nesting that into an IdM POSIX group, and then using the IdM group in access rules. The example was corrected to follow that pattern.

## Review Notes
The DNS forwarding, `ipa-adtrust-install`, `ipa trust-add`, `ipa trust-find`, `ipa trust-show`, `id`, `kinit`, `klist`, and `ipa idrange-find` examples are consistent with Red Hat and FreeIPA documentation. In production, administrators should also verify firewall ports, supported Windows Server versions, AD administrator privileges, and DNS SRV records before creating the trust.
