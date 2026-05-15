# Validation Summary: How to Use IdM Vaults for Storing Secrets on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management
- FreeIPA vault CLI
- Key Recovery Authority
- OpenSSL

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Working with vaults in Identity Management - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/working_with_vaults_in_identity_management
- Red Hat Enterprise Linux 9 documentation: Vaults in IdM - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/working_with_vaults_in_identity_management/vaults-in-idm_working-with-vaults-in-identity-management
- Red Hat Enterprise Linux 9 documentation: Using IdM user vaults - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/working_with_vaults_in_identity_management/using-idm-user-vaults-storing-and-retrieving-secrets_working-with-vaults-in-identity-management
- Red Hat Enterprise Linux 9 documentation: Managing IdM service secrets - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/working_with_vaults_in_identity_management/managing-idm-service-vaults-storing-and-retrieving-secrets_working-with-vaults-in-identity-management
- FreeIPA vault client and server command definitions - https://github.com/freeipa/freeipa/blob/master/ipaclient/plugins/vault.py and https://github.com/freeipa/freeipa/blob/master/ipaserver/plugins/vault.py

## Issues Found
- Corrected the opening explanation that said secrets are stored inside the IdM directory itself. The official implementation stores vault metadata in IdM and archives the protected secret through KRA, so the wording now avoids implying the LDAP directory directly stores the secret.
- Corrected the asymmetric vault explanation. Official RHEL documentation says vault owners can archive and retrieve secrets, while vault members can only archive secrets, and retrieval requires the private key.
- Corrected the vault listing example. `ipa vault-find --users` is a flag for listing all user vaults, while `ipa vault-find --user=jsmith` targets one user's vaults; `--users=jsmith` is not the documented command form.

## Review Notes
The remaining examples align with the RHEL 9 IdM vault workflow and FreeIPA CLI option names. The post could optionally add explicit `--out` paths to every retrieval example for clearer handling of binary data, but the command syntax itself is valid.
