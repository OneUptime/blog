# Validation Summary: Monitor IP-in-IP Encapsulation in Calico

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Calico IPPool resources
- IP-in-IP encapsulation
- VXLAN encapsulation
- Kubernetes
- kubectl
- calicoctl
- Prometheus Operator PrometheusRule
- Felix Prometheus metrics
- iperf3

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico calico/node configuration and readiness documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The introduction said Calico supports two IPIP modes, omitting `Never`. Updated this to say Calico supports two enabled IPIP modes and that `Never` disables IPIP on a pool.
- The Felix/BIRD readiness command was described as checking Felix status and IPIP tunnel information, but `-bird-ready` checks BGP readiness. Replaced it with `/bin/calico-node -felix-ready` and adjusted the description to dataplane readiness.
- The `kubectl exec` examples did not specify the `calico-node` container. Added `-c calico-node` to avoid ambiguity in multi-container pods.
- The iperf client/server examples omitted `--restart=Never`, which is the appropriate `kubectl run` mode for one-off diagnostic pods. Added it to both commands.
- The IPIP overhead comment claimed a broad 20-50 byte overhead and 2-5% throughput reduction. Calico documents IP-in-IP as a 20-byte header. Updated the statement and removed the unsupported fixed throughput percentage.
- The CrossSubnet example reapplied a full IPPool manifest containing fields such as `blockSize`, which Calico documents as create-time only. Replaced it with a `calicoctl patch` command for `ipipMode` and `vxlanMode`.
- The route verification command implied same-subnet nodes should have no `tunl0` at all. In CrossSubnet mode, same-subnet routes avoid `tunl0`, while cross-subnet routes still use it. Updated the wording and command.
- The Prometheus alert used `felix_int_dataplane_failures_total`, but the current Calico Felix metric reference lists `felix_int_dataplane_failures`. Updated the alert expression.

## Review Notes
- The examples assume an operator-style `calico-system` namespace and `k8s-app=calico-node` label. Manifest-based installs may use `kube-system`; operators should adjust the namespace if their install differs.
- The Prometheus alert detects Felix dataplane update failures, which can include IPIP tunnel programming failures, but it is not an IPIP-only packet-drop metric.
