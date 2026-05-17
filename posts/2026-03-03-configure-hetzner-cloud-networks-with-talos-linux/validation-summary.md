# Validation Summary: How to Configure Hetzner Cloud Networks with Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.x machine config, talosctl)
- Hetzner Cloud (private networks, servers, locations, load balancers)
- Hetzner Cloud Controller Manager (CCM) — `ccm-networks.yaml`
- Hetzner CSI Driver
- Kubernetes (kubelet, Services of type LoadBalancer, StorageClass)
- `hcloud` CLI, `kubectl`, `talosctl`

## Sources Consulted
- Hetzner CCM load balancer annotations reference — https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/docs/reference/load_balancer_annotations.md
- Hetzner CCM releases (verified `ccm-networks.yaml` asset) — https://github.com/hetznercloud/hcloud-cloud-controller-manager/releases
- Hetzner CSI driver repository — https://github.com/hetznercloud/csi-driver
- Hetzner Cloud Networks MTU documentation — https://docs.hetzner.com/networking/networks/troubleshooting/mtu/
- Hetzner Cloud locations reference — https://docs.hetzner.com/cloud/general/locations/
- Talos Linux Hetzner platform docs — https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/cloud-platforms/hetzner/
- Talos Linux configuration patching docs — https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/patching
- Talos Image Factory — https://factory.talos.dev
- `hcloud` CLI reference (network subcommands)

## Issues Found
1. **Wrong `hcloud` subcommand for subnets.** The post used `hcloud network create-subnet`, which does not exist. The correct subcommand is `hcloud network add-subnet`. Changed in the "Creating the Network" section.
2. **Outdated Talos image download URL.** The post pointed to `https://github.com/siderolabs/talos/releases/download/v1.7.0/hcloud-amd64.raw.xz`, but Talos no longer publishes the Hetzner raw image as a GitHub release asset — Hetzner images for Talos are now served via the Talos Image Factory and require a schematic ID. Replaced the URL with a `https://factory.talos.dev/image/<schematic-id>/v1.7.0/hcloud-amd64.raw.xz` form and updated the surrounding comments to direct readers to factory.talos.dev.
3. **CSI driver URL tracking `main`.** The post deployed the CSI driver from `…/csi-driver/main/deploy/kubernetes/hcloud-csi.yml`. The file still resolves there, but pinning to `main` is fragile because the manifest is regenerated on each release. Pinned the URL to the `v2.21.0` tag instead.

## Review Notes
- The Hetzner CCM is now also installable (and officially recommended) via the Helm chart at `https://charts.hetzner.cloud/`. The post uses the YAML manifest, which is still supported but considered the legacy install path; a future revision could mention Helm as the preferred option.
- The Hetzner CSI driver's primary install method is now Helm (`helm install hcloud-csi hcloud/hcloud-csi -n kube-system`). The raw-YAML deployment used in the post still works for now, but readers maintaining the cluster long-term should consider migrating to Helm.
- Talos v1.7.0 is referenced explicitly. Newer Talos releases exist (1.8.x, 1.9.x); the documented config fields (`cluster.externalCloudProvider`, `machine.kubelet.nodeIP.validSubnets`, `machine.kubelet.extraArgs`) remain valid in those versions, but users on newer versions should consult the matching docs.
- All nine `load-balancer.hetzner.cloud/*` annotations used in the post were verified against the upstream annotation reference. They are correct, including `algorithm-type`, `uses-proxyprotocol`, and `use-private-ip`.
- The MTU value of 1450 for the Hetzner private network interface is correct (it is the maximum MTU on Hetzner Cloud Networks; vSwitch VLANs are a separate case at 1400).
- The `ash` location code for Ashburn is correct (not `ash1`).
- The `talosctl --config-patch` JSON-array form shown in the post is a valid RFC 6902 patch and is supported by talosctl.
