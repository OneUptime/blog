# Validation Summary: How to Understand Calico Component Version Compatibility

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- CNI
- Tigera Operator
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source 3.27 system requirements for Kubernetes: https://docs.tigera.io/calico/3.27/getting-started/kubernetes/requirements
- Calico Open Source 3.26 system requirements for Kubernetes: https://docs.tigera.io/calico/3.26/getting-started/kubernetes/requirements
- Calico Open Source component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- Calico Open Source Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Project Calico v3.27.0 manifests: https://github.com/projectcalico/calico/tree/v3.27.0/manifests

## Issues Found
- The post described Calico compatibility as a fixed N-2 policy and gave incorrect tested Kubernetes versions for Calico 3.27. Calico 3.27 documentation lists Kubernetes v1.27, v1.28, and v1.29 as actively tested; Calico 3.26 documentation lists v1.24 through v1.28. I corrected the text and diagram to match the versioned Calico documentation and removed the fixed-policy wording.
- The `kubectl version --short` command is outdated; current Kubernetes kubectl documentation lists `kubectl version` with `--client` and `-o/--output`, but not `--short`. I changed the command to `kubectl version`.
- The operator example used `.spec.variant` to check the configured Calico version, but the Installation API documents `spec.variant` as the product variant and `status.calicoVersion` as the current running Calico version. I changed the command to read `.status.calicoVersion`.
- The operator wording implied changing a Calico version field in the Installation resource. The Installation API does not expose a direct Calico version field in `spec`; operator-managed upgrades are reconciled through the operator-managed installation. I adjusted the wording accordingly.

## Review Notes
- The example pod query uses the manifest-install label and namespace pattern for `calico/node`; operator-managed clusters may expose labels or namespaces differently depending on installation method. The post already discusses both manifest-style component images and operator-managed installations, so this remains acceptable as an example.
- `calicoctl` version guidance is accurate: Calico documentation says to install the `calicoctl` version matching the Calico version running in the cluster.
