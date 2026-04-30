# Validation Summary: How IPv6 Works on 5G Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 5G / 3GPP 5GS
- PDU Sessions
- SLAAC
- Router Advertisement
- DHCPv6
- Open5GS
- Android `adb`
- Linux networking tools (`ip`, `ping`, `nmcli`, `mmcli`)

## Sources Consulted
- 3GPP TS 24.501, NAS protocol for 5GS, IP address allocation and PDU session establishment semantics: https://www.etsi.org/deliver/etsi_ts/124500_124599/124501/19.06.02_60/ts_124501v190602p.pdf
- 3GPP TS 23.502, PDU Session Establishment procedure and IPv6 Router Advertisement delivery: https://www.etsi.org/deliver/etsi_ts/123500_123599/123502/19.06.00_60/ts_123502v190600p.pdf
- 3GPP TS 23.501, 5GS architecture and PDU session type definitions: https://www.etsi.org/deliver/etsi_ts/123500_123599/123501/16.14.00_60/ts_123501v161400p.pdf
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 7066, IPv6 for 3GPP Cellular Hosts: https://www.rfc-editor.org/rfc/rfc7066
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- Open5GS official `smf.yaml.in`: https://raw.githubusercontent.com/open5gs/open5gs/main/configs/open5gs/smf.yaml.in
- Open5GS official `upf.yaml.in`: https://raw.githubusercontent.com/open5gs/open5gs/main/configs/open5gs/upf.yaml.in
- Open5GS infoAPI documentation: https://open5gs.org/open5gs/docs/tutorial/07-infoAPI-UE-gNB-session-data/
- Open5GS IPv6 TUN setup documentation: https://open5gs.org/open5gs/docs/platform/01-debian-ubuntu/
- ModemManager bearer reference: https://www.freedesktop.org/software/ModemManager/doc/latest/ModemManager/gdbus-org.freedesktop.ModemManager1.Bearer.html
- ModemManager IP connectivity notes: https://modemmanager.org/docs/modemmanager/ip-connectivity-setup-in-lte-modems/
- Local CLI help/output checked for `ip` (iproute2 6.1.0), `ping` (iputils 20240117), `nmcli`, and `mmcli`

## Issues Found
- The post said the SMF sent Router Advertisements to the UE via `N1` and implied the PDU Session Establishment Accept carried a full global IPv6 `/64`. I corrected this to match 3GPP: the SMF allocates the IPv6 prefix and link-local interface identifier, the PDU Session Establishment Accept carries the link-local identifier, and the IPv6 Router Advertisement is sent via the UPF in the normal case.
- The IPv6 address assignment section treated stateful DHCPv6 `/128` addressing as a standard 5G UE flow. I replaced that with the standard `/64` SLAAC model, kept stateless DHCPv6 for additional parameters such as DNS, and clarified that delegated prefixes are optional RG/downstream use cases.
- Several sample IPv6 literals were syntactically invalid because they used non-hexadecimal hextets such as `5g`, `ue1`, `slice1`, and `smf`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The architecture sketch incorrectly flattened the 5G reference points. I updated it so `N2` represents the control path toward the AMF/SMF, `N3` represents the user plane toward the UPF, and `N4` is the SMF-UPF interface.
- The Open5GS `smf.yaml` snippet used outdated or incorrect keys such as `addr` and `subnet`, omitted the current `server`/`session` structure, and used invalid IPv6 control-plane literals. I updated the snippet to match the current official Open5GS configuration layout.
- The monitoring example used `http://127.0.0.100:7777/v1/sessions`, which is not a documented Open5GS session endpoint. I replaced it with the documented `/pdu-info` infoAPI endpoint on the SMF metrics port and noted that this API is documented for recent `main` builds.
- The Linux verification commands were too vague for checking IPv6 state and overstated exact `mmcli` bearer field names. I changed the `nmcli` example to inspect `IP6.*` device details directly and made the ModemManager bearer comment match the official bearer documentation more closely.

## Review Notes
- Open5GS documents `/pdu-info` in the tutorial published on April 13, 2026, and notes that it requires a recent `main` build; packaged releases may not expose that endpoint yet.
- The CLI examples were reviewed for syntax, but no live 5G UE, modem, or Open5GS runtime was available in this workspace for end-to-end execution.
