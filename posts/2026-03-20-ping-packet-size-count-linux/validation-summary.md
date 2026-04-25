# Validation Summary: How to Set Ping Packet Size and Count on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- `ping` (`iputils`)
- ICMP
- IPv4 MTU / Path MTU Discovery
- Shell scripting

## Sources Consulted
- iputils upstream `ping` manual source: https://github.com/iputils/iputils/blob/master/doc/ping.xml
- iputils upstream repository: https://github.com/iputils/iputils
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191

## Issues Found
- The post described the default 84-byte packet size without saying it was an IPv4 calculation. I clarified that the size math in the post is for IPv4 examples, because IPv6 uses a different IP header size.
- The maximum-size example used `ping -s 1452` and labeled it as a near-maximum Ethernet payload. I changed it to `ping -s 1472`, which produces a 1500-byte IPv4 packet and matches the common 1500-byte MTU calculation for `ping`.
- The MTU probe loop mixed payload sizes with MTU values in a way that could confuse readers. I changed the loop to test payload sizes that map cleanly to common total IPv4 packet sizes, including `1464` (1492 total) and `1472` (1500 total).
- The flood section called the technique "bandwidth testing" and implied packet loss directly proved network problems under load. I changed that wording to "load testing" and noted that ICMP rate limiting can also affect results, because flood ping is not a bandwidth benchmark.
- The interval section said `0.1` seconds required `sudo` and claimed the minimum without root was `0.2s`. Current upstream `iputils` documents the unicast minimum for regular users as below that threshold, with root only required for intervals under 2 ms. I removed `sudo` from the `0.1` second example and corrected the explanation.
- The timeout section described `-W` as a per-packet timeout with a default of 1 second. Current `iputils` documents `-W` as a reply timeout that mainly affects no-reply cases, so I corrected the heading and example comment.
- The statistics section and closing paragraph overstated what ping packet loss and size variation can conclusively diagnose. I softened those claims so they reflect what `ping` can indicate rather than prove on its own.

## Review Notes
- The examples use IPv4 destination addresses, so the total packet sizes in the post are calculated as `payload + 20-byte IPv4 header + 8-byte ICMP header`.
- The commands were sanity-checked locally against `ping` from `iputils 20240117`.
