# Validation Summary: How to Configure Calico with Helm for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- Helm
- Kubernetes custom resources
- Calico IPPool configuration

## Sources Consulted
- Calico documentation: Install using Helm: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico documentation: Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Enable kubectl to manage Calico APIs: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Create multiple IP pools: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico documentation: IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico v3.27.0 Helm chart values and templates: https://github.com/projectcalico/calico/releases/download/v3.27.0/tigera-operator-v3.27.0.tgz

## Issues Found
- The Helm commands assumed that the `projectcalico` repository was already configured. I added `helm repo add projectcalico https://docs.tigera.io/calico/charts` and `helm repo update` before `helm show values`.
- The post said the Operator creates the Installation CR after deployment. For the v3.27.0 Helm chart, the chart renders the `Installation` resource when `installation.enabled` is true, so I changed the wording to say the Helm chart creates it during installation.
- The post showed changing existing IP pool settings by patching `Installation.spec.calicoNetwork.ipPools` after installation. Calico documentation states IP pool settings should be configured before installation through the Installation resource, and post-install IP pool changes should be made on the `IPPool` resource with `kubectl` or `calicoctl`. I replaced the Installation patch with a `kubectl patch ippool default-ipv4-ippool` example using the `projectcalico.org/v3` IPPool fields.
- The APIServer step described enabling it for calicoctl integration. The Calico API server exposes Calico APIs through the Kubernetes API for `kubectl`, and the v3.27.0 Helm chart enables it by default with `apiServer.enabled: true`. I clarified that the manifest is only needed if it was disabled during installation.

## Review Notes
- The post pins Calico `v3.27.0`, while the current Calico documentation is for newer releases. The pinned chart values were checked directly from the official v3.27.0 chart archive.
- Current Calico documentation notes that the aggregated API server is deprecated for new installations in favor of native v3 CRDs. That is a future improvement for a broader update, but the corrected v3.27.0 guidance is technically valid.
