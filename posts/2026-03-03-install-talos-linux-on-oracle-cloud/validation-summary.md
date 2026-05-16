# Validation Summary: How to Install Talos Linux on Oracle Cloud

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Oracle Cloud Infrastructure (OCI)
- OCI CLI
- OCI Compute, Object Storage, VCN, Network Load Balancer
- Kubernetes
- talosctl
- kubectl
- Cilium CNI
- OCI Cloud Controller Manager / Block Volume CSI

## Sources Consulted
- Talos v1.7.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Talos Oracle Cloud install docs: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/cloud-platforms/oracle/
- OCI CLI documentation (compute image import, network, nlb, os subcommands)
- Sidero Labs installer image registry: ghcr.io/siderolabs/installer

## Issues Found
- **Wrong Talos image filename and format.** The post downloaded `oracle-amd64.raw.xz` and uploaded it as `talos-v1.7.0.raw` while passing `--source-image-type QCOW2`. Talos v1.7.0 does not publish a `raw.xz` Oracle asset — the actual asset is `oracle-amd64.qcow2.xz` (confirmed via `gh release view v1.7.0 --repo siderolabs/talos`). Updated the download URL, the `xz -d` target, the uploaded object name, and the `image import` `--name` argument to use `qcow2` so the file format and the declared `--source-image-type QCOW2` agree.

## Review Notes
- The Network Load Balancer section creates the NLB but does not configure a listener or backend set for port 6443. A real deployment needs `oci nlb listener create` and `oci nlb backend-set create` calls to route Kubernetes API traffic to the control plane instances. Left as-is because adding these is a meaningful scope expansion rather than a correction, and the post appears to be intentionally abbreviated at this step.
- The official Talos guide recommends packaging the qcow2 plus an `image_metadata.json` into a `.oci` tar bundle and importing with `--source-image-type OCI` (which sets firmware/network/shape compatibility automatically). The simpler `QCOW2 + PARAVIRTUALIZED` path used here can work but may require additional manual image-capabilities tweaks depending on the chosen shape — future revisions could mention this trade-off.
- `VM.Standard.E4.Flex` is an AMD shape, which matches the `oracle-amd64` image. If readers switch to an Ampere `A1.Flex` shape (typical for OCI Always Free), they would need the `oracle-arm64.qcow2.xz` asset instead.
- Talos v1.7.0 is no longer the latest Talos release as of the validation date; readers may want to substitute a current stable version, but the commands shown remain structurally correct.
