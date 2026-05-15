# Validation Summary: How to Set Up a Cross-Forest Trust Between IdM and Active Directory on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management / FreeIPA
- Microsoft Active Directory
- Kerberos cross-realm trusts
- SSSD ID mapping
- firewalld
- IdM HBAC and sudo rules

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing trust between IdM and AD: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_trust_between_idm_and_ad/installing_trust_between_idm_and_ad
- Red Hat Enterprise Linux 9: Setting up a trust: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_trust_between_idm_and_ad/setting-up-a-trust_installing-trust-between-idm-and-ad
- Red Hat Enterprise Linux 9: Managing IdM users, groups, hosts, and access control rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-accounts-using-the-idm-web-ui_managing-users-groups-hosts
- FreeIPA trust_add API reference: https://freeipa.readthedocs.io/en/ipa-4-11/api/trust_add.html
- Microsoft Learn: Configure a firewall for Active Directory domains and trusts: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/config-firewall-for-ad-domains-and-trusts

## Issues Found
- Corrected the opening explanation to avoid implying that a standard IdM-AD trust allows symmetric access in both directions. Red Hat documents one-way trust as the default for AD users accessing IdM resources, and notes that two-way trust does not allow IdM users to log in to Windows systems.
- Updated the supported Windows Server prerequisite from "Windows Server 2012 R2 or later" to include Windows Server 2012 and the RHEL 9.1 requirement for Windows Server 2022.
- Added the missing `samba-client` package required by Red Hat's documented trust preparation procedure.
- Removed `--add-agents` from the initial unattended `ipa-adtrust-install` example because it is used for trust-agent configuration, not the basic trust-controller setup.
- Added `ipactl restart` after `ipa-adtrust-install`, matching Red Hat's setup procedure.
- Corrected the firewall port description: the dynamic RPC range for RHEL 9 / current Windows Server trust communication is `49152-65535`, not the old `1024-1300` range. Also clarified that NetBIOS ports 138 and 139 are not required for RHEL 9 IdM-AD trust.
- Added `--range-type=ipa-ad-trust` to `ipa trust-add` examples to make the intended SID-based ID mapping explicit.
- Clarified two-way trust behavior as an S4U-related scenario rather than general bidirectional login capability.
- Replaced the post-creation `ipa idrange-mod --base-id --range-size` example with defining `--base-id` and `--range-size` at trust creation time.
- Fixed the AD group access model by mapping AD users or groups into a non-POSIX external group, nesting that group into an IdM POSIX group, and using the POSIX group for HBAC and sudo rules.
- Added the required `ipa sudocmd-add /usr/bin/systemctl` before adding that command to a sudo rule.

## Review Notes
The remaining examples assume that referenced host groups, HBAC services, DNS servers, and AD security groups already exist in the environment. That is acceptable for a concise tutorial, but a future expansion could add verification steps for those prerequisites.
