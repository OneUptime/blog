# Validation Summary: How to Create a Nested Virtualization-Enabled VM on Compute Engine for Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Nested virtualization
- Google Cloud CLI
- Linux KVM
- QEMU
- libvirt
- virt-install
- Alpine Linux
- Minikube
- kubectl

## Sources Consulted
- Google Cloud Compute Engine nested virtualization overview: https://cloud.google.com/compute/docs/instances/nested-virtualization/overview
- Google Cloud Compute Engine enable nested virtualization guide: https://cloud.google.com/compute/docs/instances/nested-virtualization/enabling
- Google Cloud Compute Engine create nested VMs guide: https://cloud.google.com/compute/docs/instances/nested-virtualization/creating-nested-vms
- Google Cloud CLI `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud CLI `gcloud compute images create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/images/create
- Google Cloud CLI `gcloud compute disks create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Minikube KVM2 driver documentation: https://minikube.sigs.k8s.io/docs/drivers/kvm2/
- Minikube driver contributor documentation: https://minikube.sigs.k8s.io/docs/contrib/drivers/
- libvirt default networking documentation: https://wiki.libvirt.org/Networking.html
- Ubuntu Server libvirt documentation: https://ubuntu.com/server/docs/how-to/virtualisation/libvirt/
- Alpine Linux KVM documentation: https://wiki.alpinelinux.org/wiki/KVM

## Issues Found
- The post described Kind as a KVM-based local Kubernetes tool. Kind runs Kubernetes in containers, so the wording was changed to reference Minikube as the KVM-capable example.
- The nested virtualization requirements were outdated and too narrow. Updated them to match current Compute Engine restrictions: Intel Haswell or later is required, while E2, memory-optimized, AMD or Arm based VMs, and H4D VMs are not supported.
- The main setup flow used an older boot-disk/license approach and implied a boot disk with the VMX license is required. Updated the main path to the current recommended `--enable-nested-virtualization` flow, while keeping the special-license custom image path as an alternative.
- The VMX verification troubleshooting text only mentioned license and machine type. Updated it to include the direct nested virtualization setting.
- The libvirt setup used `--network=default` later but did not ensure the default libvirt network was started and set to autostart. Added `virsh net-start default` and `virsh net-autostart default`.
- The user group instructions did not mention that new group membership requires a new login/session. Added that note.
- The Minikube KVM section installed `docker-machine-driver-kvm2` manually. Current Minikube KVM2 documentation focuses on libvirt/qemu prerequisites and `minikube start --driver=kvm2`, so the manual driver download was replaced with `virt-host-validate`.
- The startup script claimed to create the default storage pool only if absent, but the command was not idempotent. Added a `virsh pool-info default` guard and made network/pool start commands tolerate already-active resources.
- The automated instance creation command now includes `--enable-nested-virtualization` so it works with the current recommended Compute Engine method as well as the custom-image path.

## Review Notes
- The Alpine 3.19 ISO URL returned HTTP 200 during validation, but Alpine 3.19 is an older release line. A future refresh could update the example to the current Alpine stable release.
- The local environment did not have `gcloud` installed, so Google Cloud CLI flags were verified against official Google Cloud CLI documentation rather than local `--help` output.
