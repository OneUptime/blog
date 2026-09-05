# Validation Summary: kube-apiserver Cannot Create the Storage Backend: Trace etcd DNS, Certificates, and Port 2379

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and configuration examples.

## Technologies Covered
- Kubernetes kube-apiserver, kubeadm, static Pods, and API health endpoints
- etcd 3.6, etcdctl, Raft quorum, and client/peer listeners
- DNS, Linux resolver configuration, TCP routing, and gRPC/HTTP2
- TLS, X.509 certificates, OpenSSL, and PKI file permissions
- crictl, systemd journal inspection, and netcat

## Sources Consulted
- Kubernetes API-server flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes PKI roles and paths: https://kubernetes.io/docs/setup/best-practices/certificates/
- Kubernetes ports: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- kubeadm static-Pod implementation and local etcd endpoints: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Pod DNS policies: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- kubeadm certificate renewal and restarts: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- crictl usage: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- crictl logs implementation: https://raw.githubusercontent.com/kubernetes-sigs/cri-tools/master/cmd/crictl/logs.go
- etcd 3.6 transport security: https://etcd.io/docs/v3.6/op-guide/security/
- etcd 3.6 configuration: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd endpoint status and discovery options: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd 3.6.0 endpoint command implementation: https://raw.githubusercontent.com/etcd-io/etcd/v3.6.0/etcdctl/ctlv3/command/ep_command.go
- etcd monitoring: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd performance: https://etcd.io/docs/v3.6/op-guide/performance/
- etcd membership changes: https://etcd.io/docs/v3.6/op-guide/runtime-configuration/
- OpenSSL s_client: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenSSL x509: https://docs.openssl.org/3.5/man1/openssl-x509/
- OpenSSL verification options: https://docs.openssl.org/3.5/man1/openssl-verification-options/
- Go certificate verification: https://pkg.go.dev/crypto/x509
- OpenBSD netcat options: https://man.openbsd.org/nc
- Linux getent manual: https://man7.org/linux/man-pages/man1/getent.1.html

## Issues Found
1. **Mutual TLS presented as universal.** Scoped the introductory certificate requirements to the mutual-TLS deployment described. etcd also supports other transport/authentication configurations; the secure configuration remains the guide's focus.
2. **Replica configuration equivalence overstated.** Replaced the requirement for identical endpoints and trust material with topology-appropriate endpoints and valid trust for the same cluster. Stacked deployments can use local members and independently issued client certificates. Adjusted the later endpoint-change guidance consistently.
3. **Network namespace mistaken for full resolver context.** Clarified that host checks are preliminary and that the container's resolver and hosts files must also be matched. Sharing a network namespace does not share its filesystem. Removed the implication that getent reports TTLs.
4. **DNS certificate identity described incorrectly.** Changed the round-robin warning to require each server certificate to cover the configured hostname. Resolving a DNS endpoint to an IP does not require that IP to appear in the certificate SANs.
5. **Listener and routing requirements too strict.** Allowed wildcard listener bindings and accounted for forwarding through a load balancer or NAT. Replaced mandatory symmetric routing with working return routing through stateful firewalls; path symmetry is not an intrinsic TCP requirement.
6. **Leaf-only output described as chain inspection.** Corrected the description of the s_client-to-x509 pipeline and explained how the standalone s_client command can display all certificates sent by the server. A sent certificate list is not itself a verified chain.
7. **OpenSSL and Go hostname verification conflated.** Explained OpenSSL's possible Common Name fallback and retained the explicit SAN check required to match Kubernetes behavior. Specified the correct `-verify_ip` option for literal IP endpoints.
8. **Explicit client EKU treated as mandatory in every certificate.** Clarified that a certificate must permit client authentication when an Extended Key Usage extension is present. An absent EKU does not itself impose that restriction.
9. **etcdctl could not read protected kubeadm keys as an ordinary user.** Added sudo to both examples, matching the existing privileged OpenSSL commands and the guide's restrictive key-permission requirement.
10. **Exact endpoints replaced by discovered endpoints.** Removed `--cluster` from the primary health/status examples. Documented its use as a separate discovery check, because it tests member-advertised URLs instead of preserving the explicit endpoint set.
11. **Health check incorrectly described as a committed write proposal.** Checked the etcd 3.6.0 implementation, which issues a linearizable Get and an alarm-list request. Corrected the explanation and noted that permission-denied reads can pass the consensus portion, so health does not establish application authorization. The CLI's historical success wording is not a literal description of a test write.
12. **Latency bound direction ambiguous.** Specified that peer round-trip and durable disk latency determine a lower bound on consensus write latency, not an upper bound.

## Review Notes
- Reviewed all command blocks and configuration snippets. The API-server storage/etcd flags, client and peer URL flags, certificate inspection flags, endpoint status output options, and livez/readyz paths are supported by the consulted references.
- The original Kubernetes and etcd documentation links resolve to the relevant resources. The author profile link is attribution, not technical evidence.
- Examples assume Linux control-plane hosts, OpenBSD-compatible netcat options, an OpenSSL version supporting the displayed flags, and an installed etcdctl compatible with the deployment. Replace the container-ID placeholder and example hostnames with real values before execution.
- This was a documentation and source review, not a live-cluster test. No production endpoints, private keys, restarts, membership changes, or diagnostic object writes were accessed or executed.
- Retained the quorum-safe repair, role-specific PKI, version-matched renewal, reversible API verification, and sequential replica restart guidance. The post's existing structure and tone were preserved.
