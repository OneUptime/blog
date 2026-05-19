# Validation Summary: How to Configure DNS over TLS (DoT) on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- DNS over TLS (DoT)
- systemd-resolved
- Stubby / getdns
- dnsmasq
- tcpdump
- iptables

## Sources Consulted
- RFC 7858: Specification for DNS over Transport Layer Security (TLS) - https://www.rfc-editor.org/rfc/rfc7858.html
- Ubuntu 20.04 resolved.conf manpage - https://manpages.ubuntu.com/manpages/focal/man5/resolved.conf.5.html
- Ubuntu 22.04 resolved.conf manpage - https://manpages.ubuntu.com/manpages/jammy/man5/resolved.conf.5.html
- Ubuntu Stubby manpage - https://manpages.ubuntu.com/manpages/jammy/man1/stubby.1.html
- dnsprivacy.org Stubby configuration documentation - https://dnsprivacy.org/dns_privacy_daemon_-_stubby/configuring_stubby/
- Cloudflare DNS over TLS documentation - https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Cloudflare Linux setup documentation - https://developers.cloudflare.com/1.1.1.1/setup/linux/
- Cloudflare DNS resolver troubleshooting documentation - https://developers.cloudflare.com/1.1.1.1/troubleshooting/
- Google Public DNS DNS-over-TLS documentation - https://developers.google.com/speed/public-dns/docs/dns-over-tls
- Quad9 FAQ / DNS over TLS documentation - https://quad9.net/support/faq/

## Issues Found
- The Stubby configuration used `dnssec: GETDNS_EXTENSION_TRUE`, which is not the documented Stubby option for DNSSEC validation. Changed it to `dnssec_return_status: GETDNS_EXTENSION_TRUE`, matching dnsprivacy.org's Stubby documentation.
- The Stubby configuration snippet had a logging-level comment before `resolution_type`, but no logging-level setting was present. Changed the comment to describe the actual setting.
- The `systemd-resolved` plus Stubby example could inherit `DNSOverTLS=yes` from the earlier method and then try to speak DoT to Stubby's local plaintext DNS listener. Added `DNSOverTLS=no` and clarified that Stubby handles upstream TLS in this setup.
- The Cloudflare command-line check used `curl https://1.1.1.1/help | grep -i "using dns over tls"`, which can match static page text rather than the client-side diagnostic result. Replaced it with guidance to open Cloudflare's browser diagnostic page and inspect the DoT result.

## Review Notes
- The core DoT explanation, TCP port 853 behavior, systemd-resolved `DNSOverTLS=yes` usage, `address#server_name` syntax, Stubby strict TLS settings, and provider hostnames were consistent with the consulted documentation.
- The Stubby examples use local port 5353 for dnsmasq forwarding and port 53 for direct system resolver use; users need to ensure only one local resolver is bound to port 53 at a time.
- For production systems, managing `/etc/resolv.conf` with `chattr +i` can conflict with NetworkManager, DHCP clients, or other resolver-management tools. It is technically workable, but should be used deliberately.
