# Validation Summary: How to Secure NFS Exports with Kerberos Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFS
- Kerberos / RPCSEC_GSS
- MIT Kerberos client configuration
- systemd services
- `/etc/exports` and NFS mount options

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using network file services - AUTH_GSS authentication method and NFS server services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- Red Hat Enterprise Linux 9 documentation: Managing file systems - NFS Kerberos client setup and NFS mount security options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Linux `exports(5)` manual page: RPCSEC_GSS security and `sec=` export option: https://man7.org/linux/man-pages/man5/exports.5.html
- MIT Kerberos documentation: `kadmin` commands including `addprinc` and `ktadd`: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos documentation: `krb5.conf` sections and realm/KDC settings: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html

## Issues Found
- The post instructed readers to create `nfs/<client FQDN>` service principals for clients. RHEL IdM guidance uses an `nfs/<server FQDN>` service principal for the NFS server and `host/<client FQDN>` principals/keytabs for clients. Updated the client example to `host/client1.example.com` and clarified the client keytab instruction.
- The service startup section said to enable both `gssproxy` and `rpc-gssd` on both servers and clients, then stated that `gssproxy` handles both sides. Red Hat documents `gssproxy` as handling Kerberos authentication for `rpc.nfsd` on the server, while `rpc.gssd` establishes GSS contexts for NFS clients. Split the commands into server and client steps and corrected the wording.

## Review Notes
The remaining `sec=krb5`, `sec=krb5i`, and `sec=krb5p` descriptions, `/etc/exports` syntax, mount examples, and Kerberos clock/DNS caveats align with the consulted RHEL and Linux manual documentation. In an IdM environment, Red Hat commonly shows `ipa-getkeytab` and `ipa-client-automount`; this post remains generic for Kerberos/AD/FreeIPA deployments, which is acceptable but could be expanded in a future post.
