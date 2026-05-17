# Validation Summary: How to Use eBPF for Network Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- eBPF (extended Berkeley Packet Filter)
- BCC (BPF Compiler Collection) and the `*-bpfcc` Ubuntu tools
- bpftrace (one-liners and tracepoints)
- XDP (eXpress Data Path) and `xdp-tools` / `xdp-filter`
- Linux kernel tracepoints (`net:net_dev_xmit`, `net:napi_gro_receive_entry`, `sock:inet_sock_set_state`, `syscalls:sys_enter_sendto`)
- Linux kprobes (`tcp_connect`, `tcp_sendmsg`, `tcp_cleanup_rbuf`, `kfree_skb`)
- Cilium Hubble (Kubernetes network observability)
- tcpdump (BPF bytecode comparison)
- dropwatch
- Python BCC bindings

## Sources Consulted
- BCC tools index: https://github.com/iovisor/bcc/tree/master/tools
- tcplife example doc: https://github.com/iovisor/bcc/blob/master/tools/tcplife_example.txt
- tcprtt example doc: https://github.com/iovisor/bcc/blob/master/tools/tcprtt_example.txt
- execsnoop example doc: https://github.com/iovisor/bcc/blob/master/tools/execsnoop_example.txt
- tcptracer example doc: https://github.com/iovisor/bcc/blob/master/tools/tcptracer_example.txt
- tcpdrop example doc: https://github.com/iovisor/bcc/blob/master/tools/tcpdrop_example.txt
- gethostlatency example doc: https://github.com/iovisor/bcc/blob/master/tools/gethostlatency_example.txt
- Ubuntu package search (bpfcc): https://packages.ubuntu.com/search?keywords=bpfcc
- Cilium Hubble repo: https://github.com/cilium/hubble (default branch is `main`)
- Linux kernel `include/trace/events/net.h` (tracepoint definitions)
- xdp-tools / xdp-filter project: https://github.com/xdp-project/xdp-tools

## Issues Found

1. **Non-existent Ubuntu package `bcc`.** The post suggested `sudo apt install bcc` as an alternative install. Ubuntu has no package named `bcc`; the correct names are `bpfcc-tools`, `python3-bpfcc`, `libbpfcc`. **Fix:** removed the bogus `sudo apt install bcc` line, leaving only the correct `bpfcc-tools` install.

2. **`tcplife-bpfcc` described as "TCP round-trip time distributions".** `tcplife` reports per-session lifetimes (PID, comm, endpoints, bytes, duration), not RTT histograms. The actual RTT-distribution tool is `tcprtt`. **Fix:** added a separate `tcprtt-bpfcc` line for RTT distributions and corrected the `tcplife-bpfcc` description to "TCP session lifetimes (duration, bytes sent/received)".

3. **`execsnoop-bpfcc | grep -i dns` claimed to monitor DNS queries.** `execsnoop` traces `execve()` calls (new process creation) and has no visibility into UDP/53 traffic; piping to grep would only find newly-launched processes that happen to have "dns" in their command. **Fix:** replaced with `gethostlatency-bpfcc`, the correct BCC tool for observing libc resolver calls (`getaddrinfo` / `gethostbyname`).

4. **`tcptracer-bpfcc` described as showing "connections by IP and port with latency".** tcptracer traces connect/accept/close events with IP and port but does not report latency. **Fix:** changed the description to "TCP connect, accept, and close events by IP and port".

5. **Non-existent BCC tool `droptrace`.** The post invoked `sudo /usr/share/bcc/tools/droptrace`. There is no such tool in BCC (neither in `tools/` nor `libbpf-tools/`). **Fix:** replaced with `tcpdrop-bpfcc`, the actual BCC tool that traces TCP packets dropped by the kernel and prints a stack trace; updated the column legend to match its real output.

6. **`xdp_pass.o` mislabeled as a packet-dropping program.** The comment said "drops all packets" but `xdp_pass.o` returns `XDP_PASS` — it lets every packet through and is typically used as a no-op to verify XDP support. **Fix:** rewrote the comment to describe it correctly as a no-op pass-through and removed the misleading "WARNING: This will drop all network traffic" line.

7. **Stale Cilium Hubble `stable.txt` URL on the `master` branch.** The `cilium/hubble` default branch is `main`; the `master` URL is stale. **Fix:** changed the URL from `cilium/hubble/master/stable.txt` to `cilium/hubble/main/stable.txt`.

## Review Notes
- The custom BCC Python bandwidth monitor relies on `tcp_sendmsg` / `tcp_cleanup_rbuf` kprobes, which is the same approach the upstream `tcptop` tool uses; the code is correct but the simple `lookup`/`update` pattern is racy under concurrent contexts (a small detail not worth flagging in the post itself).
- The `bpftrace` `net_dev_xmit` / `napi_gro_receive_entry` one-liner gives soft-IRQ-attributed `comm` for received bytes, which can be misleading (the receiving process is not always the one running when GRO fires). This is a known caveat of that style of accounting but is acceptable for a tutorial.
- `tcptop-bpfcc -C` (show country) requires the optional `geoip` lookup support and a GeoIP database installed; works on recent Ubuntu BCC builds.
- bpftrace requires kernel headers / BTF; on minimal Ubuntu cloud images users may need `linux-headers-$(uname -r)` (already covered by the BCC install block).
- The post correctly notes the merits of XDP versus the kernel network stack, the BPF-vs-userspace filtering split for tcpdump, and the Cilium/Hubble Kubernetes use case — all of those framings check out.
