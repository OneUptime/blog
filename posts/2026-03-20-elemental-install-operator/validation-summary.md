# Validation Summary: How to Install Elemental Operator

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Elemental / SUSE Rancher Prime: OS Manager
- Rancher
- Kubernetes
- Helm
- cert-manager

## Sources Consulted
- SUSE Rancher Prime: OS Manager installation docs: https://documentation.suse.com/cloudnative/os-manager/latest/en/installation/installation.html
- SUSE Rancher Prime: OS Manager release notes: https://documentation.suse.com/cloudnative/os-manager/latest/en/release-notes.html
- SUSE Rancher Prime: OS Manager custom resources reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/rancher-os-management/architecture/custom-resources.html
- Official Elemental stable Helm repository index: https://rancher.github.io/elemental-operator/stable/index.yaml
- Published Elemental operator chart package used to verify values and deployment labels: https://rancher.github.io/elemental-operator/stable/build/elemental-operator-chart-1.9.1.tgz
- Published Elemental CRDs chart package used to verify CRD names and install flow: https://rancher.github.io/elemental-operator/stable/build/elemental-operator-crds-chart-1.9.1.tgz
- Elemental operator source used to verify leader election defaults: https://github.com/rancher/elemental-operator/blob/main/cmd/operator/operator/root.go
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post used an outdated Elemental Helm repository URL. I updated it to `https://rancher.github.io/elemental-operator/stable/`, which is the current published stable repository.
- The install flow omitted the required `elemental-operator-crds` chart. I added CRD installation before the operator install, and I updated the upgrade and uninstall sections to manage the CRDs chart as well.
- The post used `elemental-system`, but the current published chart targets `cattle-elemental-system`. I corrected the namespace throughout the guide.
- The cert-manager example used the old `installCRDs=true` flag. I changed it to `crds.enabled=true`, which matches current cert-manager Helm documentation.
- The custom install examples used unsupported or misleading values: `replicas=2`, `resources.*`, `webhook.enabled`, `image.tag=latest`, and a fully qualified `image.repository`. I replaced those with supported chart values from the current published chart. The `replicas=2` example was removed because the chart does not enable leader election by default, so scaling replicas in the published install path is unsafe.
- The CRD list contained an incorrect singular resource name. I corrected `machineinventoryselectortemplate.elemental.cattle.io` to `machineinventoryselectortemplates.elemental.cattle.io` and added `seedimages.elemental.cattle.io`, which is part of the current CRD set.
- The prerequisites were tightened to reflect the current stable chart requirements of Rancher `>= 2.7.0` and Kubernetes `>= 1.23.0`.

## Review Notes
- The current SUSE documentation brands Elemental under SUSE Rancher Prime: OS Manager, but the chart and resource names are still `elemental-operator` and `elemental.cattle.io`.
- As of March 26, 2026, the stable Elemental Helm repository published `elemental-operator` v1.9.1 with Rancher `>= 2.7.0` and Kubernetes `>= 1.23.0` requirements.
- cert-manager now recommends OCI charts for the newest releases, but the Jetstack Helm repository method used here is still supported and technically valid.
