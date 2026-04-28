# Validation Summary: How to Use mtr (My Traceroute) for Advanced Path Analysis

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- mtr (My Traceroute) network diagnostic tool
- ICMP, UDP, TCP probe protocols
- traceroute / ping concepts
- Linux package management (apt, yum)

## Sources Consulted
- Official mtr man page (`man mtr`) from the traviscross/mtr project
- mtr GitHub repository: https://github.com/traviscross/mtr
- Verified options: `--report`, `--report-cycles` (-c), `-n` (--no-dns), `--udp` (-u), `--tcp` (-T), `--port` (-P), `--interval` (-i), `--psize` (-s), `--aslookup` (-z)
- Debian/Ubuntu package: `mtr-tiny` (verified existence)
- RHEL/CentOS package: `mtr` (verified existence)

## Issues Found

1. **Invalid `--icmp` flag**: The post recommended `mtr --icmp --report 8.8.8.8`, but `--icmp` is not a valid option in standard mtr. The official mtr man page lists `--udp`, `--tcp`, and `--sctp` as the protocol-switching flags, with ICMP ECHO being the default protocol when none of these is specified. Running `mtr --icmp` would fail with an unrecognized option error on a stock mtr install. The accompanying comment ("shows different view than UDP") also incorrectly implied that UDP was the default. Replaced the example with `mtr --udp --report 8.8.8.8` and updated the comment to clarify that ICMP ECHO is the default and `--udp` provides an alternative view.

## Review Notes

- The `--interval 0.5` example uses a sub-second interval. Per the mtr man page, only the root user (or a suitably privileged install via setuid/capabilities) may set values between 0 and 1. Most package installs of mtr are setuid root or installed with the appropriate capabilities, so this generally works for users — but it is worth knowing if a non-privileged install errors out.
- Pattern interpretations in the "Interpreting Loss Patterns" section are accurate: routers de-prioritising or rate-limiting ICMP TIME_EXCEEDED responses commonly cause spurious mid-path loss while end-to-end traffic is unaffected (this is also explicitly noted in the BUGS section of the mtr man page).
- The example output table is a simplified representation; real mtr output uses `|--` separators between hop number and address. This is presentational and not technically incorrect.
- The "IPv4" tag is somewhat narrow given mtr supports both IPv4 (`-4`) and IPv6 (`-6`); the post itself is protocol-neutral. Not a technical error in the content, just a tag observation.
- The 10ms StDev threshold for VoIP jitter is a reasonable rule of thumb; ITU-T G.114 and related guidance allow somewhat higher jitter with adequate jitter buffering, but 10ms is a sensible alerting threshold.
