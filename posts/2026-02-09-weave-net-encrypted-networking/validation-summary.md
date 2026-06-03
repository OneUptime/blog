# Validation Summary: How to Use Weave Net for Encrypted Pod Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Weave Net
- Kubernetes CNI
- Kubernetes Secrets
- Kubernetes DaemonSets
- Kubernetes NetworkPolicy
- Weave Net encryption
- Weave Net fast datapath
- Prometheus ServiceMonitor

## Sources Consulted
- Weave Net Kubernetes addon documentation: https://raw.githubusercontent.com/weaveworks/weave/master/site/kubernetes/kube-addon.md
- Weave Net securing untrusted networks documentation: https://raw.githubusercontent.com/weaveworks/weave/master/site/tasks/manage/security-untrusted-networks.md
- Weave Net encryption concepts: https://raw.githubusercontent.com/weaveworks/weave/master/site/concepts/encryption.md
- Weave Net encryption implementation details: https://raw.githubusercontent.com/weaveworks/weave/master/site/concepts/encryption-implementation.md
- Weave Net fast datapath documentation: https://raw.githubusercontent.com/weaveworks/weave/master/site/tasks/manage/fastdp.md
- Weave Net fast datapath implementation overview: https://raw.githubusercontent.com/weaveworks/weave/master/site/concepts/fastdp-how-it-works.md
- Weave Net v2.8.1 Kubernetes DaemonSet manifest: https://github.com/weaveworks/weave/releases/download/v2.8.1/weave-daemonset-k8s.yaml
- Weave Net Prometheus metrics documentation and source: https://github.com/weaveworks/weave/blob/master/site/tasks/manage/metrics.md and https://github.com/weaveworks/weave/blob/master/prog/weaver/metrics.go
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus Operator ServiceMonitor reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/ServiceMonitor/v1
- PCI DSS Requirement 4 overview: https://www.pcisecuritystandards.org/

## Issues Found
- The install command used the old `https://cloud.weave.works/k8s/net` endpoint, which now returns 404. Replaced it with the official Weave Net v2.8.1 release manifest URL and instructions to add `WEAVE_PASSWORD` to the `weave` container before applying.
- The encryption description claimed Weave uses NaCl with PBKDF2 for all encrypted traffic. Updated it to match Weave documentation: sleeve/control-plane traffic uses NaCl with Curve25519, XSalsa20, and Poly1305; fast datapath uses IPsec ESP with AES-GCM; the shared password is mixed into an ephemeral Diffie-Hellman key and hashed with SHA-256.
- The DaemonSet snippet set `WEAVE_NO_FASTDP` to `"false"` to enable fast datapath. In Weave, any non-empty `WEAVE_NO_FASTDP` value disables fastdp, so the snippet now warns not to set it unless disabling fastdp.
- The MTU comment implied `1376` was derived from `1450 - encryption overhead`. Weave Net documents `1376` as its default and requires the underlay to carry that value plus overlay overhead, so the comment was corrected.
- The `CONN_LIMIT` comment described a peer discovery timeout. It is a soft connection limit, so the comment was corrected.
- The iperf client attempted to connect to a pod name without creating a Service. Added `kubectl expose pod iperf-server` and explicit port usage so `iperf-server` resolves in cluster DNS.
- The fast datapath section showed an unsupported ConfigMap configuration. Replaced it with the documented behavior: fastdp is automatic when supported, can be disabled with `WEAVE_NO_FASTDP`, and encrypted fastdp may require ESP traffic between nodes.
- The key rotation command used invalid `kubectl set env` syntax for a `valueFrom.secretKeyRef`. Replaced it with a strategic merge patch and noted the temporary disruption expected while peers restart with the new password.
- The troubleshooting text referred to certificate errors, but Weave's password-based encryption does not use service mesh-style certificates. Changed this to authentication errors or password mismatches.
- The monitoring metric descriptions overstated `weave_connections` and `weave_flows` as encrypted-only metrics. Updated them to match Weave's documented metric names and labels.
- The compliance documentation example listed only NaCl encryption and an old PCI DSS 4.1 reference. Updated it to mention both Weave encryption modes and PCI DSS Requirement 4.
- The service mesh comparison incorrectly said service meshes encrypt only HTTP/gRPC traffic. Revised the comparison to reflect that mesh support varies and can include TCP depending on configuration.
- Added a maintenance caveat that Weave Net is archived and no longer actively maintained, which is important for a 2026 production guide.

## Review Notes
Weave Net remains technically relevant for existing clusters, but it is archived and its latest release is v2.8.1 from 2021. New production Kubernetes clusters should evaluate actively maintained CNI options before choosing Weave Net.
