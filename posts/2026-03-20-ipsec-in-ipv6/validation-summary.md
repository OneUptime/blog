# Validation Summary: How to Understand IPsec in IPv6

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6
- IPsec
- Authentication Header (AH)
- Encapsulating Security Payload (ESP)
- IKEv2
- strongSwan `swanctl.conf`
- Linux XFRM / `ip xfrm`

## Sources Consulted
- RFC 4294, "IPv6 Node Requirements": https://www.rfc-editor.org/rfc/rfc4294.html
- RFC 4301, "Security Architecture for the Internet Protocol": https://www.rfc-editor.org/rfc/rfc4301
- RFC 4302, "IP Authentication Header": https://www.rfc-editor.org/rfc/rfc4302.html
- RFC 4303, "IP Encapsulating Security Payload (ESP)": https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 6434, "IPv6 Node Requirements": https://www.rfc-editor.org/rfc/rfc6434
- RFC 7296, "Internet Key Exchange Protocol Version 2 (IKEv2)": https://www.rfc-editor.org/rfc/rfc7296.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 8504, "IPv6 Node Requirements": https://www.rfc-editor.org/rfc/rfc8504.html
- strongSwan documentation, "swanctl.conf": https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan documentation, "Algorithm Proposals (Cipher Suites)": https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan documentation, "Linux Kernel Modules": https://docs.strongswan.org/docs/latest/install/kernelModules.html
- Local `ip xfrm` CLI help output from the installed `iproute2` tool

## Issues Found
- The post attributed IPv6's historical mandatory IPsec support to RFC 2460. The mandatory requirement actually came from RFC 4294 for IPv6 nodes, so I corrected the RFC reference and updated the explanation of what RFC 6434 changed.
- The RFC 6434 summary overstated AH support as `SHOULD`. RFC 6434 and the current node requirements in RFC 8504 make support for the IPsec architecture a `SHOULD`, require `ESP` if IPsec is implemented, and leave `AH` as `MAY`. I corrected that wording in the body and summary.
- The header-chain placement table was too specific and omitted the role of the Fragment header. I adjusted the positioning text to match RFC 4302/RFC 4303 guidance for IPv6 packet layout.
- The Linux command example used `ip xfrm state`, which is not the correct inspection command, and it suggested loading `xfrm*_mode_transport` modules that are not generally the right modern check. I replaced that block with valid `ip xfrm ... list` commands and a safer module-inspection example consistent with current strongSwan kernel guidance.
- The IPv6 SA example filtered `ip xfrm` output with `grep '::'`, which is unreliable because IPv6 addresses are not guaranteed to be rendered with compressed notation. I replaced it with the valid family-specific `ip -6 xfrm state list` command.
- The strongSwan `esp_proposals` example mixed IKEv2 PRF syntax into an ESP proposal and used the wrong AES-GCM keyword. I corrected it to a valid CHILD_SA proposal string.
- The AH explanation said the Flow Label may change in transit and implied the destination address with a Routing Header was simply unauthenticated. RFC 4302 is more specific: the Flow Label is excluded from AHv2 for compatibility reasons, and the destination address with a Routing Header is treated as mutable but predictable. I corrected that explanation.

## Review Notes
- RFC 8504 (2019), which obsoletes RFC 6434, retains the same high-level requirement model used in the corrected post: support for the IPsec architecture is `SHOULD`, with `ESP` required and `AH` optional when IPsec is implemented.
- In practice, `ip xfrm state list` and `ip -6 xfrm state list` often require root or `CAP_NET_ADMIN`, so the added `sudo` is intentional.
