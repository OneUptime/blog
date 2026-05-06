# Validation Summary: How to Configure GSS-TSIG for IPv6 DNS Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BIND 9
- GSS-TSIG
- Kerberos / GSSAPI
- MIT Kerberos
- Active Directory
- Windows DNS dynamic update
- IPv6 DNS
- `nsupdate`

## Sources Consulted
- ISC BIND 9 Configuration Reference: https://bind9.readthedocs.io/en/v9.21.9/reference.html
- ISC BIND 9 Manual Pages (`nsupdate`): https://bind9.readthedocs.io/en/v9.21.20/manpages.html
- MIT Kerberos `krb5.conf` documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos application server and keytab documentation: https://web.mit.edu/kerberos/krb5-1.19/doc/admin/appl_servers.html
- Microsoft `ktpass` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ktpass
- Microsoft Dynamic DNS Update documentation: https://learn.microsoft.com/en-us/windows-server/networking/dns/dynamic-update
- Microsoft DNS client operational log guidance: https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-app-access
- RFC 3645, GSS-TSIG: https://datatracker.ietf.org/doc/html/rfc3645
- RFC 2136, Dynamic Updates in the Domain Name System (DNS UPDATE): https://datatracker.ietf.org/doc/html/rfc2136

## Issues Found
- The Kerberos example used an invalid `krb5.conf` relation (`kdc_address`) and a malformed IPv6 sample value. I replaced it with a valid realm stanza using an explicit IPv6 KDC entry documented by MIT Kerberos.
- The Active Directory keytab example used `net ads keytab create` as if it created the DNS service principal by itself. I replaced that with a documented `ktpass` workflow for AD and kept the MIT `kadmin` path for MIT Kerberos.
- The BIND zone authorization example used `allow-update` with a pseudo-pattern (`key gss.*@EXAMPLE.COM;`), which does not match how BIND authorizes GSS-TSIG principals. I replaced it with documented `update-policy` rules using `krb5-self` and `ms-self`.
- The `named.conf` comment described `tkey-gssapi-credential` as a credential file. I corrected the comment to reflect that it pins the Kerberos principal.
- The `nsupdate` examples used a `server` directive even though BIND documents that `server` has no effect when GSS-TSIG is in use. I removed that dependency, forced IPv6 transport with `-6`, and kept the zone and realm selection explicit.
- The troubleshooting example used an invalid IPv6 literal (`2001:db8::test`). I replaced it with a syntactically valid documentation-range IPv6 address.
- The Windows event log example relied on the older `Get-EventLog` pattern against `System`/`Tcpip`. I updated it to query the DNS client operational log with `Get-WinEvent`, which matches current Microsoft guidance.
- The prerequisite check claimed `named -V` should show a fixed `+GSS_TSIG` marker. I changed that to the technically safer instruction to inspect the reported build options for GSSAPI support, since the exact output format varies by build.

## Review Notes
- The package names and service name in the post are Debian/Ubuntu-oriented (`bind9`, `journalctl -u bind9`).
- The AD example uses `ktpass`, which sets or maps credentials for the target account; operators should use an account intended for that service.
- Dynamic zones managed by BIND should not be edited manually while `named` is running; use dynamic updates or freeze/thaw workflows instead.
