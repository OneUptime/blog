# Validation Summary: How to Upgrade Calico on MicroK8s Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Calico
- Kubernetes
- kubectl
- calicoctl
- Snap packages

## Sources Consulted
- MicroK8s upgrading documentation: https://microk8s.io/docs/upgrading
- MicroK8s CNI configuration documentation: https://microk8s.io/docs/change-cidr
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Project Calico v3.27.0 release asset URL check: https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64
- Project Calico v3.27.0 manifest URL check: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

## Issues Found
- The introduction stated that Calico upgrades on MicroK8s are typically tied to MicroK8s channel upgrades. MicroK8s documentation says upgrading the MicroK8s snap does not upgrade the deployed CNI resources automatically. I changed the explanation to say that newer snaps include an updated Calico manifest, but the deployed Calico resources must still be upgraded by applying the manifest.
- Step 4a stated that upgrading MicroK8s includes a newer Calico version. I changed this to describe the command as a MicroK8s channel upgrade only, because the deployed Calico version is not automatically upgraded.
- Step 4b applied the upstream Project Calico manifest directly from GitHub. MicroK8s documents a MicroK8s-specific Calico upgrade flow using `/snap/microk8s/current/upgrade-scripts/000-switch-to-calico/resources/calico.yaml`, copying it to `/var/snap/microk8s/current/args/cni-network/cni.yaml`, preserving local customizations, and then applying that file. I replaced the command with the documented MicroK8s flow.
- Step 8 wrote directly to `/usr/local/bin/calicoctl` without elevated permissions. I changed it to download `calicoctl` locally and install it with `sudo install -m 0755`, which matches the documented binary installation pattern while avoiding a likely permission failure.

## Review Notes
- `microk8s` is not installed in the local review environment, so MicroK8s commands were verified against official documentation rather than executed locally.
- The post pins examples to MicroK8s `1.29/stable` and Calico `v3.27.0`. Those are valid version-specific examples, but future maintenance should consider updating them to a currently supported MicroK8s channel and the matching Calico version bundled with that snap.
