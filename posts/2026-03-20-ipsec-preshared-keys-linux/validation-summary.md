# Validation Summary: How to Configure IPsec with Pre-Shared Keys on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- strongSwan
- IPsec / IKEv2
- Pre-shared keys (PSK)
- Linux CLI and configuration files
- systemd journal inspection

## Sources Consulted
- strongSwan Documentation, Introduction to strongSwan: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Documentation, What’s New in strongSwan 6.0: https://docs.strongswan.org/docs/latest/news/whatsNew.html
- strongSwan Documentation, Logging: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan Documentation, Security Recommendations: https://docs.strongswan.org/docs/latest/howtos/securityRecommendations.html
- strongSwan official source, `ipsec.secrets(5)`: https://raw.githubusercontent.com/strongswan/strongswan/master/man/ipsec.secrets.5.in
- strongSwan official source, `ipsec.conf(5)`: https://raw.githubusercontent.com/strongswan/strongswan/master/man/ipsec.conf.5.in
- strongSwan official source, `ipsec(8)`: https://raw.githubusercontent.com/strongswan/strongswan/master/src/ipsec/_ipsec.8.in
- strongSwan official source, legacy README: https://raw.githubusercontent.com/strongswan/strongswan/master/README_LEGACY.md
- strongSwan official source, `stroke` CLI keywords: https://raw.githubusercontent.com/strongswan/strongswan/master/src/stroke/stroke_keywords.txt
- Local `journalctl --help` output on the review host, used to verify repeated `-u` unit filters

## Issues Found
- The post used `%any %any : PSK "..."` as the "any peer" example. In current strongSwan, a selector-less `: PSK "..."` entry is the wildcard form, so I corrected the example and clarified that the selectors are optional.
- The example output shown for `openssl rand -base64 32` was too short for 32 random bytes encoded as Base64. I replaced it with an output of the correct length and clarified the recommendation.
- The post implied that two different PSKs for the same selector pair can coexist during rotation. strongSwan's `ipsec.secrets` matching rules do not support overlapping different PSKs for the same best-match selectors, so I replaced the rotation steps with a coordinated replace/reload/reconnect procedure.
- The post presented the legacy `ipsec.conf` / `ipsec.secrets` / `ipsec` workflow without noting that it is deprecated in strongSwan 6.x and may not be built by default. I added a short caveat so current readers are not misled.
- The verification section relied on `ipsec stroke loglevel ike 3`. Because the `stroke` backend is deprecated and not enabled by default in strongSwan 6.x, I replaced that guidance with `ipsec statusall` plus log inspection via `journalctl` on systemd-based installs.

## Review Notes
- The `ipsec.conf` connection example is valid for strongSwan's legacy stroke-based backend, including `keyexchange=ikev2`, `leftauth=psk`, `rightauth=psk`, `type=tunnel`, and the `ike` / `esp` proposal syntax.
- The post still intentionally documents the deprecated legacy backend because that is the configuration style shown. New strongSwan deployments should generally use `swanctl.conf` and `swanctl` instead.
- The cipher proposal shown is acceptable, but strongSwan's current security recommendations discuss stronger modern defaults and emphasize avoiding weak algorithms.
