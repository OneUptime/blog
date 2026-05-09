# Validation Summary: Troubleshoot Cilium Installed via External Installers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Helm
- kOps
- Kubespray
- Talos Linux
- Kubernetes NetworkPolicy

## Sources Consulted
- Cilium External Installers documentation: https://docs.cilium.io/en/stable/installation/external-toc.html
- Cilium installation using kOps: https://docs.cilium.io/en/stable/installation/k8s-install-kops/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `version` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Cilium installation using Kubespray: https://docs.cilium.io/en/latest/installation/k8s-install-kubespray.html
- kOps Cilium networking documentation: https://kops.sigs.k8s.io/networking/cilium/
- Kubespray upgrade documentation: https://github.com/kubernetes-sigs/kubespray/blob/master/docs/operations/upgrades.md
- Talos Linux Cilium deployment guide: https://www.talos.dev/v1.11/kubernetes-guides/network/deploying-cilium/
- Talos Linux inlineManifests and extraManifests documentation: https://www.talos.dev/v1.10/kubernetes-guides/configuration/inlinemanifests/
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction implied that Cluster API universally includes Cilium as a networking option. Changed this to "some Cluster API providers" because Cluster API itself is a framework and Cilium support depends on the provider or templates in use.
- The installer detection step only mentioned annotations while checking for `managed-by`, which is commonly a label. Updated the wording to "labels or annotations".
- The non-running pod command used `grep -v Running`, which also matches the table header and can produce misleading output. Replaced it with a Kubernetes field selector for pods whose phase is not `Running`.
- The kOps detection comment described Cilium as a kOps addon. Updated it to the more general "deployed by an external installer" because kOps configures Cilium as a networking provider.
- The Kubespray rerun command used an inventory directory without an inventory file and omitted privilege escalation. Updated it to use `inventory/mycluster/inventory.ini` and `-b`, matching Kubespray examples.
- The Talos guidance referred to configuring Cilium through `extraArgs`, which is not the documented Talos approach. Updated it to mention setting `cluster.network.cni.name` to `none` and managing Cilium through Helm/Cilium manifests, `inlineManifests`, `extraManifests`, or a bootstrap job.
- The NetworkPolicy example was described as testing enforcement, but the snippet only creates a policy and does not create traffic to verify enforcement. Updated the comment to say it validates API acceptance.

## Review Notes
- The guide remains intentionally high-level and installer-agnostic. Future improvements could add separate tested workflows for kOps, Kubespray, and Talos because each installer has version-specific Cilium configuration fields.
- `helm list --all-namespaces` is valid, but it requires Helm to be installed and can only detect Helm-managed installations.
