# Validation Summary: How to Use Talos Linux for Edge Computing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- WireGuard
- Tailscale
- Rancher Fleet
- Argo CD ApplicationSet
- Prometheus remote write
- Thanos and Cortex

## Sources Consulted
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/system-configuration/patching
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux workers on control plane documentation: https://docs.siderolabs.com/talos/v1.12/deploy-and-manage-workloads/workers-on-controlplane
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux WireguardConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/wireguardconfig
- Talos Linux disk encryption documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux VolumeConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/block/volumeconfig
- Talos Linux system requirements: https://docs.siderolabs.com/talos/v1.8/getting-started/system-requirements
- Sidero Labs system extensions repository: https://github.com/siderolabs/extensions
- Rancher Fleet fleet.yaml reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/

## Issues Found
- The post claimed Talos nodes cannot be tampered with at the OS level. I softened this to say immutable design prevents persistent ad-hoc OS changes outside machine configuration, because physical access risks still depend on Secure Boot, disk encryption, and platform controls.
- The small-footprint claim described 100-150 MB of RAM usage. Official Talos system requirements document memory requirements in GiB and state that Talos itself requires less than 100 MB of disk space, so I corrected the claim to refer to disk space.
- The WireGuard example used `persistentKeepalive`. Talos machine configuration uses `persistentKeepaliveInterval` with a duration value, so I changed it to `persistentKeepaliveInterval: 25s`.
- The Tailscale system extension example used the `latest` tag. The Sidero Labs extensions repository recommends using a compatible extension image pinned by digest, so I changed the image reference to a compatible tag plus digest placeholder.
- The Argo CD ApplicationSet example omitted `spec.template.spec.project`. Official examples include `project`, and generated Applications should specify an AppProject, so I added `project: default`.
- The Talos upgrade examples used the old installer image `ghcr.io/siderolabs/installer:v1.7.0`. I updated the examples to `v1.13.0`, the latest stable Talos release found during review.
- The disk encryption example used the older `machine.systemDiskEncryption` structure. Current Talos documentation configures system volume encryption with `VolumeConfig` documents for `STATE` and `EPHEMERAL`, so I replaced the snippet.
- The physical security bullets and conclusion overstated what Talos immutable design alone provides. I adjusted the wording to tie physical-access protection to Secure Boot and disk encryption.

## Review Notes
Some Talos v1alpha1 machine configuration fields shown in the post, such as `machine.network.interfaces`, `machine.registries`, and `machine.time`, are still supported but deprecated in Talos v1.12 in favor of newer multi-document configuration resources. They were left in place because the snippets remain valid and replacing them would require a broader restructure.
