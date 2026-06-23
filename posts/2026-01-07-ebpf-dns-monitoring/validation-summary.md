# Validation Summary: How to Monitor DNS Queries with eBPF

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- BCC
- libbpf
- XDP
- Linux TC / SCHED_CLS
- DNS packet parsing
- Python
- Prometheus metrics

## Sources Consulted
- Linux kernel documentation: BPF ring buffer: https://www.kernel.org/doc/html/latest/bpf/ringbuf.html
- Linux kernel documentation: libbpf program types and ELF sections: https://docs.kernel.org/bpf/libbpf/program_types.html
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- RFC 1035: Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/html/rfc1035
- IANA DNS Parameters: https://www.iana.org/assignments/dns-parameters
- tc-bpf Linux manual page: https://man7.org/linux/man-pages/man8/tc-bpf.8.html
- bpftool feature manual: https://man.archlinux.org/man/bpftool-feature.8.en
- Prometheus Python client documentation: https://prometheus.github.io/client_python/

## Issues Found
- The prerequisites stated Linux 4.14+ as the baseline for the whole post, but the ring buffer examples require Linux 5.8+. Updated the prerequisite wording to distinguish older BCC examples from the ring buffer examples.
- The Ubuntu/Debian and RHEL/CentOS install commands used `bpftool feature probe` but did not install `bpftool`. Added `bpftool` to both package install commands.
- The basic kprobe example claimed to capture DNS query details but only read socket metadata from `udp_sendmsg`. Updated the text and comments to state that it captures metadata only and does not parse the DNS payload.
- The basic libbpf kprobe example used `bpf_ntohs()` without including `<bpf/bpf_endian.h>`. Added the missing include.
- Several ring buffer event structures were submitted without being initialized after `bpf_ringbuf_reserve()`. Added `__builtin_memset()` calls before populating ring buffer events and alerts.
- The XDP parser left some fields uninitialized when DNS name parsing failed or the query type/class were not available. Zero-initializing the event resolves this.
- The XDP parser declared DNS flag variables that were never used. Removed the unused local variables.
- The TC latency example used generic `SEC("tc")` sections. Updated these to `SEC("tc/egress")` and `SEC("tc/ingress")`, matching current libbpf section naming guidance.
- The TC latency example used `TC_ACT_OK` without including `<linux/pkt_cls.h>`. Added the missing include.
- The TC latency example did not validate the IPv4 header length before using it to locate the UDP header. Added the same minimum header-length check used in the XDP example.
- The DNS resolution chain tracing section overstated what the provided `getaddrinfo()` uprobes can observe. Updated the description to clarify that the code traces application-level start and completion, and that packet-level or resolver-specific instrumentation is needed for cache hits, referrals, and upstream hops.
- The libbpf uprobe section names used `SEC("uprobe/libc:getaddrinfo")`, which does not follow libbpf's `uprobe/<path>:<function>` format. Replaced them with a concrete libc path example and a comment that it must be adjusted per distribution.
- The DNS security eBPF snippet was described as a complete detection program, but it only provides helper logic and no attachable hook. Updated the text and comments to say it should be called from an XDP, TC, or socket hook after DNS parsing.

## Review Notes
- Several snippets remain illustrative rather than complete production programs. In particular, the latency monitor's Python loop is explicitly simulated, and the security helper requires integration with a packet-parsing hook.
- The examples focus on IPv4 UDP DNS. DNS over TCP, IPv6, DNS-over-TLS, DNS-over-HTTPS, EDNS, fragmented packets, and full DNS compression-pointer expansion would require additional handling.
- The basic kprobe example still includes a DNS name parsing helper for illustration, but the probe does not use it because reading DNS payload from `msghdr` requires additional iterator handling.
