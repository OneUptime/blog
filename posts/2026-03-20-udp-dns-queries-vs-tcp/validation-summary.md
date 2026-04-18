# Validation Summary: How to Use UDP for DNS Queries vs TCP Fallback

## Status
validated

## Post Type
Tutorial / Guide (networking and DNS troubleshooting)

## Technologies Covered
- DNS protocol (UDP/TCP transport, RFC 1035)
- EDNS0 extension (RFC 6891)
- dig (BIND 9 CLI)
- tcpdump
- iptables
- systemd-resolved
- DNS-over-TLS (DoT, RFC 7858)
- Zone transfers (AXFR, RFC 5936)
- nmap

## Sources Consulted
- RFC 1035 (DNS - 512-byte UDP limit, TC bit)
- RFC 5936 (DNS Zone Transfer Protocol / AXFR over TCP)
- RFC 6891 (EDNS0)
- RFC 7766 (DNS Transport over TCP - Implementation Requirements)
- RFC 7858 (DNS over TLS, TCP port 853)
- BIND 9 dig(1) man page (flags: +tcp, +vc, +bufsize, +edns, +ednsopt, +noedns, +ignore)
- glibc resolv.conf(5) (options use-vc)

## Issues Found

1. **`dig +ednsopt @8.8.8.8 google.com` — incorrect syntax.**
   The `+ednsopt` flag requires a code argument (e.g. `+ednsopt=NSID`). Without it, dig exits with "Missing code point for +ednsopt". Replaced with `dig @8.8.8.8 google.com` and a note to inspect the `;; OPT PSEUDOSECTION:` / `EDNS: version: 0` line, which is the standard way to confirm EDNS0 support.

2. **Claim that `dig google.com` auto-falls-back to TCP when UDP is blocked — wrong.**
   dig only retries over TCP when the TC bit is set in a UDP response, or when `+tcp`/`+vc` is specified. A DROPped UDP packet simply produces a timeout. Updated the iptables test to use `dig +tcp google.com` explicitly and noted that `dig google.com` alone will time out. Added a note that glibc's `options use-vc` in /etc/resolv.conf forces TCP at the resolver level.

3. **`dig google.com @8.8.8.8 +bufsize=0` would not trigger TC bit.**
   google.com's A-record response fits comfortably under 512 bytes, so this example does not demonstrate truncation. Changed to `dig isc.org ANY @8.8.8.8 +bufsize=512`, which reliably produces a large answer that exceeds 512 bytes and triggers the TC bit + TCP retry.

## Review Notes
- The EDNS0 default buffer size stated as "typically 4096 bytes" is historically accurate, but DNS Flag Day 2020 recommended lowering this to 1232 bytes to avoid IP fragmentation. Many current resolvers now advertise 1232. This is not incorrect in the post but could be worth a future footnote.
- `dig +stats | grep 'SERVER:'` shows the server IP/port but does not directly reveal whether UDP or TCP was used; transport is inferred from defaults. Not wrong, but users may be misled — tcpdump (already shown) is the reliable verification.
- The statement that TCP 3-way handshake adds latency and overhead is correct but RFC 7766 encourages TCP connection reuse/pipelining; modern recursive resolvers often keep TCP sessions alive.
- Header size comparison (UDP 8 bytes vs TCP 20 bytes) is correct.
