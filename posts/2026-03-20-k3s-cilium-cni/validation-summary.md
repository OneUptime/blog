# Validation Summary: How to Configure K3s with Cilium CNI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- Cilium
- eBPF
- Helm
- Hubble
- Gateway API
- WireGuard
- CiliumNetworkPolicy

## Sources Consulted
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium installation on K3s: https://docs.cilium.io/en/stable/installation/k3s/
- Cilium installation using Helm: https://docs.cilium.io/en/latest/installation/k8s-install-helm/
- Cilium Hubble setup: https://docs.cilium.io/en/latest/observability/hubble/setup/
- Cilium Gateway API support: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium ingress support: https://docs.cilium.io/en/latest/network/servicemesh/ingress/
- Cilium mutual authentication: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium WireGuard encryption: https://docs.cilium.io/en/latest/security/network/encryption-wireguard.html
- Cilium command reference for `cilium encryption status`: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- K3s basic network options: https://docs.k3s.io/networking/basic-network-options
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s HelmChart reference: https://docs.k3s.io/add-ons/helm

## Issues Found
- The post stated an outdated Cilium kernel minimum (`4.9.17+`). I updated it to the current documented requirement of Linux kernel `5.10+` or an equivalent vendor kernel, and corrected the kernel/BPF filesystem verification commands to match current Cilium guidance.
- The K3s install example disabled `kube-proxy` without addressing K3s control-plane egress behavior. I added `--egress-selector-mode=cluster` and the matching config-file entry so the apiserver can continue reaching service endpoints in kube-proxy-free mode on K3s.
- The post omitted the `KUBECONFIG` export needed for later `kubectl` and `cilium` CLI commands against a K3s cluster. I added `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`.
- The auto-deploy HelmChart example pinned an outdated Cilium chart version (`1.15.2`). I updated it to `1.19.3`, which matches the current official install examples consulted during review.
- The Cilium CLI install snippet downloaded the wrong artifact format and was hardcoded to `amd64`. I replaced it with the current official tarball, checksum-validation, and architecture-detection flow.
- The verification step used `cilium endpoint list` inside the agent pod. Current Cilium docs use the in-agent debug client, so I changed it to `cilium-dbg endpoint list`.
- The Hubble CLI install snippet was broken: it used the old `master` branch path, piped a file download incorrectly, and did not extract the tarball correctly. I replaced it with the current official install flow and checksum validation.
- The WireGuard verification command used the wrong CLI subcommand (`cilium encrypt status`). I corrected it to `cilium encryption status`.
- The Gateway API / service mesh step omitted required Gateway API CRDs and rollout restarts after enabling the controller. I added the required CRD install commands, restart commands, and a more relevant verification step.
- The introduction and conclusion overstated Cilium’s mutual-TLS story as a built-in baseline feature. I softened this to optional service-mesh capabilities so it matches the current Cilium documentation, where mutual authentication remains a separate feature with additional setup.

## Review Notes
- The Helm install example still uses `ipam.mode=kubernetes` and `cni.exclusive=false`. These values are valid, but they differ from the current default K3s install example in Cilium’s docs, so this section should be re-checked if the post is revised again.
- The service-mesh step assumes an environment with LoadBalancer support for the default ingress/Gateway services. On bare-metal K3s, a NodePort or host-network approach may be required instead.
- The pinned chart version in the K3s HelmChart manifest is accurate as of April 29, 2026, but should be revisited as new Cilium releases become the documented stable recommendation.
