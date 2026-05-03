# Validation Summary: How to Debug TCP Nagle Algorithm Delays

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- TCP Nagle's algorithm (RFC 896)
- TCP delayed ACK (RFC 1122)
- Linux kernel TCP stack (TCP_DELACK_MIN / TCP_DELACK_MAX)
- TCP_NODELAY socket option
- tcpdump / tshark (Wireshark CLI)
- iproute2 `ss`
- Python `socket` module
- gunicorn / uvicorn (mentioned)

## Sources Consulted
- RFC 896 — Congestion Control in IP/TCP Internetworks (Nagle): https://datatracker.ietf.org/doc/html/rfc896
- RFC 1122 §4.2.3.2 — Delayed ACK requirements: https://datatracker.ietf.org/doc/html/rfc1122
- Linux kernel `include/net/tcp.h` — `TCP_DELACK_MIN` (HZ/25 = 40ms), `TCP_DELACK_MAX` (HZ/5 = 200ms)
- iproute2 `ss(8)` man page — `-i` adds an indented internal info line
- Python `socket` module docs — `IPPROTO_TCP`, `TCP_NODELAY`, `setsockopt`
- gunicorn `gunicorn/sock.py` — explicitly sets `TCP_NODELAY=1`
- CPython `Lib/asyncio/selector_events.py` — sets nodelay on accepted connections (uvicorn inherits)
- tshark / Wireshark display filter docs (`tcp.len`, `frame.time_delta`)

## Issues Found
1. **Contradictory timeout claim in the introduction.** The intro stated "40ms 'Nagle delay' (triggered by the 200ms delayed ACK on the receiver)", which is internally inconsistent — a 200ms delayed ACK would yield a 200ms stall, not 40ms. On Linux specifically, the delayed ACK timer ranges between `TCP_DELACK_MIN` (40ms) and `TCP_DELACK_MAX` (200ms), with 40ms being the typical floor that produces the well-known stalls. Rewrote the parenthetical to accurately reference both bounds and clarify the source of the delay.

2. **Awk threshold did not match the label.** The tshark detection pipeline used `awk '$1 > 0.030 ...'` (30ms) but printed the literal string `"40ms+ gap"`. Changed the threshold from `0.030` to `0.040` so the filter matches the label and reflects Linux's actual 40ms `TCP_DELACK_MIN`.

3. **Broken multi-line `ss` pipe for per-process check.** `ss -i` prints connection details (with `pid=…`) on one line and the internals (including `nodelay`) on the *next*, indented line. The pipeline `ss -tinp ... | grep "pid=…" | grep nodelay` therefore can never match — the two patterns live on different lines. Changed to `grep -A1 "pid=…" | grep nodelay` so the info line below the connection is included, and added a one-line comment explaining why.

## Review Notes
- The Python test code is correct: `socket.IPPROTO_TCP` and `socket.TCP_NODELAY` are standard constants, and `setsockopt` is called before `connect()` which is fine (TCP_NODELAY can also be set after connect).
- The single-byte `s.send(b'x')` test reliably exposes the Nagle/delayed-ACK interaction only when the *server* is also waiting before sending a response (e.g., a server that itself has Nagle on and a small reply). For pure echo servers that respond immediately, the deadlock can fail to materialize. The post's framing as a measurement harness is reasonable, but readers should be aware the result depends on server-side behavior too.
- The uvicorn-by-default claim is accurate, but it works *transitively* via asyncio (which sets TCP_NODELAY on accepted connections in `selector_events.py`), not via uvicorn itself. The current wording ("uvicorn: uses TCP_NODELAY by default for HTTP connections") is correct in effect, so left unchanged.
- The "When to Keep Nagle Enabled" guidance is consistent with conventional wisdom; bulk transfer benefit from Nagle is real but modest on modern stacks with TSO/GSO. No change needed.
