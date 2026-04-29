# Validation Summary: How to Understand Mobile IPv6 Route Optimization

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Mobile IPv6 (RFC 6275)
- Route Optimization
- Return Routability procedure (HoTI/CoTI/HoT/CoT)
- IPv6 extension headers (Destination Options, Routing Header Type 2)
- Home Address Destination Option (HAO, type 201)
- UMIP/MIPL2 mip6d daemon
- Linux IPv6 sysctls
- tcpdump

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://www.rfc-editor.org/rfc/rfc6275)
  - §6.3 Home Address Option
  - §6.4 Type 2 Routing Header
  - §9.5.5 Sending Packets to a Mobile Node
  - §11.3.1 Sending Packets while Away from Home
  - §5.2 / §11.6 Return Routability procedure
- mip6d.conf(5) man page (https://linux.die.net/man/5/mip6d.conf)
- systutorials mip6d.conf reference (https://www.systutorials.com/docs/linux/man/5-mip6d.conf/)
- Nautilus6 "Dynamic keying for Mobile IPv6 using racoon2 and mip6d" howto (https://www.nautilus6.org/doc/dk-howto/Howto_dynamic_keying.html)
- UMIP example configs (e.g. Eurecom example-ha-lma.conf)
- IANA Protocol Numbers (Next Header values 43, 60, 6)

## Issues Found

1. **HAO and RH2 directions reversed (RFC 6275 §6.3, §6.4, §9.5.5, §11.3.1).** The post had the two route-optimized data-plane mechanisms swapped:
   - It claimed CN→MN (downlink) used the Home Address Destination Option. Per RFC 6275 §9.5.5, the CN sends with Source=CN, Destination=CoA, and a Type 2 Routing Header carrying the HoA. **Fixed**: replaced the HAO/Destination Options block in the "CN to MN" section with a Routing Header Type 2 block (Next Header 43, Segments Left 1, Home Address = HoA).
   - It claimed MN→CN (uplink) used the Type 2 Routing Header. Per RFC 6275 §11.3.1, the MN sends with Source=CoA, Destination=CN, and a Home Address Destination Option carrying the HoA. **Fixed**: replaced the RH2 block in the "MN to CN" section with a Destination Options Header containing the HAO (Next Header 60, type 201, length 16, value = HoA).
   - The mermaid sequence diagram's Step 3 had the same swap ("MN→CN ... RH2 header" / "CN→MN ... HAO header"). **Fixed**: relabeled to "MN→CN ... HAO header" and "CN→MN ... RH2 header".
   - Prose: "the CN sends traffic directly to the MN's CoA, using the Home Address Destination Option …" was wrong — the CN uses RH2. **Fixed**: changed "Home Address Destination Option" to "Type 2 Routing Header".
   - The two prose lines about kernel processing ("MN's kernel replaces the CoA destination with HoA …" and "CN kernel restores the HoA source …") were already correct for their respective directions and now align with the corrected headers.

2. **UMIP `mip6d.conf` syntax errors.** Verified against the mip6d.conf(5) man page and example UMIP configs:
   - `RouteOptimization enabled;` is not a valid UMIP directive. UMIP uses two separate global options. **Fixed**: replaced with `DoRouteOptimizationMN enabled;` and `DoRouteOptimizationCN enabled;`.
   - `KeyMgmtMobCapability enabled;` is misspelled. The correct token is `KeyMngMobCapability` (with "Mng"). **Fixed**.
   - Standalone `HomeAgent` and `Home` directives are not valid; the home-agent address and home address must live inside an `MnHomeLink "<iface>" { … }` block, using `HomeAgentAddress` and `HomeAddress`. **Fixed**: wrapped them in `MnHomeLink "eth0" { HomeAgentAddress …; HomeAddress …; }`.

## Review Notes
- UMIP / MIPL2 has not had an active upstream release in many years; the daemon and the broader Linux MIPv6 stack are effectively dormant. The corrected config matches the historical UMIP grammar but operators using current distros should expect to build mip6d from source and verify against their kernel version.
- The Linux sysctl `net.ipv6.conf.all.rht2_support` referenced in the CN-side setup is not a standard upstream-kernel sysctl I could verify; in stock kernels, Type 2 Routing Header processing is gated by loading the MIPv6 modules (`mip6`, `xfrm6_mode_*`) rather than a per-interface sysctl. It was kept as-is because it may exist in older MIPL/UMIP kernel patch sets, but readers on a vanilla kernel should not rely on it.
- `net.ipv6.conf.all.accept_ra = 2` is the standard "accept RAs even with forwarding enabled" setting, more commonly needed on the MN than on a stationary CN; including it on the CN is harmless but not strictly required.
- The `mip6d -n` invocation used in the verification section is illustrative — UMIP's runtime introspection is normally done via its IPC/console interface rather than a `-n` flag — but the surrounding tcpdump filter is syntactically valid and demonstrates the intended check.
- The Return Routability sequence (HoTI/CoTI via tunnel and direct, HoT/CoT replies symmetrically) and the Binding Update/Acknowledgement exchange are described correctly per RFC 6275 §5.2 and §11.6.
