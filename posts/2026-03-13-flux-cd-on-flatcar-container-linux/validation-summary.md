# Validation Summary: How to Set Up Flux CD on Flatcar Container Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flatcar Container Linux
- Butane and Ignition
- Kubernetes and kubeadm
- containerd
- Flannel CNI
- Flux CD
- Flatcar Linux Update Operator
- AWS EC2 and libvirt/QEMU provisioning

## Sources Consulted
- Flatcar Container Linux Ignition documentation: https://www.flatcar.org/docs/latest/provisioning/ignition/
- Flatcar Container Linux Kubernetes getting started guide: https://www.flatcar.org/docs/latest/container-runtimes/getting-started-with-kubernetes/
- Flatcar Container Linux update and reboot strategies: https://www.flatcar.org/docs/latest/setup/releases/update-strategies/
- Flatcar Container Linux systemd-sysext documentation: https://www.flatcar.org/docs/latest/provisioning/sysext/
- Flatcar Container Linux AWS EC2 documentation: https://www.flatcar.org/docs/latest/installing/cloud/aws-ec2/
- Flatcar Container Linux libvirt documentation: https://www.flatcar.org/docs/latest/installing/vms/libvirt/
- Butane configuration specifications: https://coreos.github.io/butane/specs/
- Butane Flatcar v1.1.0 schema reference: https://coreos.github.io/butane/config-flatcar-v1_1/
- Kubernetes kubeadm v1beta4 configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flatcar Linux Update Operator repository and deployment examples: https://github.com/flatcar/flatcar-linux-update-operator

## Issues Found
- Removed the `sudo` supplementary group from the Butane user example. Flatcar commonly uses the `wheel` group for administrative access, and adding an undefined Debian-style `sudo` group can make provisioning brittle.
- Updated the Butane Flatcar schema from `1.0.0` to the current stable `1.1.0` schema.
- Added `/etc/kubernetes` as an Ignition-managed directory before writing `/etc/kubernetes/kubeadm-config.yaml`, so the file path exists during first-boot provisioning.
- Updated the kubeadm configuration from `kubeadm.k8s.io/v1beta3` with Kubernetes `1.29.0` to the current preferred `kubeadm.k8s.io/v1beta4` API and a supported `v1.33.2` version matching Flatcar's current Kubernetes examples.
- Corrected the update service configuration. The original text claimed automatic updates were disabled but used `mask: false`; the revised config enables `update-engine.service` and masks `locksmithd.service`, which matches Flatcar Linux Update Operator requirements.
- Updated the Butane install command to download to `/tmp` and install with `sudo install`, avoiding an unprivileged write directly to `/usr/local/bin`.
- Corrected the libvirt example to use `virt-install --import` with Flatcar's documented `backing_store` disk pattern instead of passing a Flatcar disk image as `--cdrom`.
- Replaced the invalid placeholder AWS AMI value with a valid AMI-shaped placeholder and added a note to use the latest Flatcar Stable AMI for the target region.
- Corrected the kubeadm installation guidance from OEM partition scripts/OEM channel to the Flatcar-supported systemd-sysext or pinned binary approaches.
- Removed `--personal` from the Flux bootstrap example because the sample owner is an organization; Flux documents `--personal` for user-owned repositories.
- Replaced the incomplete Flatcar Linux Update Operator DaemonSet with Flux `GitRepository` and `Kustomization` resources that deploy the official upstream `examples/deploy` Kustomize package, including the required operator Deployment, agent DaemonSet, service accounts, namespace, and RBAC.
- Updated the best-practice note about OEM partition usage to recommend Ignition-managed `/etc` files, systemd units, or systemd-sysext extensions for cluster-specific configuration.

## Review Notes
- The post is technically valid as a high-level setup guide, but production clusters should pin artifact checksums for downloaded Flatcar extensions and Kubernetes binaries.
- The AWS AMI ID remains a region-specific placeholder by necessity; users should select the current Flatcar Stable AMI for their region.
