# Validation Summary: How to Enable and Verify TCP SACK (Selective Acknowledgment)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- TCP Selective Acknowledgment (SACK)
- TCP Duplicate SACK (D-SACK)
- Linux TCP sysctls
- `tcpdump`
- `tshark` / Wireshark display fields
- `tc netem`
- `iperf3`
- `nstat` and `netstat`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 2018, TCP Selective Acknowledgment Options: https://www.rfc-editor.org/rfc/rfc2018.html
- RFC 2883, An Extension to the Selective Acknowledgement (SACK) Option for TCP: https://www.rfc-editor.org/rfc/rfc2883
- RFC 3155, End-to-end Performance Implications of Links with Errors: https://www.rfc-editor.org/rfc/rfc3155.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- `tshark` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- `iperf3` invocation and manual page wrapper: https://software.es.net/iperf/invoking.html
- `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- `nstat(8)` manual page: https://www.man7.org/linux/man-pages/man8/nstat.8.html
- `netstat(8)` manual page: https://man7.org/linux/man-pages/man8/netstat.8.html
- `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found
- The opening explanation described non-SACK TCP as go-back-N retransmission of all packets after a loss. RFC 2018 is more precise: with cumulative ACKs, the sender generally learns about only one loss per RTT and recovers less efficiently. I corrected the explanation.
- The post told readers to check `net.ipv4.tcp_fack` as a related SACK setting. Current Linux kernel sysctl documentation marks `tcp_fack` as a legacy option with no effect, so I removed it from the guidance.
- The persistence example used shell redirection with `cat >> /etc/sysctl.d/...` after `sudo` commands. That redirection would not run with elevated privileges in a normal shell, so I changed it to `sudo tee -a ...`.
- The handshake capture filter `'(tcp[tcpflags] & (tcp-syn|tcp-ack)) != 0'` matched essentially all ACK traffic, not just the handshake. I changed it to a SYN-only filter.
- The direct `tcpdump` verification command excluded SYN-ACK packets, even though the text said to verify both peers advertise SACK. I changed the example to capture both SYN and SYN-ACK and updated the note accordingly.
- The `tshark` example used `tcp.options.sack_perm`, which is not the current field to rely on in modern Wireshark releases. I updated the example to use the current `tcp.option_kind` field and to check for option kind `4` in SYN and SYN-ACK packets.
- The SACK recovery example used the outdated display filter `tcp.options.sack`. I changed it to `tcp.options.sack.count > 0` and added both left and right edge fields so the SACK blocks can be inspected correctly.
- The iperf3 server example ran indefinitely in the background and the client used an unnecessary pacing flag. I changed the server to documented one-off mode with `-1` and simplified the client command.
- The `/proc/net/netstat` pipeline only surfaced tokenized names and the sample `netstat -s` output did not match current Linux counter names. I replaced that section with current `nstat`/`netstat -s` examples and real counter names.
- The comparison heading said “FACK” while the table actually compared SACK, D-SACK, and RACK. I corrected the heading.
- The conclusion used overly absolute and unsupported wording, including “should always remain enabled” and a specific `>0.1%` packet-loss threshold. I corrected that to defensible, source-aligned wording.

## Review Notes
- Local checks: `tcpdump -d` was used to confirm the revised BPF filters compile as intended; `sysctl --help`, `tc -help`, `nstat -az`, and `netstat -s` were used to confirm command syntax and current counter names; `validation.json` was validated with `jq`.
- Runtime execution of the `tshark` and `iperf3` examples was not possible in this workspace because neither binary is installed here, so those commands were validated against the current official Wireshark and iperf3 documentation instead.
- Current Linux kernel sysctl documentation marks `tcp_fack` as a legacy no-op, while some `tcp(7)` man-page material still describes it historically. The post now follows the current kernel documentation.
