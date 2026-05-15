# Validation Summary: How to Install and Configure 389 Directory Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Directory Server / 389 Directory Server
- LDAP and LDAPS
- `dscreate`, `dsctl`, `dsconf`, and `dsidm`
- `firewalld`

## Sources Consulted
- Red Hat Directory Server 12: Installing Red Hat Directory Server: https://docs.redhat.com/en-us/documentation/red_hat_directory_server/12/pdf/installing_red_hat_directory_server/Red_Hat_Directory_Server-12-Installing_Red_Hat_Directory_Server-en-US.pdf
- Red Hat Directory Server 12: Securing Red Hat Directory Server: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/securing_red_hat_directory_server/index
- Red Hat Directory Server 12: User management and authentication: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/user_management_and_authentication/user_management_and_authentication
- 389 Directory Server upstream install guide: https://www.port389.org/docs/389ds/howto/howto-install-389.html
- 389 Directory Server upstream quick start: https://www.port389.org/docs/389ds/howto/quickstart.html
- `dsctl(8)` man page: https://www.mankier.com/8/dsctl
- `dsidm(8)` man page: https://www.mankier.com/8/dsidm

## Issues Found
- The install command omitted the Red Hat Directory Server module enablement documented for Red Hat Directory Server 12, and the post used `ldapsearch` without installing the OpenLDAP client package. Added `dnf module enable -y redhat-ds:12` and `openldap-clients`.
- `dsctl --version` is not documented in the current `dsctl(8)` synopsis. Replaced it with `rpm -q 389-ds-base` as a package installation check.
- The instance template used `sample_entries = yes` and then created `People` and `Groups` OUs manually. Sample entries already create the default user and group containers, so the later OU creation could fail. Changed the template to `sample_entries = no` and `create_suffix_entry = True`.
- The `dsidm` examples placed `-b` after the instance name, while the documented synopsis defines `-b` as a global option before the instance argument. Moved `-b "dc=example,dc=com"` before `localhost` in all examples.
- The password example modified `userPassword` directly. Replaced it with the documented `dsidm account reset_password` workflow for account password management.
- The firewall commands used service names, while Red Hat's Directory Server install docs open the LDAP and LDAPS TCP ports directly. Replaced them with `firewall-cmd --permanent --add-port={389/tcp,636/tcp}`.
- The TLS section implied that a new self-signed certificate must be enabled manually and did not include the CA trust and RSA certificate-name configuration required in Red Hat's command-line TLS workflow. Updated it to state that new instances include self-signed TLS by default and added the documented `config replace`, CA import, trust flags, and RSA certificate settings for custom certificates.

## Review Notes
- I could not run the 389 Directory Server commands locally because the CLI tools are not installed in this workspace. The review was performed against current Red Hat documentation and upstream CLI man pages.
- The post remains a basic local-instance tutorial. Production deployments should also cover certificate authority handling, client trust configuration, backups, access controls, and avoiding clear-text example passwords.
