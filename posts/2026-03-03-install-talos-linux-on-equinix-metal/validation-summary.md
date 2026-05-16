# Validation Summary: How to Install Talos Linux on Equinix Metal

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0 installer image, Talos Image Factory PXE assets)
- Equinix Metal (formerly Packet) bare-metal cloud
- Equinix `metal-cli`
- Kubernetes (kubectl, talosctl)
- MetalLB v0.13.12 (BGP mode)
- Equinix Metal Local BGP
- Cilium CNI
- Longhorn (replacement storage recommendation)

## Sources Consulted
- Talos installer script: https://www.talos.dev/ (`https://talos.dev/install`)
- Talos Image Factory PXE boot path: https://factory.talos.dev/
- Equinix `metal-cli` (`metal device create --userdata-file`): https://github.com/equinix/metal-cli and https://docs.equinix.com/metal/libraries/cli/
- Equinix Metal Local BGP (peers `169.254.255.1`/`169.254.255.2`, peerASN `65530`): https://docs.equinix.com/metal/bgp/local-bgp/ and https://deploy.equinix.com/developers/docs/metal/bgp/bgp-on-equinix-metal/
- MetalLB CRD API versions: https://metallb.universe.tf/configuration/ and https://metallb.universe.tf/apis/ (BGPPeer is `metallb.io/v1beta2`; `IPAddressPool` and `BGPAdvertisement` are `metallb.io/v1beta1`)
- MetalLB v0.13.12 release manifest: https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
- `packethost/csi-packet` archive notice (driver EOL, Datera block storage shut down 2021-06-01): https://github.com/equinixmetal-archive/csi-packet
- Equinix Metal Kubernetes guidance (no first-party CSI today): https://deploy.equinix.com/developers/docs/kubernetes/kubernetes-on-equinix-metal/
- Longhorn release manifest: https://github.com/longhorn/longhorn/releases/tag/v1.6.0

## Issues Found
- **MetalLB `BGPPeer` used the wrong `apiVersion`.** The post declared `metallb.io/v1beta1`, but in MetalLB v0.13.x the `BGPPeer` CRD is served under `metallb.io/v1beta2` (only `IPAddressPool` and `BGPAdvertisement` remain `v1beta1`). Applying the manifest as written would fail with `no matches for kind "BGPPeer" in version "metallb.io/v1beta1"`. Updated both peer resources to `metallb.io/v1beta2`.
- **`BGPPeer` had two `peerAddress` keys in one spec.** `BGPPeerSpec` has a single `peerAddress` string field, so the second mapping key silently overwrites the first in lenient YAML parsers and is outright rejected by strict ones — either way you would never peer with `169.254.255.1`. To peer with both Equinix ToRs (the standard local-BGP setup), you need two separate `BGPPeer` resources. Split the single `equinix-peer` into `equinix-peer-1` (`169.254.255.1`) and `equinix-peer-2` (`169.254.255.2`).
- **`packethost/csi-packet` is archived/EOL.** The repository moved to `equinixmetal-archive/csi-packet` and was archived on 2021-06-07 when the backing Datera block storage was shut down (2021-06-01). The three `setup.yaml` / `node.yaml` / `controller.yaml` URLs the post `kubectl apply`-ed point at a driver that targets a service that no longer exists, so the cluster would never get usable volumes from them. Replaced the snippet with the standard bare-metal recommendation (Longhorn, v1.6.0), and noted in a comment that Equinix Block Storage and `csi-packet` are no longer available.

## Review Notes
- `https://talos.dev/install` is the documented official Sidero install script.
- The `metal-cli` invocations (`metal init`, `metal virtual-network create --vxlan`, `metal ip request --type public_ipv4`, `metal device create --operating-system custom_ipxe --ipxe-script-url --userdata-file`, `metal bgp enable --deployment-type local --asn`, `metal bgp session create --device-id`) all match the current CLI surface.
- The Equinix Metal local-BGP configuration (`peerASN: 65530`, peers `169.254.255.1` / `169.254.255.2`, customer ASN configurable via `metal bgp enable --asn`) is correct. Best practice would be to read the peer addresses from the per-host `/metadata` endpoint instead of hardcoding, but the literals are accurate.
- The Talos machine-config patches (`machine.install.disk`, `machine.install.image`, `machine.network.interfaces[].vip.ip`, `machine.certSANs`, `cluster.controlPlane.endpoint`) are valid Talos v1.7 schema. Using the `<<'EOF'` quoted heredoc plus a subsequent `sed` substitution for `${API_VIP}` is unusual but correct — the heredoc deliberately suppresses shell expansion so the sentinel survives until the `sed` pass.
- `talosctl machineconfig patch --patch @file.yaml --output ...` is correct v1.7 syntax. `talosctl disks --insecure`, `talosctl bootstrap`, `talosctl health --wait-timeout`, `talosctl kubeconfig`, and `talosctl config endpoint/node/merge` are all current.
- The Talos Image Factory iPXE URL format (`https://pxe.factory.talos.dev/pxe/<64-char-schematic-id>/<talos-version>/metal-amd64`) is the documented path; readers should generate their own schematic ID from factory.talos.dev rather than reusing the example.
- The IPAddressPool advertises the same `${API_VIP}/32` that is also used for the kube-apiserver VIP. In production you would normally allocate a separate pool for LoadBalancer services so MetalLB doesn't fight Talos's interface-level VIP for the API endpoint — worth a follow-up but not a hard correctness bug here since MetalLB is BGP-advertising and Talos is ARP/VIP-binding.
- MetalLB v0.13.12 is from late 2023. The manifest URL works today, but readers starting fresh in 2026 would benefit from moving to a current v0.14.x release once they have the basics working. The v1beta2 BGPPeer schema used here is forward-compatible.
- `cilium install --helm-set ipam.mode=kubernetes` uses the cilium-cli `--helm-set` flag (still supported); modern cilium-cli also accepts `--set`. Either works.
- The `c3.small.x86` plan and `--metro da` (Dallas) are real Equinix Metal selectors, but availability fluctuates — readers should run `metal plan get` / `metal capacity get` before committing.
