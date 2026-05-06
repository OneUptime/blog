# Validation Summary: How to Check Your Public IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- NAT and carrier-grade NAT (CGNAT)
- DNS lookups with `dig`
- HTTP-based IP discovery with `curl`
- Python `urllib.request`
- Linux `iproute2` (`ip addr show`)
- Cisco IOS interface inspection
- Cloud public/private IP mapping

## Sources Consulted
- RFC 1918: Address Allocation for Private Internets — https://www.rfc-editor.org/rfc/rfc1918
- RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space — https://www.rfc-editor.org/rfc/rfc6598
- curl man page (`--ipv4`) — https://curl.se/docs/manpage.html
- Python `urllib.request` documentation — https://docs.python.org/3/library/urllib.request.html
- ipify API documentation — https://www.ipify.org/
- IPinfo API documentation — https://ipinfo.io/developers/ipinfo-api
- IPinfo developer resource — https://ipinfo.io/developers
- Cisco Umbrella documentation referencing `myip.opendns.com` — https://support.umbrella.com/hc/en-us/articles/360001200783-How-to-Dynamic-Networks-and-PowerShell
- `dig` command reference (`-4`, `+short`) — https://docs.oracle.com/cd/E19253-01/816-5166/dig-1m/index.html
- Linux `ip-address(8)` reference — https://www.man7.org/linux/man-pages/man8/ip-address.8.html
- AWS EC2 public/private IPv4 mapping documentation — https://docs.aws.amazon.com/us_en/AWSEC2/latest/UserGuide/working-with-ip-addresses.html
- ifconfig.me CLI examples — https://ifconfig.me/
- ipecho service page — https://ipecho.net/
- Live validation of `https://icanhazip.com/` and `dig -4 +short o-o.myaddr.l.google.com @ns1.google.com TXT` on 2026-05-06

## Issues Found
- Several `curl` and `dig` examples were not IPv4-specific. On dual-stack hosts they can return IPv6, which is incorrect for a post specifically about public IPv4. I added `-4` to the affected `curl` and `dig` examples, switched the `ipinfo` shell example to `/json`, and updated the OpenDNS example to use the documented resolver IP.
- The Python geolocation example could report details for a different address family than the IPv4 returned by `get_public_ip()`. I changed `get_public_ip_info()` to accept the fetched IPv4 and query `https://ipinfo.io/{ip}/json` so the metadata matches the same IPv4.
- The explanation of local vs public IP overstated that the router WAN always holds the public address. I added a CGNAT note so the post remains correct when the router WAN uses shared/private space.
- The WAN-interface section implied that a cloud VM's public IPv4 is normally visible in `ip addr show`. I corrected this to note that many cloud providers map public/Elastic IPv4 through NAT and do not expose it on the guest interface.
- The Linux WAN comment said to look for a “non-RFC1918” address, which can still include non-public shared space such as `100.64.0.0/10`. I changed that wording to “globally routable IPv4 address.”

## Review Notes
- The IPinfo examples use the legacy `ipinfo.io` API shape, which IPinfo still documents as supported, but new integrations are generally steered toward `api.ipinfo.io` with tokens.
- The Google TXT lookup returns the IPv4 in quotes because it is a TXT record; the post now states that explicitly.
- `show ip interface brief` is syntactically valid on Cisco IOS, but whether it reveals the internet-facing public IPv4 depends on the device actually holding that address.
