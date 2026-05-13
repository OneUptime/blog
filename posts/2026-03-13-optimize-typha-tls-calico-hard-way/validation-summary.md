# Validation Summary: How to Optimize Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / How-To guide

## Technologies Covered
- Calico (Project Calico)
- Typha (Calico fan-out proxy)
- Felix (Calico per-node agent)
- Kubernetes (DaemonSets, Deployments, kubectl)
- TLS 1.2 / TLS 1.3
- OpenSSL (ECDSA P-256, RSA)

## Sources Consulted
- Calico Typha config params source: https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go
- Calico issue #9507 (Configure strong cipher suites for Typha TLS connections): https://github.com/projectcalico/calico/issues/9507
- Tigera Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Kubernetes DaemonSet rolling update docs: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes issues #52963 and #61332 (open feature requests for `kubectl top --watch`)
- OpenSSL `ecparam` / `req` / `x509` documentation
- RFC 8446 (TLS 1.3 1-RTT handshake)

## Issues Found

1. **`TYPHA_MINTLSVERSION=VersionTLS13` does not exist.** Verified against the Typha config source (`typha/pkg/config/config_params.go`) — Typha exposes no minimum TLS version setting at all. Calico issue #9507 is the open feature request to add one. The blog presented this as a working configuration knob.
   - **Fix:** Replaced the `kubectl set env ... TYPHA_MINTLSVERSION=VersionTLS13` command with an accurate explanation that Typha relies on the Go runtime's TLS defaults (which negotiate TLS 1.3 automatically when both peers support it), and a command to check the Typha image version. Cross-referenced Calico issue #9507.

2. **`kubectl top pod ... -w` is not a valid flag.** `kubectl top` does not support `--watch` / `-w` (long-standing feature requests, Kubernetes issues #52963 and #61332, both still open). Running the command as written would error out.
   - **Fix:** Replaced with `watch -n 2 kubectl top pod ...` using the Linux `watch` utility, which is the standard workaround.

## Review Notes
- The description in the front matter mentions "session resumption, cipher suite selection" but the body does not cover those topics. Not a technical inaccuracy, but the description is slightly broader than the content.
- The ECDSA P-256 vs RSA 4096 handshake performance claim (~10x faster) is in the right ballpark for server-side signing operations and is fine as a rough heuristic.
- The `openssl ecparam`/`req`/`x509` commands are syntactically correct and will produce a usable ECDSA P-256 CA + server cert pair.
- The DaemonSet `maxUnavailable` default is 1 (per official Kubernetes docs); the post's claim that the default "naturally staggers restarts" is accurate.
- The Typha service port `5473` is correct.
- TLS 1.3 reducing handshake to 1-RTT vs TLS 1.2's 2-RTT (per RFC 8446) is accurate.
- After the fix, Step 2 now reflects reality: TLS 1.3 negotiation in Typha is implicit via the Go runtime rather than configurable, so practitioners should track the upstream feature request if they need to enforce a minimum.
