# Validation Summary: How to Avoid Adding AAAA Records When the Server Has No IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS
- AAAA records
- Happy Eyeballs
- Linux networking tools (`ip`, `ss`, `ping`, `curl`, `wget`, `dig`, `nc`)
- BIND 9
- PowerDNS Authoritative Server
- nginx
- Apache HTTP Server

## Sources Consulted
- RFC 8305: Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://www.rfc-editor.org/rfc/rfc8305
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724
- curl tutorial: https://curl.se/docs/tutorial.html
- curl URL syntax: https://curl.se/docs/url-syntax.html
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- Apache HTTP Server 2.4, Binding to Addresses and Ports: https://httpd.apache.org/docs/current/bind.html
- nginx `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- PowerDNS Authoritative Server `pdnsutil` man page: https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- ISC KB: Why don't my zones reload when I do an "rndc reload" or SIGHUP?: https://kb.isc.org/docs/aa-00281
- ISC KB: Should I use `rndc reconfig` or `rndc reload`?: https://kb.isc.org/docs/aa-00640
- Linux `hosts(5)` man page: https://man7.org/linux/man-pages/man5/hosts.5.html
- Local command help checked for current syntax: `curl --help all`, `wget --help`, `ip -6 addr help`, `ss --help`, `dig -h`, `nc -h`, `ping -h`

## Issues Found
- The Happy Eyeballs explanation was too absolute. RFC 8305 recommends a 250 ms default connection-attempt delay, but it does not define this as a mandatory fixed wait specifically before "IPv4 fallback". I corrected the wording.
- The direct IPv6 `curl` examples used invalid URL syntax. IPv6 literals in URLs must be enclosed in square brackets, so I updated the examples to use bracketed addresses.
- The IPv6 address check used `ip -6 addr show | grep -v 'fe80'`, which can still include non-global addresses and unrelated lines. I replaced it with `ip -6 addr show scope global`.
- The post used `ping6`; current iputils usage is `ping -6`, which is the form documented by the tool and broadly portable on modern Linux systems. I updated those commands.
- The `/etc/hosts` append example used shell redirection directly to `/etc/hosts`, which will typically fail without elevated shell privileges. I changed it to `sudo tee -a` so the command works as shown for normal users with sudo access.
- The BIND section omitted two important correctness details: incrementing the SOA serial for file-backed zones and avoiding manual edits on dynamic zones unless using `rndc freeze`/`thaw` or `nsupdate`. I added those corrections.
- The PowerDNS example used an outdated/incorrect `pdnsutil` command form and a relative record name. Current documentation uses `pdnsutil rrset delete ZONE NAME TYPE`, and `NAME` must be absolute. I corrected the command accordingly.
- The Apache section implied that adding `Listen [::]:80` is always the right fix. Apache's official docs note platform-dependent IPv4-mapped IPv6 behavior, so I made the wording conditional for builds that use separate IPv6 sockets.
- The cache-flush comment suggested contacting major ISPs/CDNs. That is not generally a practical or reliable remediation for recursive resolver caches, so I replaced it with the accurate TTL-aging explanation.

## Review Notes
- The post is technically sound after correction, but several checks are Linux-centric. In particular, `ip6tables -L -n` is appropriate only on iptables-based hosts; nftables, firewalld, cloud security groups, or load balancer ACLs may be the real IPv6 filtering point on other deployments.
