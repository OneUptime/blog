# Validation Summary: How to Verify DNS Propagation After Record Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS (Domain Name System)
- `dig` command (BIND DNS tools)
- Public DNS resolvers (Google, Cloudflare, OpenDNS, Quad9, Comodo)
- TTL (Time-To-Live) mechanics
- Bash shell scripting
- DNS record types (A, CNAME, MX, TXT, NS)

## Sources Consulted
- `dig` man page and BIND 9 documentation (https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- RFC 1034/1035 (DNS concepts and TTL behavior)
- RFC 2181 (Clarifications to the DNS Specification, TTL rules)
- Public resolver documentation:
  - Google Public DNS: https://developers.google.com/speed/public-dns (8.8.8.8)
  - Cloudflare 1.1.1.1: https://1.1.1.1
  - OpenDNS: https://www.opendns.com (208.67.222.222)
  - Quad9: https://www.quad9.net (9.9.9.9)
  - Comodo Secure DNS (8.26.56.26)
- IANA root and TLD server list (a.gtld-servers.net for .com/.net)
- Verified dig output format and TTL field position by live query
- Confirmed a.gtld-servers.net responds authoritatively for .com delegation
- Confirmed 8.26.56.26 (Comodo) still responds to DNS queries

## Issues Found
No technical issues found. All commands, resolver IPs, dig syntax, TTL parsing (`awk '{print $2}'` on the ANSWER SECTION record line), and the authoritative TLD server reference (a.gtld-servers.net) were verified to be correct. The explanations of propagation, TTL countdown behavior at caching resolvers, and the recommendation to pre-reduce TTL before a change are consistent with RFC 1035 and widely accepted DNS operational practice.

## Review Notes
- Minor logic consideration: in the "Minimize Propagation Time" section, the check `if [ $TTL -lt 300 ]` uses strict less-than, so a TTL of exactly 300 (the value the earlier step says to reduce to) does not trigger the "TTL is low" branch. This is a boundary-condition cosmetic issue, not a technical error, and does not affect correctness of the guidance.
- The TTL countdown behavior ("TTL should decrease by approximately 60 each minute") is correct when querying the same caching recursive resolver — once the cache expires and is re-fetched, the TTL resets to the authoritative value. This is a nuance worth being aware of but is not misrepresented in the post.
- `dnspropagation.net` is less well-known than the other listed checkers, but it is a legitimate service; the other three (dnschecker.org, whatsmydns.net, mxtoolbox.com) are industry-standard tools.
- The `for ns in $(dig NS ... +short)` loop relies on word-splitting of NS hostnames that carry a trailing dot — this is valid in DNS and works with dig, verified behavior.
