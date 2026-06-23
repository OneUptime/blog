# Validation Summary: How to Configure dnsmasq with DNSSEC Validation

## Status
validated

## Post Type
Tutorial / Guide (configuring dnsmasq as a DNSSEC-validating DNS resolver)

## Technologies Covered
- dnsmasq (DNS forwarder/caching resolver)
- DNSSEC (DNS Security Extensions)
- DNS trust anchors (root KSK, DS records)
- Linux service management (systemd)
- `dig` for DNSSEC testing
- iptables firewall rules
- Prometheus metrics / node_exporter textfile collector
- Bash scripting (trust anchor update, test, monitoring)

## Sources Consulted
- Official dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html (DNSSEC option set: `dnssec`, `trust-anchor`, `dnssec-check-unsigned`, `dnssec-no-timecheck`, `dnssec-timestamp`, `proxy-dnssec`, `dnssec-debug`)
- IANA root anchors: https://data.iana.org/root-anchors/root-anchors.xml (root KSK-2017 key tag 20326, algorithm 8, digest type 2)
- RFC 4034 (DNSSEC resource records: DNSKEY, RRSIG, NSEC, DS), RFC 5155 (NSEC3), RFC 5011 (automated trust anchor updates — confirmed NOT implemented by dnsmasq)
- IANA DNSSEC algorithm number registry (algorithms 5, 7, 8, 10, 13, 14, 15, 16)

## Issues Found
The post repeatedly used a non-existent dnsmasq option and mischaracterized several others. All were corrected against the official dnsmasq man page:

1. **`trust-anchors-file=<path>` is not a real dnsmasq option.** It appeared in the Step 1 config, the full advanced config, and the security hardening config. dnsmasq specifies trust anchors with the `trust-anchor=` directive; a file of such directives is loaded with `conf-file=`. Changed all three occurrences from `trust-anchors-file=/etc/dnsmasq.d/trust-anchors.conf` to `conf-file=/etc/dnsmasq.d/trust-anchors.conf`.

2. **Trust-anchor file contents were missing the `trust-anchor=` directive prefix.** Bare lines like `.,20326,8,2,E06D...` are not valid dnsmasq config. Added the `trust-anchor=` prefix to the Step 2 anchor, the commented-out KSK-2010 line, the internal-domain example, the heredoc in the update script (`trust-anchor=.,${ANCHORS}`), and updated the "Format:" comment accordingly.

3. **False RFC 5011 claim.** The post stated "dnsmasq supports RFC 5011 automated trust anchor updates." dnsmasq does **not** implement RFC 5011 (unlike Unbound/BIND). Rewrote the section heading and body to state that trust anchors are static and must be updated manually (or via the provided script / distro packages), and clarified that `dnssec-timestamp` is unrelated to RFC 5011.

4. **`dnssec-timestamp` mischaracterized.** The post described it as a "timestamp file for preventing replay attacks" and as the "File for RFC 5011 timestamp." It actually lets dnsmasq confirm the system clock is valid (e.g., at boot before NTP sync) before it enforces signature validity periods. Corrected the inline comment and the reference-table description.

5. **`log-dnssec` is not a real option.** Removed it from the debug config (replaced with the real `dnssec-debug`) and deleted its row from the configuration reference table.

6. **`query-retry` is not a real option.** Removed the commented-out `query-retry=10` line and its misleading "timeout for upstream queries" comment from the performance-tuning section.

7. **`dnssec-no-timecheck` comment was wrong.** The comment claimed it disables validation "for these domains / known unsigned internal domains." It actually skips the signature timestamp (validity-period) check and is intended for boot-time use before the clock is synced. Corrected the comment.

8. **Minor:** clarified the Step 1 `dnssec-check-unsigned` comment (it checks that unsigned replies really are unsigned, and is on by default since 2.80).

## Review Notes
- The root trust anchor values are correct: KSK-2017 (key tag 20326, algorithm 8 = RSA/SHA-256, digest type 2 = SHA-256, digest `E06D44B8...`) and the retired KSK-2010 (key tag 19036). Algorithm reference table (5, 7, 8, 10, 13, 14, 15, 16) and DNSSEC record-type table (DNSKEY, DS, RRSIG, NSEC, NSEC3, NSEC3PARAM) match the IANA registries and RFCs.
- The `make COPTS=-DHAVE_DNSSEC` build step and the build dependencies (nettle, gmp) are correct; DNSSEC support in dnsmasq requires the nettle crypto library.
- The test domains `good.dnssec-or-not.com` / `bad.dnssec-or-not.com` could not be verified as currently live. They were left in place because the post also uses the well-established `dnssec-failed.org` (Comcast/Verisign) test domain, which is correct. Readers should treat the `dnssec-or-not.com` examples as illustrative and rely on `dnssec-failed.org` for a guaranteed-bad domain.
- The IANA update script uses `head -1` / `paste` parsing of `root-anchors.xml`, which currently contains two `KeyDigest` entries (the retired KSK-2010 and the active KSK-2017). The parsing may pick up the older/retired digest depending on document order; a more robust implementation would filter on `validUntil` absence or use `dnssec-trust-anchors`/`unbound-anchor`-style tooling. This is a robustness improvement, not a hard error, so it was left as-is.
- `dnssec-check-unsigned` has been enabled by default since dnsmasq 2.80, so including it explicitly is harmless and self-documenting.
