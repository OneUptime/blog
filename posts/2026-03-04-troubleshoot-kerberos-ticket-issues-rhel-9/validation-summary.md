# Validation Summary: How to Troubleshoot Kerberos Ticket Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kerberos
- MIT Kerberos client and administration tools
- Red Hat Identity Management / FreeIPA
- chrony time synchronization
- DNS SRV records
- SSH GSSAPI credential delegation
- Active Directory account checks

## Sources Consulted
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos kinit documentation: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos klist documentation: https://web.mit.edu/kerberos/krb5-1.17/doc/user/user_commands/klist.html
- MIT Kerberos environment variable documentation for KRB5_TRACE: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_config/kerberos.html
- MIT Kerberos application server and keytab documentation: https://web.mit.edu/KERBEROS/krb5-1.15/doc/admin/appl_servers.html
- MIT Kerberos Administration Guide DNS SRV records and kadmin.local behavior: https://web.mit.edu/kaduk/Public/admin.pdf
- Red Hat Enterprise Linux 9 Installing Identity Management, time synchronization requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/index
- Red Hat Enterprise Linux 9 Accessing Identity Management services, kinit and ticket behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/accessing_identity_management_services/index
- Red Hat Enterprise Linux 9 Configuring and using network file services, ipa service-add and ipa-getkeytab examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- FreeIPA service_add API documentation: https://freeipa.readthedocs.io/en/ipa-4-12/api/service_add.html
- Local nc(1) man page for TCP/UDP probe flags

## Issues Found
- The DNS SRV example used `_kerberos-master._tcp.EXAMPLE.COM`. MIT Kerberos documents `_kerberos-master._udp` for master KDC discovery, so the command was changed to query `_kerberos-master._udp.EXAMPLE.COM`.
- The UDP netcat check implied the UDP result was as definitive as the TCP check. The comment was updated to note that lack of a UDP response does not always prove that the port is closed.
- Several standalone KDC examples used `kadmin.local:` prompt syntax inside shell snippets, including one example with a shell pipe after an interactive kadmin command. These were changed to shell-runnable `sudo kadmin.local -q "..."` commands.

## Review Notes
The remaining examples are technically consistent with the consulted documentation. In a future revision, the encryption-type section could mention RHEL system-wide crypto policies because those can influence Kerberos encryption behavior on RHEL systems, but the current `permitted_enctypes` example is valid Kerberos configuration.
