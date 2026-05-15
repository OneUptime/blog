# Validation Summary: How to Tune TCP Buffer Sizes and Socket Parameters on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux TCP socket buffers
- Linux sysctl kernel parameters
- TCP window scaling
- TCP listen backlog tuning
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Tuning TCP connections for high throughput": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/tuning-tcp-connections-for-high-throughput
- Red Hat Enterprise Linux 10 documentation, "Tuning the TCP listen backlog to process a high number of TCP connection attempts": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/network_troubleshooting_and_performance_tuning/network_troubleshooting_and_performance_tuning
- Linux man-pages project, tcp(7): https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux man-pages project, socket(7): https://man7.org/linux/man-pages/man7/socket.7.html
- Local system man pages for tcp(7) and socket(7)

## Issues Found
- The persistent sysctl snippet labeled both `net.core.somaxconn` and `net.core.netdev_max_backlog` as connection backlog settings. `somaxconn` controls the listen backlog limit, while `netdev_max_backlog` controls the network device input backlog queue. Updated the comment to distinguish listen backlog from network device backlog.
- The BDP example said a maximum buffer value at least equal to the BDP was sufficient and called 16 MB good for a 12.5 MB BDP. Red Hat documentation recommends using two to three times the BDP as a common starting point for the maximum TCP buffer value. Updated the example to recommend 25 MB to 37.5 MB for the 12.5 MB BDP case.
- The listen backlog tuning snippet increased `net.core.somaxconn` but did not mention that the application must request or configure a higher listen backlog to use the larger kernel limit. Added a brief command-comment note to reflect Red Hat guidance.

## Review Notes
The sysctl commands and configuration syntax are valid. The `tcp_rmem` and `tcp_wmem` three-value format, `rmem_max` and `wmem_max` socket buffer limits, TCP window scaling behavior, and BDP calculation formula align with Linux and Red Hat documentation.
