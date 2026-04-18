# Validation Summary: How to Understand ISATAP

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- ISATAP (Intra-Site Automatic Tunnel Addressing Protocol)
- IPv6 / IPv4 transition mechanisms
- IP protocol 41 (IPv6-in-IPv4 encapsulation)
- Windows PowerShell `NetworkTransition` module (`Set-NetIsatapConfiguration`, `Get-NetIsatapConfiguration`, `New-NetIPAddress`, `Set-NetIPInterface`, `Install-WindowsFeature`)
- Windows `netsh interface isatap`
- Linux `sit` tunnel module
- DNS A records for ISATAP router auto-discovery
- Wireshark display filters

## Sources Consulted
- RFC 5214 — "Intra-Site Automatic Tunnel Addressing Protocol (ISATAP)", Section 6.1 (IID format, u-bit semantics)
- RFC 4291 — "IPv6 Addressing Architecture" (Modified EUI-64 format)
- RFC 7059 — "A Comparison of IPv6-over-IPv4 Tunnel Mechanisms"
- Microsoft Learn — `Set-NetIsatapConfiguration` / `Get-NetIsatapConfiguration` cmdlet references (Windows Server 2022 PowerShell module docs)
- `ip-tunnel(8)` man page for `mode sit` / ISATAP support in Linux
- IANA Protocol Numbers registry (protocol 41 = IPv6 encapsulation)

## Issues Found

1. **Overstated deprecation claim in the Overview.**
   - Was: "It is now deprecated and removed from modern Windows and Linux distributions."
   - ISATAP is disabled by default on recent Windows but not removed — the `NetworkTransition` cmdlets still ship through Windows Server 2022/2025 and Windows 11. Linux still supports ISATAP via the `sit` module and `ip tunnel mode sit`.
   - Changed to: "It is considered legacy today - disabled by default on modern Windows and largely unused on Linux, though the underlying code still ships in both."

2. **Incorrect "ISATAP removed from Windows Server 2022" bullet.**
   - Was: "Windows Server 2022: ISATAP removed"
   - The cmdlets and underlying interface are present in Windows Server 2022 and 2025; it is disabled by default, not removed.
   - Changed to: "Windows Server 2022 / 2025: ISATAP disabled by default (cmdlets still ship in the `NetworkTransition` module)".

3. **Misleading Linux bullet.**
   - Was: "Linux: `sit` module can do ISATAP but it's not recommended"
   - Technically correct but understated — clarified that the kernel continues to support ISATAP mode via `ip tunnel ... mode sit`, and sharpened the recommendation wording.

4. **Inaccurate claim that RFC 7059 declares ISATAP as "legacy".**
   - Was: "RFC 7059 and later documents note ISATAP as legacy"
   - RFC 7059 is a comparison/survey document; it does not declare ISATAP deprecated or legacy. It simply lists ISATAP alongside other intra-site tunneling mechanisms.
   - Changed to: "RFC 7059 surveys ISATAP alongside other IPv6-over-IPv4 tunnel mechanisms as a transitional technique".

5. **Incomplete explanation of the ISATAP IID format.**
   - The original text said "the `0:5efe:` is the ISATAP identifier - any ISATAP address contains this marker", which omits the u-bit semantics in RFC 5214 Section 6.1 (the leading byte is `02` when the embedded IPv4 is globally unique and `00` otherwise — e.g., real-world Windows hosts with a public IPv4 show up with `200:5efe:` IIDs).
   - Added a clarifying sentence noting the `00` vs `02` distinction per RFC 5214 Section 6.1.

## Review Notes

- The architecture/walkthrough section is correct: ISATAP uses IP protocol 41 to encapsulate IPv6-in-IPv4, the IPv4 destination is extracted from the last 32 bits of the peer's ISATAP IID, and hosts auto-configure global addresses from a prefix announced by the ISATAP router via Router Advertisements.
- The /120 prefix math for `10.0.0.0/24 → ::5efe:0a00:0000/120` is correct (8 variable host bits = 128 − 8 = 120). Note that 10/8 is RFC 1918, so `0:5efe:` (u-bit = 0) is the technically correct form in that example.
- The example addresses in the post largely use `192.0.2.x` (RFC 5737 TEST-NET-1 / documentation) together with the `0:5efe:` form. Strictly per RFC 5214, globally unique IPv4 addresses should produce `200:5efe:` IIDs. The added clarification about the u-bit covers this; examples were left unchanged to avoid restructuring the post.
- The `New-NetIPAddress -IPAddress "2001:db8::5efe:192.0.2.1"` notation relies on IPv4-embedded IPv6 text form (RFC 4291 §2.2.3); Windows `ipconfig` displays ISATAP addresses in that form, but some administrators may find `2001:db8::5efe:c000:201` more portable. This is a style point, not an error.
- The Wireshark filter `ipv6.src contains 00:00:5e:fe` will only match ISATAP addresses with u-bit = 0. Matching globally unique ISATAP hosts would additionally require `ipv6.src contains 02:00:5e:fe`. Left unchanged as it is a reasonable heuristic for intranet (RFC 1918) scans.
- Linux userland tooling note: creating an ISATAP tunnel in modern iproute2 is typically `ip tunnel add isa0 mode sit remote any local <v4> ttl 64` with `ip link set isa0 up` and then relying on RS/RA — out of scope for this post but worth mentioning in a follow-up.
