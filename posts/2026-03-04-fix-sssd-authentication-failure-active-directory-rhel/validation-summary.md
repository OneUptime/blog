# Validation Summary: How to Fix 'SSSD: Authentication Failure' with Active Directory on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- Active Directory
- realmd
- Kerberos
- DNS SRV records
- NetworkManager
- adcli

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Integrating RHEL systems directly with Windows Active Directory, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-sssd_integrating-rhel-systems-directly-with-active-directory
- Red Hat Enterprise Linux 7 documentation: SSSD Clients and Active Directory DNS Site Autodiscovery, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/windows_integration_guide/sssd-ad-dns-sites
- Red Hat Enterprise Linux 7 documentation: System-Level Authentication Guide, SSSD troubleshooting and cache removal, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/system-level_authentication_guide/index
- SSSD troubleshooting documentation: Troubleshooting Basics, https://sssd.io/troubleshooting/basics.html
- SSSD sssctl(8) manual page, https://www.mankier.com/8/sssctl
- SSSD sssd.conf(5) manual page, https://www.mankier.com/5/sssd.conf
- SSSD sssd-simple(5) manual page, https://www.mankier.com/5/sssd-simple
- adcli(8) manual page, https://www.mankier.com/8/adcli
- MIT Kerberos kinit and klist documentation, https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html and https://web.mit.edu/kerberos/krb5-1.17/doc/user/user_commands/klist.html
- MIT Kerberos clock skew documentation, https://web.mit.edu/Kerberos/krb5-1.5/krb5-1.5.1/doc/krb5-admin/Clock-Skew.html

## Issues Found
- The `realm join` example used the uppercase Kerberos realm (`AD.EXAMPLE.COM`). Red Hat's realmd examples use the DNS domain name (`ad.example.com`) for discovery and joining, so the command was changed to `sudo realm join ad.example.com -U admin`.
- The machine password renewal command used `adcli update` without forcing a password update. The adcli manual states that, by default, the computer password is updated only if it is older than 30 days. The command was changed to include `--computer-password-lifetime=0` so it actually forces renewal during troubleshooting.
- The SSSD cache cleanup example manually stopped SSSD and removed `/var/lib/sss/db/*`. Red Hat documents `sssctl cache-remove` as the supported cache removal command because it handles stopping/starting SSSD and backs up local data. The example was changed to `sudo sssctl cache-remove`.

## Review Notes
- The DNS SRV, Kerberos, SSSD debug logging, log file paths, `access_provider`, `simple_allow_users`, and user lookup guidance are technically consistent with the consulted documentation.
- Clearing SSSD cache can remove cached credentials; avoid doing it while offline if the host depends on cached SSSD authentication.
