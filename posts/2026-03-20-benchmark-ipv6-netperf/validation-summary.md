# Validation Summary: How to Benchmark IPv6 with netperf

## Status
validated

## Post Type
Guide

## Technologies Covered
- netperf
- netserver
- iperf3
- IPv6
- TCP
- UDP
- Linux `ss`

## Sources Consulted
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- Netperf upstream `netperf` man page: https://github.com/HewlettPackard/netperf/blob/master/doc/netperf.man
- Netperf upstream `netserver` man page: https://github.com/HewlettPackard/netperf/blob/master/doc/netserver.man
- Netperf upstream source for classic test output formatting: https://github.com/HewlettPackard/netperf/blob/master/src/nettest_bsd.c
- iperf3 invocation reference: https://software.es.net/iperf/invoking.html
- RFC 4291, IPv6 text representation: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The example IPv6 literal `2001:db8::server` was not syntactically valid. I replaced it with `2001:db8::1`, which is a valid address inside the RFC 3849 documentation prefix.
- The `TCP_RR` output note implied that default output includes microseconds per transaction. Upstream `netperf` only reports the transaction rate by default; the more detailed `usec/Tran` field appears in higher-verbosity output, so I corrected the note.
- The automation snippet parsed `tail -1` from default `netperf` output. For request/response tests, default output includes an extra socket-size footer line, so the script could capture the wrong value. I added `-P 0 -v 0` so each invocation emits a single numeric result that the script can parse consistently.
- The `ss -6 -u -s` line does not directly measure packet loss by itself. I adjusted the wording so it accurately describes the command as a UDP socket summary check.

## Review Notes
- `netperf` output varies significantly by verbosity. For automation, `-P 0 -v 0` is safer than scraping the default human-readable tables.
- `UDP_STREAM` in quiet numeric mode reports sender throughput; receiver-side delivery details are available in the default tabular output or from separate OS counters.
