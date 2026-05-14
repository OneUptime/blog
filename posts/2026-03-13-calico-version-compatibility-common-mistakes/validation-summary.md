# Validation Summary: How to Avoid Common Mistakes with Calico Component Version Compatibility

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico CNI
- calicoctl
- Tigera Operator
- Kubernetes CustomResourceDefinitions
- Managed Kubernetes services: EKS, GKE, AKS

## Sources Consulted
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- `kubectl version --short` is not listed in the current generated Kubernetes `kubectl version` reference. Changed it to `kubectl version -o yaml`, which is supported by the current CLI reference.
- The post described mismatched `calicoctl` versions as causing silent failures. Current Calico documentation says Calico and `calicoctl` versions should match and calls fail on mismatch unless `--allow-version-mismatch` is used; older `calicoctl` after upgrade may cause unexpected behavior and data. Updated the explanation and symptom accordingly.
- The operator upgrade example used `kubectl set image` with an old hard-coded operator image. Current Calico upgrade documentation applies the target release CRDs and `tigera-operator.yaml` with server-side apply. Replaced the example with the documented v3.32.0 upgrade commands.
- The CRD verification text said to verify a recent creation timestamp but the command checked `resourceVersion`; CRD creation timestamps do not become recent when an existing CRD is updated. Updated the guidance to verify served CRD versions for a representative Calico CRD.
- The CRD explanation implied existing resources must be re-applied for the new schema to work. Updated it to the more accurate behavior: new CRD fields are unavailable to the Kubernetes API until the target release CRD manifests are applied.

## Review Notes
The namespace and labels used in the diagnostic commands are valid for common operator-managed Calico installations, but older manifest-based installations may use `kube-system` instead of `calico-system`. The post could mention that caveat in a future broader revision, but the existing commands are technically valid for the installation style implied by the operator examples.
