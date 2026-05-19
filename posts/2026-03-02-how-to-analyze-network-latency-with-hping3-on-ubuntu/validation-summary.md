# Validation Summary: How to Analyze Network Latency with hping3 on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- hping3
- ICMP, TCP, and UDP probing
- Linux traffic control (`tc`) and NetEm
- Bash, `awk`, `grep`, `cut`, and `bc`
- Linux network diagnostics (`ip`, `ss`, `netstat`)

## Sources Consulted
- Ubuntu Launchpad package page for hping3: https://launchpad.net/ubuntu/noble/+package/hping3
- Local Ubuntu package metadata from `apt-cache show hping3` and `apt-cache show iproute2`
- hping3 manual page: https://man.archlinux.org/man/hping3.8.en
- Kali Linux hping3 package/help page: https://www.kali.org/tools/hping3/
- Debian iproute2 `tc(8)` manual page: https://manpages.debian.org/bookworm/iproute2/tc.8.en.html
- Debian iproute2 `tc-netem(8)` manual page: https://manpages.debian.org/bookworm/iproute2/tc-netem.8.en.html

## Issues Found
- The TCP ACK example described ACK probes as bypassing some stateful firewalls. Changed this to say ACK probes are useful for testing firewall behavior, because unsolicited ACK packets are commonly used to characterize filtering behavior and are not a reliable firewall bypass.
- The TCP SYN explanation implied any target host sends a SYN-ACK. Clarified that SYN-ACK is expected from a target with an open port; closed ports typically return RST or may be filtered.
- The hping3 traceroute examples omitted `--tr-stop`. Added it so the examples stop when the destination is reached, matching the described traceroute-like behavior.
- The packet-loss example showed 998 received out of 1000 transmitted but reported 0% packet loss. Changed the example to 990 received and 1% packet loss.
- The jitter section labeled `max-min` as jitter. Renamed the output field to `range` because max-minus-min is a latency range, not a standard jitter calculation.
- The Path MTU examples used the invalid long option `--dont-frag`. Changed it to hping3's documented `--dontfrag` option.
- The Path MTU comment called 1472 bytes plus headers a 1500 byte frame. Changed this to 1500 byte packet and clarified the 28-byte IP/ICMP header calculation.
- The automation script parsed the max RTT instead of the average RTT from `round-trip min/avg/max`. Changed the `awk -F'/'` field from `$5` to `$4`.

## Review Notes
- The post is technically relevant and contains runnable commands and scripts.
- hping3 was not installed in the local environment, so command behavior was verified against package metadata, manual pages, and published hping3 help output rather than by sending packets.
- `netstat` is widely considered legacy compared with `ss`, but the passing mention is not technically incorrect.
