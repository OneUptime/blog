# Validation Summary: How to Configure Google Cloud Provider in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- RKE2
- Kubernetes external cloud providers
- Google Cloud / Google Compute Engine
- GCP Cloud Controller Manager
- GCE Persistent Disk CSI Driver
- GCP Filestore CSI Driver
- `gcloud`
- `kubectl`

## Sources Consulted
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- Kubernetes blog, "Kubernetes 1.29: Cloud Provider Integrations Are Now Separate Components": https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/
- Kubernetes blog, "Completing the largest migration in Kubernetes history": https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/
- `kubernetes/cloud-provider-gcp` README: https://github.com/kubernetes/cloud-provider-gcp
- `kubernetes/cloud-provider-gcp` deploy package and manifest sources:
  - https://github.com/kubernetes/cloud-provider-gcp/tree/master/deploy/packages/default
  - https://raw.githubusercontent.com/kubernetes/cloud-provider-gcp/master/deploy/packages/default/manifest.yaml
  - https://raw.githubusercontent.com/kubernetes/cloud-provider-gcp/master/providers/gce/gce.go
- `kubernetes-sigs/gcp-compute-persistent-disk-csi-driver` README and examples:
  - https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
  - https://raw.githubusercontent.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/master/examples/kubernetes/demo-zonal-sc.yaml
- `kubernetes-sigs/gcp-filestore-csi-driver` README and examples:
  - https://github.com/kubernetes-sigs/gcp-filestore-csi-driver
  - https://raw.githubusercontent.com/kubernetes-sigs/gcp-filestore-csi-driver/master/examples/kubernetes/demo-sc.yaml
- Google Cloud SDK reference for service account key creation: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud Compute Engine IAM roles reference: https://docs.cloud.google.com/iam/docs/roles-permissions/compute
- Google Cloud Filestore IAM roles reference: https://cloud.google.com/filestore/docs/iam

## Issues Found
- The post configured RKE2 with the legacy in-tree `gce` cloud provider. I changed this to the external cloud provider flow for modern RKE2 by using `cloud-provider-name: external` and `disable-cloud-controller: true` on server nodes, because Kubernetes has migrated cloud providers out of tree.
- The original `cloud-provider-config` example in `/etc/rancher/rke2/config.yaml` was not the correct way to make the external GCP CCM use a JSON service account key. I replaced it with a proper GCP CCM cloud config file at `/etc/kubernetes/cloud.config` and added `token-url = nil` so the controller falls back to Application Default Credentials and uses the mounted key.
- The `kubectl apply` URL for `cloud-controller-manager.yaml` was invalid, and the Helm command installed the wrong chart from a deprecated repo. I replaced both with the upstream `cloud-provider-gcp` package manifest plus a strategic patch that pins the official CCM image and injects the required GCE arguments and credentials mount.
- The Persistent Disk CSI Driver installation used an incorrect Helm repo and chart wiring. I replaced it with the official upstream `stable-master` kustomize overlay and corrected the secret name and namespace to match the driver manifests.
- The Filestore CSI Driver installation used a non-authoritative Helm flow. I replaced it with the official upstream `stable-master` kustomize overlay and the correct secret name and namespace expected by the controller manifest.
- The verification section attempted to expose an `nginx` deployment that had never been created. I added `kubectl create deployment nginx --image=nginx` before the `LoadBalancer` service test.
- The troubleshooting commands referenced the wrong namespaces and labels for the corrected CSI driver deployments. I updated the troubleshooting table to point at the actual CCM and CSI namespaces and resources.
- The conclusion recommended Workload Identity for a self-managed RKE2-on-GCE cluster, which is misleading because that feature is associated with GKE. I changed the production guidance to recommend instance service accounts or another ADC-compatible flow instead.

## Review Notes
- The upstream GCP CCM image should be pinned to the `cloud-provider-gcp` release that matches the cluster's Kubernetes minor version. The post now shows `v35.0.8` as an example and calls out that version matching matters.
- The Persistent Disk and Filestore CSI upstream repos describe manual deployment on self-managed clusters as community-maintained rather than a fully managed Google-supported path like GKE.
- The PD and Filestore install commands use `stable-master` overlays from the upstream repositories. That is consistent with current upstream guidance for newer Kubernetes releases, but production environments should pin the repo ref once a tested driver release is selected.
