# Validation Summary: Migrate Workloads to Calico with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator Helm chart
- Kubernetes CNI networking
- Helm 3
- Flux HelmRelease and HelmRepository
- calicoctl

## Sources Consulted
- Calico official Helm install documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Helm chart repository index: https://docs.tigera.io/calico/charts/index.yaml
- Calico v3.32.0 Tigera operator chart values: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/charts/tigera-operator/values.yaml
- Calico v3.32.0 CRD chart metadata: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/charts/crd.projectcalico.org.v1/Chart.yaml
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Calico calicoctl configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The post pinned Calico and calicoctl to v3.27, which is outdated for a 2026 guide. Updated examples and prerequisites to v3.32.0 / v3.32+ based on the current official Calico chart repository and documentation.
- The Helm install command omitted the separate `crd.projectcalico.org.v1` chart step required by current Calico Helm documentation. Added the CRD installation command before installing `projectcalico/tigera-operator`.
- The values file placed Tigera operator resource requests under `tigera-operator.resources`, but the chart uses top-level `resources`. Moved the resource requests to the correct top-level key.
- The IP pool CIDR comment said it must match kubelet `--cluster-cidr`; this setting is the cluster pod CIDR, not a kubelet flag. Reworded the comment to avoid pointing at the wrong component.
- The encapsulation comment omitted valid `IPIPCrossSubnet` and `VXLANCrossSubnet` values from the Installation API. Added those values.
- The optional eBPF comment showed a duplicate `calicoNetwork` block. Reworded it so `linuxDataplane: BPF` is clearly added under the existing `calicoNetwork` key.
- The Flux example installed only the Tigera operator chart. Added a separate CRD HelmRelease and `dependsOn` so the operator release waits for CRDs.
- The prerequisites said repository access to `projectcalico.org`, while the actual official Helm repository is `https://docs.tigera.io/calico/charts`. Updated the prerequisite.
- The validation command described the `kubectl run` test as pod-to-pod connectivity even though it curls the Kubernetes service. Reworded the comment to "in-cluster service connectivity."
- The introduction claimed migration of an existing Calico installation to Helm management as a general workflow. Reworded it to focus on installing Calico through Helm, since adopting pre-existing Calico resources into Helm ownership is not covered by the official install flow shown.

## Review Notes
The guide is now technically valid as a Helm-based Calico install and GitOps management walkthrough. Actual CNI replacement or migration from another CNI remains cluster-specific and should be planned separately from the basic Helm install flow.
