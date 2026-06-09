# Validation Summary: How to Configure K3s for Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubectl, manifests, PVC, Ingress, LimitRange)
- Multipass (Ubuntu VM manager for macOS)
- WSL2 (Windows Subsystem for Linux)
- Helm (ingress-nginx chart)
- NGINX Ingress Controller (ingress-nginx)
- containerd / k3s ctr / crictl
- Skaffold (v4beta API)
- k9s terminal UI
- Lens IDE
- systemd (drop-in units, resource limits)
- CoreDNS

## Sources Consulted
- K3s official documentation: https://docs.k3s.io/ (installation, configuration options, default kubeconfig path, disable flags, config.yaml structure, uninstall scripts)
- K3s installation options reference: https://docs.k3s.io/installation/configuration
- K3s storage / local-path provisioner: https://docs.k3s.io/storage and https://github.com/rancher/local-path-provisioner
- Multipass CLI reference: https://multipass.run/docs/launch-command (`--cpus`, `--memory`, `--disk`, `--name` flags)
- Kubernetes Ingress API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#ingress-v1-networking-k8s-io (networking.k8s.io/v1, ingressClassName, pathType)
- Kubernetes LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- ingress-nginx Helm chart: https://kubernetes.github.io/ingress-nginx/ (chart values, annotations like proxy-body-size, proxy-read-timeout)
- Skaffold API reference: https://skaffold.dev/docs/references/yaml/ (v4beta schema, build/local/push, hooks, sync)
- systemd.resource-control(5): MemoryMax, CPUQuota directives
- containerd ctr documentation and K3s ctr wrapper behavior

## Issues Found
- Line 627: The heading "Resource Management for Development" was missing its `## ` Markdown prefix, so it rendered as plain text rather than a section heading. Added `## ` to make it a proper level-2 heading consistent with the rest of the post structure.

All technical content was verified accurate:
- K3s install commands and flags (`--disable traefik`, `--disable servicelb`, `--write-kubeconfig-mode`, `--kube-apiserver-arg`) are correct.
- The default kubeconfig path `/etc/rancher/k3s/k3s.yaml` and config file path `/etc/rancher/k3s/config.yaml` are correct.
- Multipass CLI flags (`--cpus`, `--memory`, `--disk`, `--name`) match the documented CLI.
- The `sed -i ''` form is correct for BSD sed on macOS.
- The local-path provisioner default storage path `/var/lib/rancher/k3s/storage` and the `nodePathMap` config with the `DEFAULT_PATH_FOR_NON_LISTED_NODES` sentinel are correct.
- ingress-nginx Helm chart name, namespace creation flag, and the noted annotations are valid.
- Ingress resource uses `networking.k8s.io/v1` with `ingressClassName` and `pathType: Prefix` — current and correct.
- `k3s ctr images import`, `k3s crictl ps -a`, `k3s crictl logs` are correct subcommands.
- Uninstall script paths `/usr/local/bin/k3s-uninstall.sh` and `/usr/local/bin/k3s-agent-uninstall.sh` match K3s defaults.
- CoreDNS label selector `k8s-app=kube-dns` is the actual label used by the K3s-bundled CoreDNS deployment.
- systemd drop-in syntax with `MemoryMax` and `CPUQuota` is correct.
- Skaffold `apiVersion: skaffold/v4beta5` is a valid v4beta schema version; `build.local.push`, `artifacts`, `sync.manual`, `deploy.kubectl`, and host hooks are all valid fields.
- LimitRange spec fields (`default`, `defaultRequest`, `max`, `min`, `type: Container`) are correct.

## Review Notes
- The mermaid subgraph declaration `subgraph K3s Cluster` (without quotes) is parsed by most mermaid renderers as identifier `K3s` with the rest as the title; it generally renders fine but quoting the title (`subgraph "K3s Cluster"`) would be slightly more defensive. Left as-is since it is not technically incorrect.
- The Skaffold schema version (`v4beta5`) is valid but Skaffold periodically rolls forward minor v4beta versions; the file may need a bump in the future, though older versions remain accepted.
- The `brew install multipass` line works because modern Homebrew auto-routes to the cask; some users on older Homebrew versions may need `brew install --cask multipass`.
- The `--kube-apiserver-arg="enable-admission-plugins=NodeRestriction"` flag is correct, but NodeRestriction is already enabled by default in upstream Kubernetes and in K3s; passing it explicitly is harmless but redundant. Not flagged as an error since the example is illustrative.
- The eviction-hard kubelet arg uses very low thresholds (`memory.available<100Mi`, `nodefs.available<1Gi`) which the comment frames as "lower default limits for development"; this is a reasonable dev posture but could trigger pod eviction more eagerly than the kubelet defaults on tightly constrained machines.
