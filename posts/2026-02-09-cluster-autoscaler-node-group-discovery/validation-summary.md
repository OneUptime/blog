# Validation Summary: How to Use Cluster Autoscaler Node Group Auto-Discovery for Cloud Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- AWS Auto Scaling Groups
- Google Cloud Managed Instance Groups
- Azure Virtual Machine Scale Sets
- AWS CLI
- Google Cloud CLI
- Azure CLI

## Sources Consulted
- Kubernetes Autoscaler AWS cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Autoscaler Azure cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/azure/README.md
- Kubernetes Autoscaler FAQ and flag reference: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Autoscaler releases: https://github.com/kubernetes/autoscaler/releases
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- AWS CLI create-or-update-tags documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-or-update-tags.html
- AWS CLI create-auto-scaling-group documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CLI update-auto-scaling-group documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- Google Cloud CLI managed instance groups documentation: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed
- Azure CLI VMSS documentation: https://learn.microsoft.com/en-us/cli/azure/vmss

## Issues Found
- The original GCP section described managed instance group discovery by labels and used `mig:name_prefix` plus `label=...`. Cluster Autoscaler GCE discovery uses managed instance group name prefixes with `namePrefix` and requires `min` and `max` in the discovery spec, so the section was changed to name-prefix discovery.
- The original GCP label command used `gcloud compute instance-groups managed update --update-labels`, but that flag is not part of the documented managed instance group update command. It was replaced with a `gcloud ... list --filter` command that verifies the name prefix used for discovery.
- The original Azure tagging example used tag keys that did not match the `--node-group-auto-discovery` flag. The tags were changed to `cluster-autoscaler-enabled` and `cluster-autoscaler-name`, and `min` / `max` tags were added because Azure auto-discovery reads those limits from VMSS tags.
- The deployment manifests used `k8s.gcr.io`, which is deprecated and frozen. The image references were updated to `registry.k8s.io/autoscaling/cluster-autoscaler:v1.35.0`, matching current Kubernetes registry guidance and Cluster Autoscaler releases.
- The dynamic AWS ASG creation example omitted required placement information and used an underspecified launch template reference. It was updated to include `--vpc-zone-identifier` and a launch template version.
- The node group limits section incorrectly implied GCP limits are set through the GCE autoscaler API and Azure limits through `sku.capacity`. It was corrected to show AWS ASG min/max, GCE Cluster Autoscaler discovery min/max, and Azure VMSS `min` / `max` tags.
- The limitations section stated that the default Cluster Autoscaler scan interval is 10 minutes. The official flag reference shows the default is 10 seconds, so this was corrected.
- General wording was adjusted from "tags or labels" to "tags or name prefixes" so the overview matches the provider-specific discovery mechanisms.

## Review Notes
The examples are still illustrative and omit full production requirements such as RBAC, IAM or cloud credentials, cloud-provider config files, and provider-specific managed-service recommendations. Cluster Autoscaler versions should generally match the Kubernetes minor version used by the cluster.
