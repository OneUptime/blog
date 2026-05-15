# Validation Summary: How to Analyze Network Performance with iperf3 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- iperf3
- firewalld
- systemd
- Python JSON parsing
- Linux networking tools (`ip`, `ethtool`)

## Sources Consulted
- ESnet iperf3 official documentation and manual page: https://software.es.net/iperf/invoking.html
- ESnet iperf3 project documentation: https://software.es.net/iperf/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The description said iperf3 measures latency. iperf3 measures throughput and, for UDP tests, reports jitter and packet loss; it is not a general latency measurement tool. Changed "latency" to "jitter".
- The firewall example opened only `5201/tcp`. iperf3 always uses TCP for the control connection, but UDP tests also send UDP traffic on the test port. Added `sudo firewall-cmd --permanent --add-port=5201/udp`.
- The `-w` example described the option as setting only the TCP window size. The official manual describes it as setting socket buffer/window size, indirectly affecting the maximum TCP window size. Updated the comment.
- The `-l` example described the option as the send/receive buffer length. The official manual describes `-l` as the buffer length to read or write. Updated the comment.

## Review Notes
- The local environment did not have `iperf3` or its man page installed, so CLI verification was performed against ESnet's official manual page rendering.
- The post's examples use valid iperf3 options for current iperf3 releases. On older RHEL package versions, newer flags such as `--bidir` should be checked with `iperf3 --help` if compatibility with a specific minor release is required.
