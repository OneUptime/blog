# Validation Summary: How to Configure Split-Horizon DNS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step infrastructure configuration)

## Technologies Covered
- BIND9 (named) DNS server — views, ACLs, zone files, rndc, named-checkconf/named-checkzone
- dnsmasq (alternative DNS approach)
- DNS concepts — split-horizon/split-brain DNS, SOA/NS/A/MX/CNAME/TXT/SRV/PTR/CAA records, DNSSEC, reverse DNS
- Ubuntu 20.04/22.04/24.04
- UFW and iptables firewall configuration
- OneUptime (monitoring, promotional section)

## Sources Consulted
- BIND 9 Administrator Reference Manual — views and zone placement (ISC) — https://bind9.readthedocs.io/
- ISC Knowledge Base, "Understanding views in BIND 9" — https://kb.isc.org/docs/aa-00851
- Zytrax DNS BIND book, view clause chapter — https://www.zytrax.com/books/dns/ch7/view.html
- dnsmasq man page (The Kelleys) — https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Ubuntu package index for bind9utils / bind9-utils (noble 24.04) — https://packages.ubuntu.com/bind9utils
- RFC 1918 (private address ranges) and general DNS RR syntax references

## Issues Found

1. **Zones defined outside views (would prevent BIND from loading).**
   The `named.conf` snippet included `named.conf.default-zones` at the top
   level while `named.conf.local` defines `view` statements. Modern BIND 9
   refuses such a configuration with "when using 'view' statements, all
   zones must be in views" — `named-checkconf` would fail and the server
   would not start. Fixed by removing the top-level
   `include "/etc/bind/named.conf.default-zones";` (replaced with an
   explanatory note) and adding the same include inside the **external**
   view (the internal view already included it), so the default zones now
   live inside every view as BIND requires.

2. **Invalid `interface-name` syntax in the dnsmasq config.**
   The post used `interface-name=intranet.example.com,eth0,192.168.1.50`
   (and a similar `gitlab` line). The dnsmasq `interface-name` directive
   takes only `<name>,<interface>` — it does not accept an IP address as a
   third field; the returned address is read from the named interface.
   The extra IP field would cause `dnsmasq --test` to fail. Fixed the two
   lines to valid `interface-name=<name>,<interface>` form and corrected
   the accompanying comment to describe the directive's actual behavior,
   pointing readers to the `addn-hosts` file for fixed internal IPs.

## Review Notes
- The rest of the BIND9 material checks out: `acl`, `match-clients`,
  per-view `recursion`/`allow-query`/`allow-query-cache`,
  `dnssec-validation auto`, `forwarders`, `rate-limit { responses-per-second; window; }`,
  `querylog yes`, `version`, and the performance options
  (`max-cache-size`, `cleaning-interval`, `recursive-clients`,
  `tcp-clients`, `empty-zones-enable`) are all valid directives. Zone-file
  RRs (SOA/NS/A/MX/CNAME/TXT/SRV/PTR/CAA) are syntactically correct.
- `bind9utils` is a transitional package that still resolves to
  `bind9-utils` on 20.04/22.04/24.04, so the install command works on all
  versions claimed.
- The `acl "external-networks"` block is defined but never referenced by a
  view; it's harmless and was left as illustrative.
- Caveat (not a code error, left as-is to avoid restructuring): the
  "Two-Instance Split-Horizon" dnsmasq section drops `external.conf` into
  `/etc/dnsmasq.d/`, which is read by the *same* dnsmasq instance rather
  than spawning a second one. To truly run two instances you need separate
  config files launched as distinct services (e.g. systemd units with
  `--conf-file`), otherwise the internal and external hosts files merge
  into one instance. Worth a future clarification.
- The dnsmasq `localise-queries` interface-based approach and the BIND
  views approach both correctly implement split-horizon; the guide's core
  technique is sound.
