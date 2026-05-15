# Validation Summary: How to Diagnose DNS Issues with dig and nslookup on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- BIND utilities (`dig`, `nslookup`, `host`)
- DNS record lookups and response codes
- DNSSEC troubleshooting
- DNS delegation and authoritative name servers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing networking infrastructure services, BIND setup and `bind-utils` package references: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- ISC BIND 9 manual pages for `dig` and `nslookup`: https://isc-projects.gitlab-pages.isc.org/bind9/manpages.html
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://www.rfc-editor.org/rfc/rfc8482
- IANA example domains documentation: https://www.iana.org/help/example-domains
- Local command verification with `dig -h`, `nslookup`, and live DNS queries for `example.com` authoritative servers.

## Issues Found
- The post described `dig example.com ANY` as checking all record types. This is misleading because ANY is a DNS meta-query and modern authoritative servers may return minimal responses. Changed the wording to say it requests cached records of any type and added a short caveat.
- Several examples queried `ns1.example.com` or `ns2.example.com` as authoritative servers for `example.com`, but those are not authoritative for the domain. Replaced them with currently delegated `example.com` authoritative name servers, `hera.ns.cloudflare.com` and `elliott.ns.cloudflare.com`, where the commands are meant to work against `example.com`.

## Review Notes
The remaining `dig` and `nslookup` command syntax was verified against ISC BIND documentation and local command output. `+cd` is valid shorthand for `+cdflag`, `+trace` follows delegation from the root, `+timeout` and `+tries` are current `dig` options, and `nslookup -type=...` is valid command-line syntax. Zone transfers are correctly qualified as working only if allowed.
