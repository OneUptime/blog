# Validation Summary: How to Upgrade Calico on Kind Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kind
- CNI networking
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source 3.27 release notes: https://docs.tigera.io/calico/3.27/release-notes/
- Calico Open Source 3.27 Kubernetes upgrade guide: https://docs.tigera.io/calico/3.27/operations/upgrading/kubernetes-upgrade/
- Calico Kind installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Calico API server and Calico API resource documentation: https://docs.tigera.io/calico/3.27/operations/install-apiserver/
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The manifest upgrade command used `kubectl apply -f` directly against the v3.27.0 manifest URL. Calico's v3.27 manifest-based Kubernetes upgrade guide instructs users to download the corresponding manifest and apply it with `kubectl apply --server-side --force-conflicts -f upgrade.yaml`. Updated Step 4 accordingly and used the latest v3.27 patch manifest, v3.27.5, from the archived v3.27 documentation.
- The post referred specifically to v3.27.0 even though the archived v3.27 documentation recommends v3.27.5 as the current v3.27 patch release. Updated version references and the calicoctl download URL to v3.27.5 while preserving the guide's v3.27 upgrade scope.

## Review Notes
The commands are otherwise technically plausible for a manifest-based Calico install on Kind. Calico v3.27 documentation is archived and no longer actively maintained; future updates should prefer the latest supported Calico version unless the goal is specifically to test the v3.26 to v3.27 upgrade path.
