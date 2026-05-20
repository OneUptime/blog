# Validation Summary: How to Benchmark Network Performance with iperf3 on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- iperf3
- TCP and UDP network benchmarking
- jq JSON parsing
- systemd service units
- UFW firewall rules
- ethtool network interface offload settings

## Sources Consulted
- ESnet iperf3 documentation and manual page: https://software.es.net/iperf/invoking.html
- ESnet iperf3 project documentation: https://software.es.net/iperf/
- Ubuntu iperf3 man page: https://manpages.ubuntu.com/manpages/questing/man1/iperf3.1.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The introduction said iperf3 streams data "in both directions," which implied bidirectional traffic by default. Changed it to "in the configured direction" because iperf3 sends client-to-server by default, uses `-R` for reverse mode, and uses `--bidir` for simultaneous bidirectional tests.
- The `--bidir` example was described as sequential. Changed it to simultaneous because the iperf3 manual defines `--bidir` as client and server sending and receiving at the same time.
- The `--cport` example was described as testing through a port range. Changed it to a specific client-side source port because `--cport` binds the data stream to one TCP or UDP client port.
- The multi-stream and 10GbE guidance used overly absolute wording. Softened it to reflect that parallel streams may help when a single stream is limited by CPU, TCP window size, or other path characteristics.
- The UDP jitter guidance gave a fixed "under 1ms" target for voice quality. Replaced it with application-dependent guidance because acceptable jitter depends on codec, buffering, and service requirements.
- The jumbo-frame guidance said 9000 MTU significantly improves 10GbE throughput. Changed it to "can improve" and noted that jumbo frames must be configured end to end.

## Review Notes
The local environment did not have `iperf3` installed, so CLI verification used the official ESnet and Ubuntu manual pages rather than local `iperf3 --help` output. The blog uses `-b`, which current iperf3 documentation treats as the short form for `--bitrate`; the deprecated long form is `--bandwidth`, not used in the post.
