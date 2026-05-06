# Validation Summary: How to Configure DNS over QUIC with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS over QUIC (DoQ)
- IPv6
- AdGuard Home
- dnsdist
- TLS certificates
- OpenSSL
- Certbot
- kdig
- q
- Android Private DNS
- systemd-resolved
- Firefox DoH
- OneUptime port monitoring

## Sources Consulted
- RFC 9250: DNS over Dedicated QUIC Connections — https://www.rfc-editor.org/rfc/rfc9250
- AdGuard Home configuration reference — https://github.com/AdguardTeam/Adguardhome/wiki/Configuration
- dnsdist DoQ guide — https://www.dnsdist.org/guides/dns-over-quic.html
- dnsdist configuration reference (`addDOQLocal`) — https://www.dnsdist.org/reference/config.html
- dnsdist access control guide — https://www.dnsdist.org/advanced/acl.html
- Knot DNS `kdig` manual — https://www.knot-dns.cz/docs/3.4/html/man_kdig.html
- Knot DNS DoQ configuration guide — https://www.knot-dns.cz/docs/3.4/html/configuration.html
- systemd `resolved.conf` documentation — https://www.freedesktop.org/software/systemd/man/257/resolved.conf.d.html
- Android Developers secure DNS guidance — https://developer.android.com/privacy-and-security/risks/bad-dns?hl=en
- Android `DevicePolicyManager` reference (`privateDnsHost`) — https://developer.android.com/reference/android/app/admin/DevicePolicyManager
- Firefox DNS over HTTPS help — https://support.mozilla.org/en-US/kb/firefox-dns-over-https
- Certbot user guide / manpage — https://eff-certbot.readthedocs.io/en/stable/using.html and https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- OneUptime Port Monitor docs — https://oneuptime.com/docs/monitor/port-monitor

## Issues Found
- The post mixed DoQ ports `784` and `853`. RFC 9250 specifies UDP port `853` as the default DoQ port, current AdGuard Home documentation lists `port_dns_over_quic` defaulting to `853`, and dnsdist examples also use `853`. I updated the description, AdGuard Home config, dnsdist config, test URI, and firewall rule to use `853`.
- The AdGuard Home comment claimed `784` was the default DoQ port. I corrected the comment to reflect the standard/default port `853`.
- The dnsdist section labeled `addLocal("[::1]:53")` as a “Plain DNS backend”, but `addLocal` creates a listener, not a backend server. I corrected the comment to “Optional plain DNS listener on localhost”.
- The `q` install command pointed to the wrong repository (`github.com/nicowillis/q`). I corrected it to the documented DoQ-capable client at `github.com/natesales/q` and fixed the example query syntax.
- The `curl` example was not a DoQ test and was mislabeled as an AdGuard Home CLI test. I removed it and left verified DoQ client examples with `q` and `kdig`.
- The latency comparison marked generic `DoQ (QUIC+TLS)` as `0rtt: True`, which is inaccurate for initial connections. I changed it to `False` and clarified that 0-RTT applies to resumed sessions.
- The Android client note implied future DoQ support in Private DNS settings. Official Android documentation describes Private DNS in terms of DNS-over-TLS, so I corrected the note to say Private DNS uses DoT, not DoQ.
- The `systemd-resolved` note claimed experimental DoQ support with systemd 255+. Current systemd documentation exposes `DNSOverTLS=` but not DoQ client configuration, so I corrected the note to reflect DoT support only.
- The Firefox note was tightened to the documented DoH capability instead of implying native DoQ support.
- The conclusion suggested OneUptime offered “UDP/TLS checks” for this use case. OneUptime’s official monitor types document UDP port checks, so I corrected the wording to “UDP port checks”.

## Review Notes
- `kdig` DoQ queries to an IP literal use opportunistic authentication unless you also configure certificate validation or pinning; this is consistent with Knot DNS documentation.
- `certbot certonly --standalone -d dns.example.com` is valid, but the standalone plugin requires ACME validation reachability on port `80` or `443` depending on challenge mode and may require stopping conflicting listeners during issuance or renewal.
