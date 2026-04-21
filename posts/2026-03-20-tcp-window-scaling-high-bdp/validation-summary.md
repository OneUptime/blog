# Validation Summary: How to Configure TCP Window Scaling for High-BDP Links

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- TCP window scaling
- Linux TCP sysctl settings
- tcpdump / libpcap capture filters
- Wireshark TShark TCP fields
- iproute2 tc netem
- iperf3 throughput testing
- ss TCP socket diagnostics

## Sources Consulted
- RFC 7323, TCP Extensions for High Performance: https://datatracker.ietf.org/doc/html/rfc7323
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux tcpdump(1) manual page: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Wireshark TShark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- iperf3 documentation and manual page: https://software.es.net/iperf/invoking.html
- Linux tc-netem(8) manual page: https://www.man7.org/linux/man-pages/man8/netem.8.html
- Local Linux man pages/help output for `ss`, `sysctl`, `tcp`, `tc-netem`, `tcpdump`, `iperf3`, and `tshark` availability.

## Issues Found
- RFC wording was outdated. The post referred only to RFC 1323. RFC 7323 is the current specification that obsoletes RFC 1323, so the wording now says window scaling was introduced in RFC 1323 and is specified today in RFC 7323.
- TCP timestamps were described as required for window scaling. They are a separate TCP extension, not a prerequisite for window scaling. The sysctl comments now say timestamps are independent and usually enabled by default.
- The TShark example used `tcp.window_size` and described the SYN window as the actual scaled window. RFC 7323 says SYN segment window fields are not scaled. The command now uses `tcp.window_size_value`, and the explanation says the SYN field is unscaled while the scale shift applies to later window fields.
- The TShark capture block called `65535 7` the expected output. The raw SYN window value is implementation and configuration dependent, so this is now labeled as example output.
- The `ss` explanation collapsed `wscale:7,7` into a single value. The `ss` manual documents this as send and receive scale factors, so the explanation now calls out both values.
- The troubleshooting section implied `ping` tests TCP window-scaling behavior. Since `ping` is ICMP, the comment now distinguishes basic reachability from the TCP `curl` test.
- The buffer-size comment called `268435456` bytes 256 MB. That value is 256 MiB, so the unit wording was corrected.

## Review Notes
The command syntax and sysctl file format were otherwise consistent with the consulted documentation. The buffer sizes are examples and should still be tuned against actual path BDP, application socket behavior, and available host memory.
