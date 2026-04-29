# Validation Summary: How to Monitor TCP Window Size Changes During a Transfer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TCP (RFC 9293, RFC 7323 for window scaling)
- Linux `ss` utility (iproute2)
- `tcpdump` (libpcap-based capture)
- `tshark` (Wireshark CLI)
- Wireshark TCP Stream Graphs
- Bash scripting / `awk` / `grep`
- Linux TCP buffer tuning (`tcp_rmem`)

## Sources Consulted
- iproute2 `ss(8)` man page and source — verified `-t`, `-i`, `-n` flags and the `snd_wnd`, `rcv_space`, `sndbuf` field names actually emitted in `ss -i` output
- Live `ss -tin` output to confirm field names (`snd_wnd:`, `rcv_space:` present in real output)
- `tcpdump(8)` man page — confirmed `-i`, `-n`, `-w` flags and `tcp and host X and port Y` BPF filter syntax
- Wireshark display filter reference (https://www.wireshark.org/docs/dfref/t/tcp.html) — confirmed `tcp.window_size` is a valid field representing the calculated (scaled) window size; `ip.dst` is also a valid filter
- Wireshark User's Guide — confirmed the menu path Statistics → TCP Stream Graphs → Window Scaling exists in Wireshark 3.x/4.x
- Linux kernel docs `Documentation/networking/ip-sysctl.rst` — confirmed `net.ipv4.tcp_rmem` is the receive buffer tuning parameter
- GNU grep manual — confirmed `-oP` with `\K` (PCRE keep-out) is valid syntax

## Issues Found
No technical issues found.

All commands, field names, filter syntaxes, and conceptual explanations check out:
- `ss -tin state established "( dst ... )"` is valid filter syntax; `dport = :$PORT` is the correct ss port-filter form
- The interpretation table (Zero Window, sawtooth from congestion control, plateau = buffer-bound, etc.) aligns with standard TCP flow/congestion control behavior described in RFC 9293 and RFC 5681
- `tcp.window_size` in tshark/Wireshark is the post-scaling calculated value, which is what the author wants to plot

## Review Notes
- `scp` to `:/dev/null` works in practice (the remote sshd writes to /dev/null which accepts arbitrary writes), but a future revision might prefer `dd if=/dev/zero | ssh user@host 'cat >/dev/null'` or `iperf3` as more conventional bulk-transfer generators.
- `grep -A2 snd_wnd` in the `watch` example will print 2 lines after the matched detail line, which can include the next connection's header line. `grep -B1` would more naturally show the connection identifier above its detail line, but the existing form is not technically wrong.
- `ss` field names like `snd_wnd` are reported in bytes only when the connection has negotiated window scaling (RFC 7323); on older or non-scaling connections the same field is reported but capped at 65535. Worth noting in a future expansion but not an error.
- OpenSSH 9.0+ has deprecated the `scp` protocol in favor of SFTP under the hood; the `scp` command still works for the demo purpose here.
