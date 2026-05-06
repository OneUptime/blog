# Validation Summary: How to Configure DNS-over-HTTPS (DoH) with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS-over-HTTPS (DoH)
- IPv6
- dnsdist
- CoreDNS
- Unbound
- Firefox
- curl
- dig
- kdig
- DNS SVCB service discovery

## Sources Consulted
- RFC 8484: DNS Queries over HTTPS (DoH) - https://datatracker.ietf.org/doc/html/rfc8484
- CoreDNS `tls` plugin documentation - https://coredns.io/plugins/tls/
- CoreDNS `bind` plugin documentation - https://coredns.io/plugins/bind/
- dnsdist official documentation PDF - https://dnsdist.org/dnsdist.pdf
- Unbound DNS-over-HTTPS documentation - https://unbound.docs.nlnetlabs.nl/en/latest/topics/privacy/dns-over-https.html
- Unbound `unbound.conf(5)` documentation - https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- RFC 9460: Service Binding and Parameter Specification via the DNS (SVCB and HTTPS Resource Records) - https://datatracker.ietf.org/doc/html/rfc9460
- RFC 9461: Service Binding Mapping for DNS Servers - https://datatracker.ietf.org/doc/html/rfc9461
- RFC 9462: Discovery of Designated Resolvers - https://datatracker.ietf.org/doc/html/rfc9462
- Google Public DNS DoH documentation - https://developers.google.com/speed/public-dns/docs/doh/
- Google Public DNS secure transports overview - https://developers.google.com/speed/public-dns/docs/secure-transports
- Knot DNS `kdig` manual - https://knot.pages.nic.cz/knot-dns/master/html/man_kdig.html
- Local `curl --help all` output
- Local `man dig`

## Issues Found
- The CoreDNS example used `.:443`, which is not the documented DoH listener syntax. I changed it to `https://.:443` to match CoreDNS's DoH configuration model.
- The Firefox client example used an invalid placeholder inside an IPv6 literal URL and omitted the TLS requirement for IP-literal HTTPS. I replaced it with a hostname example and clarified that bracketed IPv6 literals require a certificate valid for the IP address.
- The `curl` examples mixed Google's JSON-style query parameters with RFC 8484 media types. I replaced them with standard DoH GET and POST examples that use `application/dns-message`, the `dns=` parameter for GET, and binary wire-format POST bodies.
- The Python snippet produced standard Base64 and described the wire format as simplified. I changed it to generate a minimal valid DNS wire-format query and output Base64URL without padding, which is what DoH GET requires.
- The Unbound section claimed Unbound could forward to DoH upstreams using `forward-tls-upstream`. That setting is for DNS-over-TLS, not DoH. I replaced the section with a downstream DoH server configuration using `tls-service-key`, `tls-service-pem`, and `http-endpoint`.
- The testing section used an invalid direct `dig` DoH syntax and an HTTPS request to a raw IPv6 literal without matching certificate context. I replaced those with supported `curl`, `kdig`, and `dig` examples that use the `dns.google` hostname over IPv6.
- The service discovery section cited RFC 9462 alone and used an incorrect `_dns.example.com HTTPS` example. I corrected it to an SVCB-based DoH advertisement aligned with RFCs 9460, 9461, and 9462.
- The summary implied that clients should generally connect to bracketed IPv6 literal URLs. I updated it to prefer hostnames with AAAA records and noted the certificate requirement for literal IPv6 URLs.

## Review Notes
- Unbound's DoH support is downstream and requires TLS plus HTTP/2 support; the official documentation notes the `nghttp2` dependency.
- The `dig` DoH syntax used in the corrected post depends on a version that supports `+https` (the post already scopes this to `dig 9.18+`).
