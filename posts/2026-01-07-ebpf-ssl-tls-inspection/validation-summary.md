# Validation Summary: How to Inspect SSL/TLS Traffic with eBPF

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- eBPF uprobes and uretprobes
- BCC / BPF Compiler Collection
- OpenSSL SSL_read, SSL_write, and certificate APIs
- GnuTLS record APIs
- NSS / NSPR socket I/O APIs
- Linux capabilities for BPF tracing
- HTTP/2 frame parsing
- Python ctypes and BCC user-space collectors

## Sources Consulted
- Linux kernel BPF Design Q&A: https://docs.kernel.org/bpf/bpf_design_QA.html
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- Linux capabilities manual: https://man7.org/linux/man-pages/man7/capabilities.7.html
- OpenSSL SSL_write documentation: https://docs.openssl.org/3.0/man3/SSL_write/
- OpenSSL SSL_read documentation: https://docs.openssl.org/3.6/man3/SSL_read/
- OpenSSL SSL_get_peer_certificate / SSL_get1_peer_certificate documentation: https://docs.openssl.org/3.3/man3/SSL_get_peer_certificate/
- GnuTLS manual / record API documentation: https://www.gnutls.org/manual/gnutls.html
- NSS / NSPR socket I/O documentation: https://nss-crypto.org/reference/security/nss/legacy/reference/nspr_functions/index.html
- RFC 9113 HTTP/2: https://datatracker.ietf.org/doc/rfc9113/
- Local OpenSSL symbol check with `nm -D /usr/lib/x86_64-linux-gnu/libssl.so.3`

## Issues Found
- The BPF examples allocated 4 KB event structs on the BPF stack, which exceeds the documented 512-byte BPF stack limit. Changed the stack-based examples to 256-byte capture buffers and added guidance to use per-CPU scratch maps or ring-buffer reservation for larger captures.
- The prerequisite section implied CAP_BPF alone is sufficient for BPF tracing on modern kernels. Updated it to mention CAP_BPF and CAP_PERFMON, with older kernels generally requiring CAP_SYS_ADMIN or root.
- The Ubuntu package install command used `bpftool` later but did not install it. Added `bpftool` to the package list.
- The certificate example used deprecated OpenSSL 3 `SSL_get_peer_certificate` and did not preserve the SSL argument for the return probe. Updated it to probe `SSL_get1_peer_certificate`, added an entry probe for argument capture, and verified the symbol exists locally in OpenSSL 3.
- The certificate section claimed subject, issuer, and serial extraction, but the code only captured pointers and verification metadata. Revised the diagram and wording to match what the code actually does.
- Several multi-library and production snippets ignored `bpf_probe_read_user()` failures. Added return-value checks before submitting events.
- The GnuTLS BPF snippet used `size_t` and `ssize_t` without including definitions suitable for the embedded BPF C snippet. Replaced them with `unsigned long` and `long`.
- The production example converted `bpf_ktime_get_ns()` to wall-clock time with `datetime.fromtimestamp()`. Updated output to label it correctly as monotonic nanoseconds since boot.
- The HTTP/2 parser referenced RFC 7540, which is obsolete. Updated the reference to RFC 9113.
- The QUIC wording suggested the same SSL_read/SSL_write technique applies directly to QUIC. Added a caveat that QUIC requires different probe points.
- The security wrapper's group authorization check ignored the process primary group. Updated it to include the primary group along with supplementary groups.

## Review Notes
The examples remain educational BCC snippets rather than a fully portable production agent. Future improvements could add `SSL_read_ex` / `SSL_write_ex` probes, Go `crypto/tls` coverage, statically linked library caveats, and a per-CPU scratch-map implementation for larger payload capture.
