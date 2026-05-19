# Validation Summary: How to Install and Configure Kerberos KDC on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server 22.04 and 24.04
- MIT Kerberos
- Kerberos KDC and admin server
- Kerberos principals and keytabs
- krb5.conf and kadm5.acl configuration
- UFW firewall rules
- DNS SRV records

## Sources Consulted
- Ubuntu Server documentation: Install a Kerberos server: https://ubuntu.com/server/docs/how-to/kerberos/install-a-kerberos-server/
- Ubuntu Server documentation: Introduction to Kerberos: https://ubuntu.com/server/docs/explanation/intro-to/kerberos/
- MIT Kerberos documentation: krb5.conf: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos documentation: kdc.conf and encryption types: https://www.mit.edu/~kerberos/krb5-current/doc/admin/conf_files/kdc_conf.html
- MIT Kerberos documentation: kadmin and kadmin.local: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos documentation: kdb5_util: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kdb5_util.html
- MIT Kerberos documentation: kinit: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos documentation: kvno: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kvno.html

## Issues Found
- The krb5.conf snippet said DNS lookup was enabled while setting `dns_lookup_realm = false` and `dns_lookup_kdc = false`. Updated the comment to accurately describe the explicit KDC configuration.
- The encryption example pinned `default_tkt_enctypes` and `default_tgs_enctypes` to AES-SHA1 values. MIT Kerberos documentation recommends not setting those client-side lists unless needed for backward compatibility, because stale lists can prevent stronger enctypes from being used after upgrades. Replaced the pinned lists with `permitted_enctypes = DEFAULT`.
- The service command used `systemctl start` after editing `kadm5.acl`. Ubuntu documentation notes the admin server should be restarted for ACL changes to take effect, and `krb5_newrealm` may already have started the services. Changed the command to `systemctl restart`.
- The listener verification command grepped only for `kdc`, which can miss the `kadmind` listener on port 749. Updated it to check ports 88 and 749 directly.
- The firewall example opened Kerberos ports globally and then added a narrower port 88 rule, which does not restrict access after the global allow rules exist. Updated the restricted example to show source-limited rules for all Kerberos-related ports as an alternative to the global rules.

## Review Notes
The remaining commands and configuration examples align with Ubuntu and MIT Kerberos documentation. The tutorial keeps a simple single-KDC setup; production deployments should also consider secondary KDCs, backup protection, password policies, and tighter network exposure.
