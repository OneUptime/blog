# Validation Summary: How to Install and Configure an IdM Client on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA/IPA client tooling
- SSSD
- Kerberos
- authselect
- NetworkManager/nmcli
- Ansible ansible-freeipa ipaclient role

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 9: Configuring authentication and authorization in RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9: Managing IdM users, groups, hosts, and access control rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/granting-sudo-access-to-an-idm-user-on-an-idm-client_managing-users-groups-hosts
- Red Hat Enterprise Linux 9: Managing public SSH keys for users and hosts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-public-ssh-keys_managing-users-groups-hosts
- Red Hat Enterprise Linux 9: Installing an Identity Management client using an Ansible playbook: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_identity_management/installing-an-identity-management-client-using-an-ansible-playbook_installing-identity-management
- FreeIPA ansible-freeipa ipaclient role documentation: https://www.freeipa.org/page/V4/ClientInstallationWithAnsible
- ipa-client-install man page reference: https://www.mankier.com/1/ipa-client-install

## Issues Found
- The prerequisites listed only ports 88, 389, 636, and 443. Red Hat's IdM port requirements also include HTTP port 80 and Kerberos password-change port 464, with DNS port 53 required when using integrated DNS. Updated the prerequisite list accordingly.
- The one-time password example used a manually supplied host password. The documented Red Hat workflow generates a random one-time password with `ipa host-add --random`, so the example now uses `--random` and shows the generated password being passed to `ipa-client-install`.
- The sudo section used `authselect select sssd with-sudo with-mkhomedir`, which can reset the selected authselect profile features on an already enrolled IdM client. Updated it to `authselect enable-feature with-sudo`, matching the narrower change needed to enable sudo lookup through SSSD.

## Review Notes
- Most commands and configuration examples were accurate for RHEL 9 IdM client enrollment.
- The `ipa-client-install --password` option is valid both for authorized principal enrollment and OTP-based enrollment depending on the accompanying options.
- The Ansible `ipaclient` role example with `state: present` is valid according to ansible-freeipa role documentation.
