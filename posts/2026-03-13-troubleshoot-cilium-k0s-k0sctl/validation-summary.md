# Validation Summary: Troubleshoot Cilium on k0s with k0sctl

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- k0s
- k0sctl
- eBPF networking
- kubectl

## Sources Consulted
- Cilium official k0s/k0sctl installation guide: https://docs.cilium.io/en/latest/installation/k0s/
- Cilium CLI `install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium Kubernetes host-scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium Kubernetes version requirements for Cilium 1.19.3: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium Helm values reference for `kubeProxyReplacement`: https://docs.cilium.io/en/stable/helm-values/
- k0s networking documentation for custom CNI providers: https://docs.k0sproject.io/stable/networking/
- k0s configuration reference for `spec.network`: https://docs.k0sproject.io/v1.29.2+k0s.0/configuration/
- k0sctl usage documentation: https://docs.k0sproject.io/v1.33.9+k0s.0/k0sctl-install/
- k0sctl README command reference: https://github.com/k0sproject/k0sctl

## Issues Found
- The `k0sctl apply` commands did not use `--no-wait`. With `network.provider: custom`, nodes can remain `NotReady` until Cilium is installed, so a normal apply may wait on CNI-dependent readiness. Updated both apply examples to include `--no-wait`, matching the official Cilium k0s/k0sctl installation guide.
- The example pinned `k0s` to `1.29.0+k0s.0`, which is outdated for a 2026 post and did not include the `v` prefix used in current k0sctl examples. Updated it to `v1.34.5+k0s.0`, which aligns with the Kubernetes versions tested by Cilium 1.19.3.
- The Cilium install command pinned `--version 1.15.0`, which is outdated. Updated it to `--version 1.19.3`, the current stable release shown in the official Cilium documentation consulted during review.
- The `k0sctl kubeconfig` example relied on the default config path. Updated it to `k0sctl kubeconfig --config k0sctl.yaml` for consistency with the configured cluster file and official k0sctl command examples.

## Review Notes
The guide intentionally keeps `kubeProxyReplacement=false`, which is valid when k0s deploys kube-proxy. If readers want Cilium to replace kube-proxy, they must also disable kube-proxy in the k0s network configuration and provide the Kubernetes API service host and port settings as described in the Cilium kube-proxy-free documentation.
