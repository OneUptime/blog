# Validation Summary: How to Use the SI6 Networks IPv6 Toolkit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- SI6 Networks IPv6 Toolkit
- Neighbor Discovery Protocol (NDP)
- IPv6 Router Advertisements and Neighbor Advertisements/Solicitations
- IPv6 fragmentation
- IPv6 Flow Label
- IPv6 path probing
- tcpdump

## Sources Consulted
- SI6 Networks IPv6 Toolkit official page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks IPv6 Toolkit upstream repository and bundled README/manuals/source: https://github.com/fgont/ipv6toolkit
- Ubuntu `ipv6toolkit` package metadata and extracted v2.0 command help output (`addr6`, `scan6`, `na6`, `ns6`, `ra6`, `frag6`, `flow6`, `path6`)
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 6437, IPv6 Flow Label Specification: https://www.rfc-editor.org/rfc/rfc6437
- RFC 8200, IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 3849, IPv6 Documentation Prefix: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- `addr6 --version` is not a supported option. Changed the verification command to `addr6 --help`.
- The `addr6 --gen-addr` example only applies to newer upstream source and is not available in the Ubuntu `ipv6toolkit` v2.0 package. Replaced it with a stdin prefix-filtering example that works with the packaged and upstream command set.
- `addr6 -e` is not the canonical-format option. Changed it to `addr6 -c`.
- `scan6 --tcp-scan` is not a valid option and `-o` is a source-port/timeout option, not an output-file option. Changed the TCP scan to `--port-scan tcp:443 --tcp-scan-type syn` and used shell redirection for saved output.
- `ns6` active mode requires an ND target address. Added `-t` and used the target's solicited-node multicast address as the destination.
- `na6 --target-lla` and `--rate` are not valid options. Replaced them with the supported `-E` target link-layer option and `--sleep` loop delay.
- NDP cache test examples used `--flood-sources` where varying target addresses is the relevant cache-pressure behavior. Changed them to `--flood-targets` with a target prefix.
- `fe80::router`, `2001:db8:test::/64`, and `2001:db8:rogue::/64` are not valid IPv6 literals. Replaced them with valid documentation or link-local examples.
- `ra6 --prefix` and `--prefix-life` are not supported. Replaced them with `-P 'prefix/len#flags#valid#preferred'` prefix information options.
- The RA Guard bypass example did not actually use a bypass technique and also used invalid options. Reworded it as repeated RA handling testing and corrected the command.
- `frag6 --data-size` and `--assess` are not supported. Replaced them with supported `--frag-type` and `--frag-reass-policy` options.
- `flow6` does not analyze pcap files and does not set outbound labels with `--flow-label`; it assesses a target's Flow Label generation policy. Replaced those examples with `--flow-label-policy` probes.
- `ipv6loopback` is not part of the SI6 Networks IPv6 Toolkit. Replaced that section with `path6`, which is listed by SI6 as the IPv6 path/traceroute tool.
- The tcpdump filter was made shell-safe and bounded with `timeout`, and the `scan6 | grep "^2"` example was changed because it would omit link-local and ULA hosts while claiming to discover all hosts.
- Updated the introduction and conclusion to avoid overstating path MTU and NDP-specific scan behavior.

## Review Notes
The upstream source clone could not be built in this environment because `pcap.h`/libpcap development headers were not installed and sudo requires a password. To compensate, command options were checked against the upstream source/manuals and against extracted Ubuntu package binaries; network-sending commands were run unprivileged and confirmed to parse before stopping at the expected root-privilege check.
