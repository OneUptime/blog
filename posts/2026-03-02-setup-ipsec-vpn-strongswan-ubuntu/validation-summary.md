# Validation Summary: How to Set Up IPsec VPN with strongSwan on Ubuntu

## Status
validated

## Post Type
Tutorial / step-by-step setup guide

## Technologies Covered
- strongSwan (IPsec implementation)
- IKEv2 protocol
- X.509 PKI (CA, server and client certificates)
- Ubuntu 22.04 / 24.04
- iptables, netfilter-persistent, UFW
- EAP-MSCHAPv2 authentication
- NetworkManager-strongSwan (nmcli)
- OpenSSL PKCS#12 bundle generation
- systemd (strongswan-starter.service)

## Sources Consulted
- strongSwan documentation / wiki: https://docs.strongswan.org/ and https://wiki.strongswan.org/
- strongSwan `ipsec pki` reference (commands, `--san`, `--flag` options)
- strongSwan `ipsec.conf` reference (connection options, cipher proposal syntax)
- strongSwan IKE/ESP proposal keyword registry (aes256gcm16, prfsha384, ecp384)
- Ubuntu packages on packages.ubuntu.com (`strongswan`, `strongswan-pki`, `libcharon-extra-plugins`, `libcharon-extauth-plugins`, `libstrongswan-extra-plugins`, `network-manager-strongswan`, `iptables-persistent`)
- `ipsec` script command list (start/stop/status/statusall/listcerts/listsas/reload/rereadsecrets/up/down)
- UFW manual pages (`ufw allow proto esp`, `ufw route allow`)
- NetworkManager-strongSwan VPN plugin keys (`address`, `certificate`, `method`, `user`, `virtual`)

## Issues Found

1. **Duplicate `rightsourceip=10.10.10.0/24` in the roadwarrior connection.** The directive appeared twice (once near the top of the conn block and again at the bottom under "Assign VPN IP from pool"). strongSwan would accept this but the duplication is clearly an editing leftover. Removed the second occurrence.

2. **`sudo ipsec verify` is not a strongSwan command.** `ipsec verify` belongs to Openswan / Libreswan and does not exist in strongSwan's `ipsec` script (which provides `start`, `stop`, `status`, `statusall`, `listcerts`, `listsas`, `reload`, `rereadsecrets`, etc.). Running it on a strongSwan install fails with an unknown-command error. Removed the line and its comment.

3. **`--san "@203.0.113.1"` is incorrect for an IP SAN.** In strongSwan's `pki --issue`, the `--san` value is auto-classified by content (DNS name, email, IP, URI). An IP address must be supplied verbatim (`203.0.113.1`); the `@` prefix is used to denote an identifier type in `leftid`/`rightid`, not in SANs, and would be encoded as a non-IP identity. Changed to `--san "203.0.113.1"`.

4. **Misleading comment on `strictcrlpolicy=no`.** The original said "Enable strict CISCO IPsec compliance," which has nothing to do with this option. `strictcrlpolicy` controls whether a CRL fetch failure aborts a connection. Rewrote the comment to "Allow connections even if CRL fetch fails."

5. **Comment on `uniqueids=no` was inverted.** The text said "Enable unique IDs" but `uniqueids=no` does the opposite — it allows multiple concurrent connections sharing the same identity. Rewrote the comment accordingly.

6. **Mislabelled "Show security associations" header above `ipsec listcerts`.** `listcerts` shows loaded X.509 certificates, not security associations. Split the comment so each command has the correct label (`listcerts` → certificates, `listsas` → SAs).

## Review Notes

- The ESP proposal `esp=aes256gcm16-sha384!` is functional but stylistically odd. With AEAD ciphers (AES-GCM, AES-CCM, ChaCha20-Poly1305), strongSwan ignores any integrity algorithm specified in the proposal, and no PFS DH group is given. A cleaner equivalent would be `esp=aes256gcm16-ecp384!` to make PFS explicit and match the IKE proposal. Left as-is because it parses and works.
- `authby=rsasig` in `conn %default` is an accepted alias for `pubkey` in strongSwan; works fine for IKEv2. Modern configurations tend to prefer `authby=pubkey`.
- Windows 10/11 native IKEv2 clients have historically been restrictive about AEAD cipher support. The proposal in this guide (`aes256gcm16-sha384-prfsha384-ecp384!`) does work on current Windows builds, but operators occasionally need to add CBC-based fallbacks (e.g., `aes256-sha256-modp2048`) for older clients. Worth keeping in mind if connection negotiation fails from Windows.
- The guide mixes raw `iptables` rules (for NAT/MASQUERADE) with UFW rules (for filter). This is functional but unconventional on UFW-managed systems; the cleaner approach is to add the MASQUERADE rule to `/etc/ufw/before.rules`. Left unchanged as it works as written.
- `rekey=no` on a roadwarrior connection is unusual (typically you'd want rekeying enabled), but it is a valid choice and not technically wrong.
- The `strongswan-starter.service` unit is the correct legacy unit that consumes `/etc/ipsec.conf` on Ubuntu 22.04 and 24.04. The newer `strongswan-swanctl` unit uses `/etc/swanctl/` and is not what this guide configures, so the service name is right for this configuration style.
