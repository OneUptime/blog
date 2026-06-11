# Validation Summary: How to Create MACSec Encryption

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- IEEE 802.1AE MACsec
- IEEE 802.1X / MKA
- Linux iproute2 MACsec support
- wpa_supplicant MACsec configuration
- Cisco IOS XE MACsec configuration
- Juniper Junos MACsec configuration
- tcpdump, ethtool, iperf3, systemd

## Sources Consulted
- Linux `ip-macsec(8)` local man page and `ip macsec help`
- Linux `ip link ... type macsec` local command help
- wpa_supplicant local help, packaged example `wpa_supplicant.conf`, and installed binary strings
- Red Hat documentation: Using MACsec with wpa_supplicant and NetworkManager, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-using-macsec
- Cisco Catalyst MACsec Encryption Configuration Guide, https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/macsec/macsec-encryption-configuration-guide/macsec-encryption.html
- Cisco Catalyst 9200 MACsec Encryption Configuration Guide, https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/17-13/configuration_guide/sec/b_1713_sec_9200_cg/macsec_encryption.html
- Juniper Junos Configuring MACsec, https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/macsec.html
- Juniper Junos Understanding MACsec, https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/topic-map/understanding-macsec.html
- Juniper Junos CLI references for `show security macsec connections` and `show security mka sessions`

## Issues Found
- Fixed Linux `ip macsec` RX secure channel examples. The original commands mixed `sci` with `port` syntax. Updated them to the documented `rx port <port> address <lladdr>` form.
- Fixed the Linux static-key setup script to use local and remote MACsec ports plus the remote MAC address, instead of unused and misleading local/remote SCI arguments.
- Corrected the network requirements to say both endpoints of each secured link must support MACsec, not every device in a vague path.
- Corrected MTU wording to "up to 32 bytes" because SecTAG size varies.
- Corrected the time synchronization note: replay protection is packet-number based; time sync matters for time-based key lifetimes and rollover.
- Added `eapol_flags=0` to wpa_supplicant MACsec examples, matching the packaged configuration guidance for wired/MACsec drivers.
- Removed unsupported `macsec_ciphersuite` settings from wpa_supplicant examples and kept to documented fields available in common packaged versions.
- Corrected the `macsec_policy=1` comment to describe "should secure" behavior instead of "MKA required."
- Corrected the CKN length comment to 2-64 hex characters.
- Removed an invalid Cisco global `macsec network-link` line; the command belongs on the interface in the shown switch-to-switch example.
- Corrected Cisco `sak-rekey-interval` to the documented `sak-rekey interval` syntax.
- Updated Junos interface binding from the obsolete/incorrect `ether-options 802.1ae connectivity-association` form to `set security macsec interfaces ... connectivity-association`.
- Added the missing Junos dynamic connectivity association definition before binding it to the 802.1X MACsec interface.
- Replaced unsupported example `wpa_cli status` MACsec fields with `ip macsec show` verification indicators.
- Corrected the comparison table entry that described TLS/SSL as "TCP only"; modern TLS usage is application/transport dependent.

## Review Notes
Some vendor MACsec command availability varies by platform, license, and software train. The Cisco and Juniper examples now match current vendor documentation patterns, but production deployments should still be checked against the exact device model and OS release.
