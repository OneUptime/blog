# Validation Summary: How to Configure CNI Plugins for IPv6 (Calico, Cilium, Flannel)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- IPv4/IPv6 dual-stack networking
- Container Network Interface (CNI)
- Calico
- Cilium
- Flannel
- `kubectl`

## Sources Consulted
- Calico dual-stack docs: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico overlay networking docs: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico latest release: https://github.com/projectcalico/calico/releases/latest
- Cilium quick installation docs: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Kubernetes Host Scope IPAM docs: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium CLI stable version file: https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt
- Cilium latest release: https://github.com/cilium/cilium/releases/latest
- Flannel configuration docs: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Flannel upstream manifest: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
- Flannel latest release: https://github.com/flannel-io/flannel/releases/latest
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes JSONPath docs: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The Calico operator manifest URL was pinned to `v3.27.0`, which is behind the current release series. Updated it to `v3.32.0` so the install example matches the current upstream release as of 2026-05-06.
- The Cilium install example used older Helm keys and an unnecessary kube-proxy-replacement setup. Replaced `tunnel=vxlan` with `routingMode=tunnel` and `tunnelProtocol=vxlan`, added `ipam.mode=kubernetes` to match the values example, and removed the unreliable `k8sServiceHost=$(kubectl get node ...)` approach because current docs only require those settings for kube-proxy replacement.
- The Cilium Helm values block used an outdated `bgp` section. Updated it to `bgpControlPlane.enabled`, which matches current Cilium documentation.
- The Flannel command used `kubectl patch --patch-file` with a full ConfigMap manifest. Changed it to `kubectl apply -f flannel-configmap.yaml`, which matches the object shown in the post.
- The verification section had two command/output issues. Updated `kubectl get pod ... -o jsonpath='{.status.podIPs}'` to `'{.status.podIPs[*].ip}'` so the displayed example matches kubectl JSONPath output, and fixed `cilium connectivity test --test '//pod-to-pod'` to `--test '/pod-to-pod'`.
- Normalized `kubectl get ippool -o wide` to `kubectl get ippools -o wide` to match the Calico resource name.

## Review Notes
- Flannel dual-stack support is currently limited to the `vxlan`, `wireguard`, and `host-gw` backends, and its docs call out node IPv4/IPv6 addressing and IPv6 routing prerequisites. The post’s Flannel example uses `vxlan`, so it remains valid.
- Cilium `ipam.mode=kubernetes` assumes the Kubernetes cluster is already configured to allocate dual-stack PodCIDRs.
- Calico VXLAN over IPv6 has kernel requirements documented by Tigera; the post’s example is valid when those requirements are met.
