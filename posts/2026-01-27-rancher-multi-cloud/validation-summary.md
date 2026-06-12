# Validation Summary: How to Manage Multiple Clouds with Rancher

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Helm
- cert-manager
- Rancher2 Terraform provider
- AWS EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- Fleet GitOps
- Submariner
- Kubernetes Multi-Cluster Services API
- Rancher Monitoring / Prometheus Operator
- Velero

## Sources Consulted
- Rancher Manager installation docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher EKS provider docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/eks
- Rancher AKS provider docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/aks
- Rancher Kubernetes API package reference: https://pkg.go.dev/github.com/rancher/rancher/pkg/apis/provisioning.cattle.io/v1
- Rancher2 Terraform provider `rancher2_cloud_credential` docs: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/cloud_credential.md
- Rancher2 Terraform provider `rancher2_cluster` docs: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/cluster.md
- Fleet GitRepo target docs: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Submariner deployment docs: https://submariner.io/operations/deployment/
- Submariner operator CRDs: https://github.com/submariner-io/submariner-operator
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Velero Schedule and BackupStorageLocation CRDs: https://github.com/vmware-tanzu/velero/tree/main/config/crd/v1/bases
- cert-manager supported releases: https://cert-manager.io/docs/releases/

## Issues Found
- The cert-manager install command pinned `v1.14.0`, which is outdated for a 2026 guide. Updated it to `v1.20.2`, a current cert-manager release as of the review date.
- The cloud credential examples used a non-existent `provisioning.cattle.io/v1` `CloudCredential` kind and incorrect provider field names. Replaced them with supported `rancher2_cloud_credential` Terraform resources for AWS, GCP, and Azure.
- The EKS, GKE, and AKS provisioning examples used invalid `provisioning.cattle.io/v1` `Cluster` fields such as `eksConfig`, `gkeConfig`, and `aksConfig`. Rancher's provisioning API is for RKE2/K3s-style provisioning, while Rancher documents the Terraform provider as the common programmatic path for hosted-provider clusters. Replaced those examples with `rancher2_cluster` resources using `eks_config_v2`, `gke_config_v2`, and `aks_config_v2`.
- The GCP credential snippet described a base64-encoded service account JSON but showed raw JSON under the field. Replaced it with the Terraform provider's `auth_encoded_json` usage.
- The Submariner example used a non-default broker namespace and omitted required `Submariner` spec fields such as `namespace`, `ceIPSecDebug`, and `debug`. Updated the broker namespace to `submariner-k8s-broker`, added required fields, and clarified that the broker can be deployed via the operator or `subctl deploy-broker`.
- The monitoring example referenced the outdated Rancher charts branch `release-v2.8`. Updated it to `release-v2.14`, which exists in the Rancher charts repository and matches current Rancher documentation versions.

## Review Notes
- Rancher hosted-provider cluster creation remains version- and provider-permission-sensitive; the Terraform snippets now match the documented provider schema, but real deployments still require valid cloud prerequisites such as VPC/subnet setup, provider IAM permissions, and supported Kubernetes versions.
- Rancher Monitoring app installation manifests can vary by Rancher version and cluster context. The post keeps the author's manifest-oriented style, but Rancher's UI and Helm chart values should be checked for the exact Rancher release in production.
- The Velero and Prometheus Operator snippets are structurally consistent with current CRDs, but backup and federation endpoints still require provider credentials, network reachability, and TLS/authentication hardening before production use.
