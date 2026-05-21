# Validation Summary: How to Debug Network Timeouts on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu / Linux networking
- TCP connection states and keepalive sysctls
- `ss`, `tcpdump`, `iptables`, `ufw`, `nc`, `curl`, `mtr`, `ping`, `tracepath`
- OpenSSH client and server keepalive settings
- PostgreSQL and MySQL client connection timeout options

## Sources Consulted
- Linux `tcp(7)` manual: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Local Ubuntu command help/man output for `ss`, `timeout`, `nc`, `ping`, `tcpdump`, `mtr`, and `tracepath`
- curl command documentation for `--write-out` timing variables: https://curl.se/docs/manpage.html
- OpenSSH `ssh_config(5)` and `sshd_config(5)` manuals: https://man.openbsd.org/ssh_config and https://man.openbsd.org/sshd_config

## Issues Found
- The connection timeout tcpdump notes said "SYN but no SYN-ACK" could mean the remote host was not listening. A closed TCP port normally returns RST, so this was changed to describe dropped, filtered, or lost packets/replies.
- The firewall timeout note stated that seeing SYN with no reply means a firewall is dropping packets. This was too absolute, so it was broadened to include routing issues and packet loss.
- The curl timing explanation said high `time_connect` points to network routing. This can also be caused by filtering or server-side connection handling, so the explanation was broadened.
- The pcap analysis command grepped tcpdump text output for `retransmit`, `RST`, and `timeout`. `tcpdump` does not generally label retransmissions or timeouts that way, and TCP resets are usually printed as TCP flags. The command was changed to inspect timestamped tcpdump output directly.
- The TIME_WAIT section suggested that thousands of TIME_WAIT sockets alone may indicate ephemeral port exhaustion. This depends on the ephemeral port range, so the wording was changed to "very high or near your ephemeral port range."
- The TIME_WAIT section recommended lowering `net.ipv4.tcp_fin_timeout` to reduce TIME_WAIT duration. Linux documents `tcp_fin_timeout` as the FIN-WAIT-2 timeout, not the TIME_WAIT duration, so this was replaced with an ephemeral port range tuning example.

## Review Notes
The remaining commands and configuration snippets are technically plausible for Ubuntu systems, but several diagnostic tools may require packages that are not installed by default (`mtr`, `net-tools` for `netstat`, PostgreSQL/MySQL clients, `dig` from `dnsutils`). Future improvements could mention package installation prerequisites and note that `iptables` output may not show all effective firewall rules on nftables-based systems.
