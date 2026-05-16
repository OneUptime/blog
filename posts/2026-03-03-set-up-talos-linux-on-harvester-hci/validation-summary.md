# Validation Summary: How to Set Up Talos Linux on Harvester HCI

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Talos Linux
- Harvester HCI / SUSE Virtualization
- Kubernetes
- KubeVirt
- Multus CNI / Harvester VM networks
- Longhorn-backed VM images and volumes
- Terraform Harvester provider

## Sources Consulted
- Talos Linux NoCloud documentation: https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/cloud-platforms/nocloud
- Talos Linux VIP documentation: https://docs.siderolabs.com/talos/v1.9/networking/vip/
- Talos Linux `talosctl` CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos Linux Image Factory versions endpoint: https://factory.talos.dev/versions
- Harvester image upload documentation: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester VM network documentation: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester cluster network documentation: https://docs.harvesterhci.io/v1.7/networking/index
- Harvester virtual machine creation documentation: https://docs.harvesterhci.io/v1.7/vm/index/
- Harvester volume creation documentation: https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester Terraform provider `harvester_virtualmachine` resource: https://registry.terraform.io/providers/harvester/harvester/latest/docs/resources/virtualmachine

## Issues Found
- The Talos NoCloud GitHub release URL was no longer valid for current Talos releases. Updated the download to use the Talos Image Factory default schematic and the current stable `v1.13.2` NoCloud raw image URL.
- The image upload API example pointed Harvester at a compressed `.raw.xz` artifact. Harvester image uploads are documented for raw, qcow2, and ISO images, and Longhorn backing images require block-size alignment. Updated the text and API example to use a decompressed raw image hosted at a cluster-reachable URL.
- The VM network YAML used the wrong API group for `NetworkAttachmentDefinition` and did not match Harvester's documented VM network objects. Updated it to `k8s.cni.cncf.io/v1` with Harvester L2 VLAN labels and bridge CNI configuration.
- The Talos config generation applied the VIP to all node types and left the install disk at the default. Updated the command to apply VIP only to control plane configs and set the install disk to `/dev/vda` for virtio disks.
- The KubeVirt VM examples attempted to clone a PVC named `talos-linux`, but Harvester `VirtualMachineImage` objects are not PVCs. Updated the examples to create image-backed PVCs with `harvesterhci.io/imageId` and attach them to the VM.
- The VM examples used pod masquerade networking, which is not suitable for the Talos L2 VIP shown in the guide. Updated the VM interfaces to use a Multus bridge network.
- The `talosctl config merge` command was ordered after endpoint/node configuration. Reordered it so the generated `talosconfig` is merged before setting the endpoint and node.
- The Terraform example referenced an undefined `harvester_image.talos` resource and used masquerade networking. Added the image resource and updated the network interface to a bridge VM network.

## Review Notes
YAML snippets were parsed successfully with Python/PyYAML. Terraform was not installed in the local environment, so the HCL snippet was reviewed against the official Harvester provider schema but not formatted or validated locally.
