# Validation Summary: How to Fix Slow TCP Transfers Caused by Small Window Sizes

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP flow control and window sizing
- Linux TCP buffer tuning with `sysctl`
- `ss` socket inspection
- `iperf3` throughput testing
- `ping` RTT measurement
- Python `socket` buffer options

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- iperf3 official manual: https://software.es.net/iperf/invoking.html
- Linux `socket(7)` manual: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Local CLI help output for `ping`, `ss`, and `sysctl`

## Issues Found
- The post's 1 MB / 82 ms example said a 45 Mbps result against a 102 Mbps window-derived ceiling meant the window was probably the bottleneck. I corrected this because a measured rate far below the calculated ceiling points to some other limiter.
- The `ss -tin state established | grep snd_wnd` check was too narrow and did not point readers at the documented memory and TCP-info output. I changed it to `ss -tim state established` and noted the relevant fields to inspect.
- The buffer sizing explanation hardcoded a `6MB` maximum and implied the starting default itself was the main limit. I replaced that with wording that matches Linux auto-tuning behavior: start from configured defaults and grow toward the configured maximums.
- The `iperf3 -w 4M` example described the option as forcing a 4 MB window. I corrected that to say it requests 4 MiB socket buffers on both ends, which is how the official `iperf3` manual describes it.
- The Python `SO_RCVBUF` example did not explain that Linux doubles the configured value for bookkeeping and returns the doubled size from `getsockopt()`. I added that note so the printed result is interpreted correctly.
- The auto-tuning explanation and conclusion overstated how broadly the suggested sysctl values "resolve" the problem. I narrowed the wording so it accurately describes them as one way to remove this bottleneck when current limits are too small.

## Review Notes
- `ping` is reasonable for an approximate RTT estimate, but the actual TCP flow RTT is available from `ss -i` during the transfer and may differ from ICMP RTT.
- The persistence example using `/etc/sysctl.conf` is technically valid, though many modern distributions prefer drop-in files under `/etc/sysctl.d/`.
- `iperf3` was not available in the local environment, so its command semantics were validated against the official ESnet manual rather than by executing the binary here.
