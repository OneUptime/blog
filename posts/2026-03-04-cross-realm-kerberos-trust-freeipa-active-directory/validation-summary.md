# Validation Summary: How to Configure Cross-Realm Kerberos Trust Between FreeIPA and Active Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Identity Management / FreeIPA
- Kerberos cross-realm and cross-forest trusts
- Active Directory
- Samba trust components
- SSSD
- IdM HBAC and sudo rules
- DNS forwarding and SRV records

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Installing trust between IdM and AD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/installing_trust_between_idm_and_ad/index/
- Red Hat Enterprise Linux 8 documentation, "Installing trust between IdM and AD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/installing_identity_management/installing-trust-between-idm-and-ad_installing-identity-management
- FreeIPA documentation, "Active Directory trust setup": https://www.freeipa.org/page/Active_Directory_trust_setup.html
- FreeIPA API reference, `trust_add`: https://freeipa.readthedocs.io/en/ipa-4-11/api/trust_add.html
- FreeIPA API reference, `idrange_mod`: https://freeipa.readthedocs.io/en/latest/api/idrange_mod.html
- FreeIPA API reference, `group_add_member`: https://freeipa.readthedocs.io/en/latest/api/group_add_member.html
- FreeIPA API reference / CLI reference for HBAC rule commands: https://freeipa.readthedocs.io/en/ipa-4-9/api/hbac_guide.html
- Red Hat Enterprise Linux documentation, managing AD users in IdM sudo/HBAC through external and POSIX groups: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_idm_users_groups_hosts_and_access_control_rules/managing_idm_users_groups_hosts_and_access_control_rules

## Issues Found
- The prerequisite list incorrectly implied that integrated DNS and CA were mandatory. Updated it to state that integrated DNS simplifies the setup and that non-integrated DNS requires manually adding records printed by `ipa-adtrust-install`.
- The port list included the old Dynamic RPC range `1024-1300` and omitted the current documented Dynamic RPC range and Global Catalog port. Updated it to `49152-65535` and added port `3268`, while noting that LDAPS port `636` is only required for environments that mandate LDAPS.
- The DNS SRV verification examples were too generic for AD trust validation. Updated them to check the AD `_kerberos._tcp.dc._msdcs` and `_ldap._tcp.dc._msdcs` SRV records and added an IdM Kerberos SRV check from AD.
- The trust package installation omitted `samba-client`, and the workflow omitted `kinit admin`, post-install restart, and Samba Kerberos verification. Added those commands in the trust preparation step.
- The description of a one-way trust was reversed. Corrected it to state that the default one-way trust means IdM trusts the AD forest, allowing AD users and groups to access IdM resources.
- The ID range section implied that post-creation range changes are routine. Updated it to show setting `--base-id` and `--range-size` at `ipa trust-add` time, and added a warning before modifying an existing range.

## Review Notes
The overall approach is technically sound after the fixes. In a future revision, the guide could add version-specific notes for RHEL 8 versus RHEL 10 firewall behavior and mention that external AD groups used for HBAC/sudo should be AD security groups with global or universal scope.
