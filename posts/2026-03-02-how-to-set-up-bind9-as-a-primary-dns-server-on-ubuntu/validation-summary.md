# Validation Summary: How to Set Up BIND9 as a Primary DNS Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- BIND9 (Berkeley Internet Name Domain, version 9.18.x on Ubuntu 24.04)
- DNS protocol (forward and reverse lookup zones, SOA, NS, A, MX, TXT, CNAME, PTR records)
- Ubuntu (apt package management, systemd service management)
- UFW (firewall configuration for DNS)
- dig (DNS lookup utility)
- rndc (BIND remote name daemon control)

## Sources Consulted
- ISC BIND 9 Administrator Reference Manual (https://bind9.readthedocs.io/)
- Ubuntu package archive (packages.ubuntu.com) - verified `bind9`, `bind9-utils`, `bind9-doc`, `bind9-dnsutils` package names exist for Ubuntu 22.04/24.04
- `apt-cache show` output for bind9, bind9-utils, bind9-doc, bind9-dnsutils on Ubuntu 24.04 (verified package names, dependencies, and that bind9 depends on bind9-utils)
- RFC 1035 (DNS zone file format - SOA serial, refresh, retry, expire, minimum TTL)
- RFC 1912 (zone file best practices)
- BIND9 `options` statement reference (allow-query, allow-recursion, allow-transfer, listen-on, forwarders, dnssec-validation, querylog, also-notify)
- Ubuntu Server documentation for BIND9 (https://documentation.ubuntu.com/server/how-to/networking/install-bind9/)

## Issues Found
No technical issues found.

All elements verified as accurate:
- Package names `bind9`, `bind9-utils`, `bind9-doc` are correct for current Ubuntu (22.04/24.04). The older `bind9utils` name was replaced.
- Configuration file paths (`/etc/bind/named.conf`, `named.conf.options`, `named.conf.local`, `named.conf.default-zones`) are correct.
- `/var/cache/bind` is the correct default working directory.
- Service unit name `bind9.service` is correct on Ubuntu (rather than `named.service` used on some other distributions).
- BIND options (`listen-on`, `listen-on-v6`, `allow-query`, `allow-recursion`, `allow-transfer`, `forwarders`, `dnssec-validation auto`, `querylog`, `also-notify`) are all valid BIND9 directives.
- Zone file syntax follows RFC 1035: `$TTL` directive, SOA record with mname/rname/serial/refresh/retry/expire/minimum, NS, A, MX (with preference), TXT, CNAME, PTR records.
- `admin.example.com.` correctly represents the email address `admin@example.com` (the `@` is replaced by `.` in SOA rname).
- Serial format `YYYYMMDDNN` is a widely used convention.
- Reverse zone name `1.168.192.in-addr.arpa` is the correct reverse format for `192.168.1.0/24`.
- `named-checkconf` and `named-checkzone` are the correct validation tools, both provided by `bind9-utils`.
- `rndc reload` and `rndc reload <zone>` are correct commands.
- `dig @<server> <name> <type>` and `dig -x <ip>` syntax is correct.
- UFW rules for UDP/TCP port 53 are correct (DNS uses UDP primarily, TCP for zone transfers and large responses).

## Review Notes
- The `dig` command used in the testing section is provided by `bind9-dnsutils` (priority: standard, typically pre-installed on Ubuntu), not by the `bind9-utils` package installed in the tutorial. On most Ubuntu Server installs `dig` is already present; on minimal installs the reader may need to install `bind9-dnsutils` separately. This is not strictly an error since `bind9-dnsutils` is standard priority.
- The `recursion no;` directive shown commented out is a stylistic choice; with `allow-recursion` set to a restricted ACL, recursion is effectively restricted to those clients only, so the current setup correctly acts as a hybrid authoritative + recursive (for internal clients) server.
- The custom log directory `/var/log/named/` may require AppArmor profile adjustment on some Ubuntu systems if the default profile restricts writes outside of `/var/cache/bind/` and other allowed paths. In practice, the default Ubuntu AppArmor profile for named permits writes here, but users encountering "permission denied" errors when starting after enabling logging should check `dmesg` for AppArmor denials.
- The `bind9-utils` package is automatically pulled in by `bind9` as a dependency, so listing it explicitly in the install command is redundant but harmless.
- DNSSEC signing of the zones is not covered; the tutorial only enables `dnssec-validation` (verifying signatures of upstream zones). For a production authoritative server, signing the served zones is recommended but is a more advanced topic.
