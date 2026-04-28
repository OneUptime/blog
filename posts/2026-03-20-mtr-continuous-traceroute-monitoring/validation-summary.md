# Validation Summary: How to Use MTR for Continuous Traceroute Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MTR (My TraceRoute) v0.95
- Traceroute / ICMP / UDP / TCP probes
- Linux networking diagnostics
- DSCP / Type of Service (ToS) IP header field
- Package managers: apt (Debian/Ubuntu), yum (RHEL/CentOS), Homebrew (macOS)

## Sources Consulted
- mtr(8) man page (v0.95) — verified all flags: `-n`, `-T`, `-P`, `-u`, `-m`, `-s`, `-i`, `-Q/--tos`, `--report`, `--report-cycles`, `--show-ips`
- traviscross/mtr GitHub repository (https://github.com/traviscross/mtr) — confirmed `--tos` accepts raw TOS byte (0-255)
- RFC 2474 — Definition of the Differentiated Services Field (DS Field)
- RFC 3246 — An Expedited Forwarding PHB (defines DSCP EF = 46)
- Debian/Ubuntu package archives — confirmed `mtr-tiny` and `mtr` packages
- Homebrew formula `mtr` — confirmed availability on macOS

## Issues Found

1. **Incorrect `--tos` value for DSCP EF**
   - **Original:** `sudo mtr --tos 46 8.8.8.8    # EF (expedited forwarding) DSCP`
   - **Fixed to:** `sudo mtr --tos 184 8.8.8.8   # TOS 0xB8 = DSCP EF (expedited forwarding)`
   - **Why:** The mtr `--tos` option sets the full 8-bit Type of Service byte in the IP header (range 0-255), not the 6-bit DSCP value. DSCP occupies the high 6 bits of that byte, so DSCP EF (decimal 46, binary 101110) maps to a TOS byte of `46 << 2 = 184` (0xB8) when the ECN bits are zero. Passing `--tos 46` actually sets the TOS byte to 0x2E, which yields DSCP 11 — not EF. Verified against the mtr 0.95 man page: "Specifies value for type of service field in IP header. Should be within range 0 - 255."

## Review Notes
- All install commands are correct: `mtr-tiny` is the appropriate Debian/Ubuntu package for headless servers (the full `mtr` package adds the GTK+ GUI), and the RHEL/CentOS and Homebrew commands are accurate.
- The `-i 0.5` example silently relies on running as root — sub-second intervals are root-only, but the `sudo` prefix already in the example covers this so no change is needed.
- The diagnostic patterns (ICMP rate limiting at intermediate hops, propagating loss, jitter via StDev, bufferbloat indicated by high Wrst with normal Avg) are all consistent with established networking troubleshooting practice and the mtr(8) BUGS section, which explicitly notes that "some modern routers give a lower priority to ICMP ECHO packets" — directly supporting Pattern 1.
- The interactive output header `My traceroute  [v0.95]` matches the current mtr release shown in the man page footer.
- The column descriptions (Loss%, Snt, Last, Avg, Best, Wrst, StDev) match mtr's default field set `LRS N BAWV` from the man page.
- Calling `Best` the "theoretical link latency" is a slight simplification — it's the minimum *observed* RTT, which approximates uncongested link latency but is not strictly theoretical. Left as-is since it's a reasonable explanation in tutorial context.
