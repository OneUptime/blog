# Validation Summary: How to Set Up IPsec VPN for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS
- IPsec (IKEv2)
- Site-to-site VPN
- Pre-shared key authentication
- AES-256-CBC encryption, SHA-256 authentication, DH group modp2048

## Sources Consulted
- MikroTik official IPsec documentation: https://help.mikrotik.com/docs/display/ROS/IPsec
- MikroTik wiki examples for site-to-site IPsec configurations
- RouterOS CLI parameter references for `/ip ipsec proposal`, `/ip ipsec profile`, `/ip ipsec peer`, `/ip ipsec identity`, `/ip ipsec policy`, and `/ip firewall nat`

## Issues Found
1. **Phase 1 / Phase 2 terminology was reversed.** In MikroTik RouterOS, `/ip ipsec profile` configures Phase 1 (IKE) parameters, and `/ip ipsec proposal` configures Phase 2 (IPsec/ESP) parameters. The introduction described "Phase 1 (IKE) proposals, Phase 2 (IPsec) profiles" — that is backwards. The inline comments in the Router A config block also labeled `/ip ipsec proposal` as "IKE Phase 1 proposal" and `/ip ipsec profile` as "IPsec Phase 2 profile". Fixed the introduction wording, swapped the comments, and reordered the two commands so the natural order (Phase 1 first, then Phase 2) is preserved in both Router A and Router B blocks. The actual command parameters were already correct — only the labeling/order needed to change.
2. **Missing `peer=` in the IPsec policy.** RouterOS IKE-managed static policies need to be bound to a specific peer with the `peer=` parameter so that SA negotiation is triggered against the right remote endpoint. Added `peer=SITE-B` to Router A's policy and `peer=SITE-A` to Router B's policy.

## Review Notes
- The proposal name `IKE-PROPOSAL` is slightly misleading because `/ip ipsec proposal` is Phase 2 (IPsec/ESP), not IKE — but it's just a user-supplied name, so it works as written.
- The default Phase 2 lifetime in RouterOS is 30 minutes; the Phase 1 lifetime in `profile` is set to `1h` here, which is reasonable. The policy's Phase 2 lifetime is left at default — fine for the tutorial scope.
- `place-before=0` is correct syntax to insert the NAT exemption rule at the top of the chain.
- For production use, the author should also add firewall filter rules to allow ESP (protocol 50), UDP/500 (IKE), and UDP/4500 (NAT-T) on the WAN interface; that's beyond the scope of the tutorial but worth noting.
