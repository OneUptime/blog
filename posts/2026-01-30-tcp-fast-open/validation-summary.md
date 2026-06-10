# Validation Summary: How to Implement TCP Fast Open

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- TCP Fast Open (TFO) per RFC 7413
- Linux kernel TCP stack (`net.ipv4.tcp_fastopen` sysctl, `TCP_FASTOPEN`, `TCP_FASTOPEN_CONNECT`, `MSG_FASTOPEN`)
- Nginx (`listen ... fastopen=N`)
- Apache HTTP Server (`AcceptFilter`)
- Python `socket` module (`MSG_FASTOPEN`, `sendto`)
- C sockets API (`sendto`, `MSG_FASTOPEN`)
- Go `syscall` package (raw socket + `setsockopt`)
- tcpdump / ss / `/proc/net/netstat` for debugging
- curl `--tcp-fastopen`

## Sources Consulted
- RFC 7413 — "TCP Fast Open" (https://www.rfc-editor.org/rfc/rfc7413)
- Linux kernel UAPI headers — `include/uapi/linux/tcp.h` (https://github.com/torvalds/linux/blob/master/include/uapi/linux/tcp.h) for `TCP_FASTOPEN = 23` and `TCP_FASTOPEN_CONNECT = 30`
- Linux kernel `Documentation/networking/ip-sysctl.txt` for the `net.ipv4.tcp_fastopen` bitmap semantics
- `include/linux/socket.h` for `MSG_FASTOPEN = 0x20000000`
- Apache HTTP Server 2.4 `Listen` directive docs (https://httpd.apache.org/docs/2.4/mod/mpm_common.html#listen)
- Nginx `listen` directive docs — `fastopen=N` (https://nginx.org/en/docs/http/ngx_http_core_module.html#listen), added in nginx 1.5.8
- IANA TCP Option Kind Numbers registry — kind 34 = "TCP Fast Open Cookie"
- Mozilla bug history for Firefox `network.tcp.tcp_fastopen_enable` (removed in Firefox 87)

## Issues Found
1. **Wrong `TCP_FASTOPEN_CONNECT` constant in the Go example.** The post used `23, // TCP_FASTOPEN_CONNECT`. Per `include/uapi/linux/tcp.h`, `23` is `TCP_FASTOPEN` (listener-side) and `30` is `TCP_FASTOPEN_CONNECT`. Using 23 with `setsockopt` here would enable listener-side TFO with an unintended queue-length value rather than opting the active connect into TFO. Changed the literal from `23` to `30`.

2. **Missing `os` import in the Go example.** The function calls `os.NewFile(...)` but the `import` block only listed `fmt`, `net`, and `syscall`. Added `"os"` to the import group so the example compiles.

3. **Invalid Apache configuration: `Listen 443 https fastopen=256`.** Apache 2.4's `Listen` directive accepts only `[IP-address:]portnumber [protocol]` — it has no `fastopen=` parameter. Rewrote the Apache section to clarify that Apache has no built-in TFO directive, that TFO is enabled at the kernel level (`net.ipv4.tcp_fastopen=3`), and that `AcceptFilter ... data` controls TCP_DEFER_ACCEPT (not TFO itself).

4. **Incorrect explanation of the `0x200` bit in `net.ipv4.tcp_fastopen`.** The post claimed the snippet "limits TFO queue size" and that `0x200 = Enable TFO with a cookie even if no SYN data`. Per the kernel `ip-sysctl.txt`, `0x200` actually means "server: accept data-in-SYN even when no cookie is present" — which *weakens* security rather than tightens it, and the sysctl does not control queue length at all. Replaced the snippet with the correct bitmap (`0x001` client, `0x002` server, `0x004` client-no-cookie, `0x200` server accept-without-cookie, `0x400` enable on all listeners by default) and noted that per-listener queue length is set via the `TCP_FASTOPEN` setsockopt value (or nginx's `fastopen=N`).

5. **Outdated browser-support table.** Chrome no longer ships TFO enabled by default (the original "enabled by default" claim has not held since middlebox-related rollbacks), and Firefox removed TFO entirely in Firefox 87 — the `network.tcp.tcp_fastopen_enable` pref is no longer wired up. Updated both rows.

## Review Notes
- The high-level explanation of TFO mechanics (RFC 7413, kind=34 TCP option, 4–16 byte cookie, cookie tied to client IP + server-side rotating secret) is accurate.
- The latency-savings math in the "Latency Reduction Calculation" section uses a non-standard "0.5 RTT" decomposition for the SYN-with-data leg, but the final conclusion of "1 RTT saved per new connection" is correct, so it was left alone.
- The C/Python client examples are correct. `MSG_FASTOPEN` is exposed by Python's `socket` module on Linux builds where it is available at compile time — no manual constant definition is needed.
- The `cat /proc/sys/net/ipv4/tcp_fastopen` and `/proc/net/netstat` debugging tips are accurate; counter names `TCPFastOpenActive` / `TCPFastOpenPassive` match the kernel snmp output.
- The Safari row in the browser table was left as-is — Safari does support TFO on macOS and iOS, though its default-on status has shifted across versions; the claim as written is defensible.
- The `tcp_fastopen=0x203` recommendation in the security section enables the *less*-secure "accept data-in-SYN without cookie" bit; readers should generally prefer plain `=3` unless they explicitly want that trade-off. This is now called out inline in the corrected comment block.
