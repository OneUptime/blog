# Validation Summary: How to Configure IPsec IPv6 with Pre-Shared Keys

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- IKEv2
- strongSwan
- Libreswan
- OpenSSL
- HashiCorp Vault

## Sources Consulted
- strongSwan `swanctl.conf` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan algorithm proposal documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan security recommendations: https://docs.strongswan.org/docs/latest/howtos/securityRecommendations.html
- strongSwan logging documentation: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan FAQ: https://docs.strongswan.org/docs/latest/support/faq.html
- strongSwan `swanctl` directory documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- strongSwan `swanctl --load-creds` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlLoadCreds.html
- strongSwan `swanctl --rekey` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlRekey.html
- Libreswan `ipsec.secrets(5)` documentation: https://libreswan.org/man/ipsec.secrets.5.html
- OpenSSL `openssl rand` documentation: https://docs.openssl.org/master/man1/openssl-rand/
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://www.rfc-editor.org/rfc/rfc7296.html

## Issues Found
- The overview incorrectly stated that the PSK derives authentication keys during IKEv2 negotiation. I changed it to say the PSK authenticates the IKEv2 exchange, which matches RFC 7296.
- The strongSwan and Libreswan examples used invalid IPv6 addresses such as `2001:db8:gw1::1` and `2001:db8:site1::/48`. I replaced them with valid documentation-prefix addresses under `2001:db8::/32`.
- The strongSwan `esp_proposals` example incorrectly included `prfsha256`, which is part of IKE proposals rather than ESP proposals. I corrected it to `aes256gcm128-ecp256` to match strongSwan proposal syntax.
- The `swanctl.conf` example used inline `!` comments that were not valid for the shown configuration format. I replaced them with standard `#` comment lines.
- The separate secrets file example pointed to `/etc/swanctl/secrets.conf`, but the default strongSwan layout includes configuration snippets from `conf.d/*.conf`. I updated the example to `/etc/swanctl/conf.d/secrets.conf`.
- The PSK identity-matching explanation implied a strict `id-1`/`id-2` pair lookup. I revised it to reflect strongSwan's documented best-match identity selection behavior.
- The debugging guidance referenced `charon.conf` and recommended level 4 logging. I updated it to `strongswan.conf` with `cfg` log level 3, which is the documented level for detailed identity-matching diagnostics.
- The PSK compromise section incorrectly claimed that compromise of the PSK alone allows decryption of previously captured traffic. I removed that claim and replaced it with impacts supported by the consulted sources: impersonation, unauthorized tunnels, and active attacks until rotation.
- The PSK rotation procedure was incorrect because ordinary IKEv2 rekeying does not re-run authentication. I replaced it with a correct workflow: update the PSK on both peers, reload credentials, then reauthenticate the IKE SA with `swanctl --rekey --ike ... --reauth`.
- The summary repeated the incorrect rotation-by-rekey advice and included an unsourced fixed 90-day interval. I updated it to describe periodic rotation via credential reload plus reauthentication without a hard-coded interval.

## Review Notes
- The post now aligns with strongSwan's `swanctl`/VICI-based IKEv2 configuration model. It should not be treated as guidance for deprecated strongSwan `ipsec.conf`-style setups.
- The log example uses `/var/log/charon.log` only when file logging is configured. On many systems, `charon` logs to syslog or to the systemd journal by default.
