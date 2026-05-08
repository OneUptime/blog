# Validation Summary: Operationalizing Calico Alternate Registry Configuration

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Helm
- GitHub Actions
- crane / go-containerregistry
- Private container registries
- Bash

## Sources Consulted
- Calico alternate registry documentation: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico ImageSet documentation, including operator image-list guidance: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Helm upgrade command reference: https://helm.sh/docs/v3/helm/helm_upgrade/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- go-containerregistry / crane documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane

## Issues Found
- The image synchronization pipeline used `docker.io/calico/...` as the source registry. Current Calico documentation uses `quay.io/calico/...` and `quay.io/tigera/operator` for official images, so the examples were updated to mirror from `quay.io/calico/...`.
- The mirrored image list was too narrow for current operator-managed Calico releases and omitted documented components such as `apiserver`, `key-cert-provisioner`, `goldmane`, `whisker`, Envoy gateway images, and `webhooks`. The sync, upgrade verification, and inventory examples were expanded to cover the Calico v3.32.0 OSS image set reported by `quay.io/tigera/operator:v1.42.0 --print-images=list`.
- The workflow used `crane copy`; official go-containerregistry and Calico examples use `crane cp`. The command was changed to `crane cp`.
- The examples passed the registry value directly into `spec.registry`. The Calico Installation API documents the image format as `<registry><imagePath>/...` and states that `registry` should end with a slash, so the upgrade and failover scripts now normalize registry values for image references and pass a trailing-slash value to the Installation resource.
- The upgrade workflow did not apply release CRDs before `helm upgrade`. Calico's Helm upgrade documentation applies the release CRDs first, so the script now applies `v1_crd_projectcalico_org.yaml` with server-side apply before running the Helm upgrade.
- The prerequisites omitted `calicoctl` and `helm`, both of which are used in the included upgrade workflow. The prerequisite list was updated.

## Review Notes
- The exact Calico image list can vary by release and enabled features. The examples now match the current Calico v3.32.0 operator image list for the covered OSS components, but future production automation should derive this list from the operator release or an approved release manifest.
