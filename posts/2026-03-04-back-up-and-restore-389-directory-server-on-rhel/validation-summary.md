# Validation Summary: How to Back Up and Restore 389 Directory Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Directory Server / 389 Directory Server
- LDAP and LDIF
- `dsconf`, `dsctl`, `ldapsearch`, and `certutil`
- Cron-based backup automation

## Sources Consulted
- Red Hat Directory Server 13, Management, configuration, and operations: exporting data with `dsconf backend export` and `dsctl db2ldif`: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/management_configuration_and_operations/management_configuration_and_operations
- Red Hat Directory Server 13, Management, configuration, and operations: backing up and restoring with `dsconf backup create`, `dsctl db2bak`, and `dsctl bak2db`: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/management_configuration_and_operations/management_configuration_and_operations
- Red Hat Directory Server 12, Importing and exporting data: importing LDIF with `dsconf backend import` and `dsctl ldif2db`: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html/importing_and_exporting_data/importing-data-to-directory-server_importing-and-exporting-data
- Red Hat Directory Server 12, Backing up and restoring Red Hat Directory Server: online backup behavior, backup locations, and `PrivateTmp` caveat: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/epub/backing_up_and_restoring_red_hat_directory_server/index
- Red Hat Directory Server 13, Security and access control: listing and exporting certificates from the NSS database with `certutil`: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html/security_and_access_control/securing-rhds
- Red Hat Directory Server 11, Administration Guide: replication agreement status command syntax: https://docs.redhat.com/en/documentation/red_hat_directory_server/11/html/administration_guide/displaying_the_status_of_a_specific_replication_agreement
- 389 Directory Server upstream documentation, Directory Server basics for Certificate Server: `dsctl`/`dsconf` import and export examples: https://www.port389.org/docs/389ds/FAQ/ds-basics.html

## Issues Found
- The online LDIF export used `dsconf ... backend export userroot --ldif /tmp/...`. Red Hat documentation uses `userRoot` and the `-l file_name` option, and warns that `/tmp` can fail because Directory Server uses systemd `PrivateTmp` by default. Updated the command to write to `/var/lib/dirsrv/slapd-localhost/ldif/`.
- The offline LDIF export used `dsctl localhost export --suffix ...`, which is not the documented offline export command. Updated it to `dsctl localhost db2ldif userRoot ...`.
- The custom database backup examples used `dsconf backup create --archive`, but current Red Hat documentation specifies appending the destination directory to `dsconf backup create`. Updated both the manual and cron examples.
- The certificate export example used `dsctl localhost tls export-cert --nickname`, which is not the documented certificate export method. Replaced it with `certutil -L -d ... -n ... -a`.
- The LDIF restore example used `dsctl localhost import`, which is not the documented offline import command. Updated it to `dsctl localhost ldif2db userRoot ...`.
- The database restore example used `dsctl localhost restore`, which is not the documented offline restore command. Updated it to `dsctl localhost bak2db ...`.

## Review Notes
The corrected examples assume the instance name is `localhost`, the backend is `userRoot`, and cron runs the backup script as root. In replicated deployments, Red Hat notes that restoring from an online backup can require replica reinitialization because the changelog is cleaned during restore.
