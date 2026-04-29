# Validation Summary: How to Monitor UDP Connection Statistics with ss

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `ss` (iproute2 socket statistics utility)
- `netstat` (net-tools)
- `nstat` (network statistics counter tool)
- UDP socket internals (Linux kernel: skmem, sk_drops, recv/send buffers)
- ss filter expression language (sport, src, dst)

## Sources Consulted
- ss(8) man page (iproute2) — confirmed default state filter, `-O`, `-m`, `-a`, `-l`, `-n`, `-p`, skmem field semantics
- iproute2 source documentation for skmem field meanings (rmem_alloc, rcv_buf, wmem_alloc, snd_buf, fwd_alloc, wmem_queued, opt_mem, back_log, sock_drop)
- netstat(8) man page (net-tools)
- Empirical verification on a live Linux 6.17 system (ss from iproute2): confirmed that `ss -un` only shows ESTAB UDP sockets, while `ss -uan` shows both ESTAB and UNCONN, and that without `-O` the `skmem:(...)` block is printed on a separate line from the state row.

## Issues Found

1. **Default state filter — `-a` missing on UDP listing commands.** The post claimed `ss -un` "Lists all UDP sockets" and showed UNCONN sockets in sample output. The ss(8) man page is explicit: "When no option is used ss displays a list of open non-listening sockets ... that have established connection." Empirically, `ss -un` on a real system only returns ESTAB sockets and omits UNCONN listeners (the typical state for UDP servers). Fixed by changing the listing commands to `ss -uan` / `ss -uanp`, and re-labelling the `ss -un` example as "List established (connected) UDP sockets only". The same fix was applied to the sport/src/dst filter section, the watch loop, the `while true` polling loop, and the netstat comparison (`netstat -uan`).

2. **awk script broken without `-O`.** The script `ss -umn | awk -F'[,(]' '/UNCONN/{...}'` cannot work because `ss -m` puts the `skmem:(...)` block on a separate continuation line (verified on a live system). The `/UNCONN/` line therefore never contains skmem fields and the field loop never finds an `r<digits>` token. Fixed by switching to `ss -Ouamn`, which forces one-line output so each UNCONN row carries its own skmem block. Verified the fixed pipeline emits the expected `r<bytes>` values.

3. **Drops filter `grep -v 'd0'` was imprecise and misleading.** Without `-O`, the skmem line is separate from the socket-info line, so `grep -v 'd0'` retains every socket-info row regardless of drops and only filters skmem rows that contain the `d0` substring (and could match `d0` anywhere else, e.g. in IPv6 address fragments). Fixed to `ss -Ouamn | grep -v 'd0)'` — the closing paren anchors the match to the end of the skmem block, where the no-drop case literally renders as `,d0)`.

4. **`nstat | grep ...` may produce no output.** By default, `nstat` only prints counters that have changed since the last invocation (and frequently emits nothing on first run). For the documented "check global UDP receive errors" use case, the post needs a counter that is always shown. Updated to `nstat -az | grep UdpRcvbufErrors` (`-a` shows all counters, `-z` includes zero-valued ones).

5. **Conclusion command updated for consistency.** Changed `ss -umn` and `nstat | grep Udp` in the conclusion to `ss -Ouamn` and `nstat -az | grep Udp` so the summary recipe matches the corrected examples.

## Review Notes
- The `skmem` field labels in the post (`r`, `rb`, `t`, `tb`, `d`) match the iproute2 man page semantics. The post's gloss for `d` ("packets dropped due to full buffer") was tightened slightly in the body to the man-page wording ("packets dropped before being demultiplexed into the socket"), since `sk_drops` can also include drops for reasons other than a full receive buffer (e.g., checksum errors when the kernel routes them through the socket drop path). The original phrasing was kept in the surrounding prose where the meaning is clear from context.
- `sport = :PORT`, `dst ADDR`, `src ADDR`, and `>= :PORT` filter operators used in the post are all valid per the ss expression language.
- `ss -s` summary output indeed does not include UDP drop counts — the post's caveat is accurate; `nstat`/`/proc/net/snmp` is the correct source for system-wide UDP drop counters.
- The `grep -oP 'r\K[0-9]+(?=,)'` PCRE pattern is correct: it matches `r<digits>,` and emits only the digits, while skipping `rb<digits>,` because the character after `r` in `rb...` is a non-digit (`b`).
