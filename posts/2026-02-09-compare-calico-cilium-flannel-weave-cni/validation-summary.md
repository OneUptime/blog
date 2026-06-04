# Validation Summary: How to Compare Calico, Cilium, Flannel, and Weave CNI Plugin Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- kind
- Flannel
- Calico
- Cilium
- Weave Net
- iperf3
- netperf
- Kubernetes NetworkPolicy
- Helm

## Sources Consulted
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Flannel GitHub installation instructions: https://github.com/flannel-io/flannel
- Calico quickstart documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Cilium installation on kind documentation: https://docs.cilium.io/en/stable/installation/kind/
- Cilium metrics command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Weave Net NetworkPolicy documentation: https://kubernetes.io/docs/tasks/configure-pod-container/weave-network-policy/
- Weave Net upstream repository: https://github.com/weaveworks/weave
- networkstatic/iperf3 Docker Hub documentation: https://hub.docker.com/r/networkstatic/iperf3/
- networkstatic/netserver Docker Hub documentation: https://hub.docker.com/r/networkstatic/netserver

## Issues Found
- The post described Calico, Cilium, Flannel, and Weave as the "four most popular" CNI plugins. Weave Net's upstream repository was archived on June 20, 2024, so I changed this to "four well-known CNI plugins."
- The kind pod subnet example used `10.244.0.0/16`, which matches Flannel's default manifest but not Calico's default custom resources. I added a note to adjust the pod CIDR to match the CNI manifest under test.
- The Calico installation commands used v3.27.0 and omitted the current documented CRD manifest step. I updated the commands to v3.32.0 and added `v1_crd_projectcalico_org.yaml`.
- The Cilium Helm command used v1.15.0 and omitted the kind-specific `ipam.mode=kubernetes` setting from the official Cilium kind guide. I updated the command to v1.19.4 and added the setting.
- The iperf3 client pod lacked the `app: iperf3-client` label required by the later NetworkPolicy example. I added the label so the policy allows the intended client traffic.
- The netperf server used the client-oriented `networkstatic/netperf` image. I changed the server command to use `networkstatic/netserver`, matching the image documentation.
- The Cilium metrics command used `cilium metrics list`; current Cilium command reference documents `cilium-dbg metrics list`. I updated the command.
- The Weave recommendation said encrypted networking was available "out of the box." I revised it to acknowledge that Weave is now an archived project while preserving the encryption guidance.

## Review Notes
The benchmark numbers are environment-specific and cannot be independently validated from the post alone. The post already warns readers that results vary by hardware, network infrastructure, node specifications, and workload patterns. Weave Net can still be discussed historically or for existing deployments, but future revisions should consider whether an archived CNI should be included in a current comparison.
