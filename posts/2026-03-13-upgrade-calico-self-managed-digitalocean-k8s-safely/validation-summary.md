# Validation Summary: How to Upgrade Calico on Self-Managed DigitalOcean Kubernetes Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- Kubernetes CNI
- kubectl
- calicoctl
- DigitalOcean Droplets

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl version - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl rollout - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Project Calico v3.27.0 release manifest URLs on GitHub - https://github.com/projectcalico/calico/tree/v3.27.0/manifests

## Issues Found
- The operator upgrade instructions patched the `Installation` CR with a hard-coded IP pool instead of applying the target version's operator CRDs and operator manifest. Replaced that step with `operator-crds.yaml`, `tigera-operator.yaml`, and server-side apply commands for Calico v3.27.0.
- The direct manifest upgrade used a plain `kubectl apply -f` against the remote manifest. Updated it to download `calico.yaml` as `upgrade.yaml` and apply it with `--server-side --force-conflicts`, matching Calico's documented upgrade flow.
- The introduction described upgrading control plane components first and then the DaemonSet with zero downtime. Adjusted that wording because Calico's documented upgrade process is install-method dependent and focuses on applying matching CRDs/manifests and verifying the rollout.
- The `calicoctl node status` command was shown without noting that it must run on a node and is commonly run with elevated privileges. Added a short note and changed the command to `sudo calicoctl node status`.
- The temporary connectivity test pod used `kubectl run --rm -it` without `--restart=Never`. Added `--restart=Never` so the finite `ping` command exits and the pod can be removed cleanly.

## Review Notes
The guide is pinned to Calico v3.27.0, which is not the latest Calico release as of this review. The version pin is technically valid for a targeted upgrade example, but future updates should refresh the target version and re-check release notes for version-specific CRD, OwnerReference, or Kubernetes compatibility changes.
