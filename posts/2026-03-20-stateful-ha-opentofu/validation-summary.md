# Validation Summary: How to Deploy Stateful Applications with HA Using OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Kubernetes StatefulSets
- Kubernetes Services and headless Services
- Kubernetes Pod Disruption Budgets
- Kubernetes StorageClasses and PersistentVolumeClaims
- Azure Disk CSI Driver
- Bitnami PostgreSQL with repmgr

## Sources Consulted
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- HashiCorp Kubernetes provider resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/tree/main/docs/resources
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Azure Disk CSI Driver parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Microsoft AKS CSI storage driver documentation: https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Bitnami PostgreSQL with repmgr container documentation: https://github.com/bitnami/containers/tree/main/bitnami/postgresql-repmgr
- Bitnami PostgreSQL HA Helm chart StatefulSet template: https://github.com/bitnami/charts/blob/main/bitnami/postgresql-ha/templates/postgresql/statefulset.yaml

## Issues Found
- The StatefulSet referenced `premium-ssd`, but the StorageClass defined later in the post is named `premium-ssd-zrs`. Updated the PVC template to use `premium-ssd-zrs`.
- The StatefulSet did not create an OpenTofu dependency on the headless Service, even though Kubernetes requires the governing Service to exist before the StatefulSet. Added `depends_on` for the headless Service and the StorageClass.
- The Bitnami PostgreSQL repmgr example used `POSTGRESQL_REPMGR_PARTNER_NODES`, which is not the supported repmgr variable. Replaced it with `REPMGR_PARTNER_NODES` and added the required repmgr host, node name, node network name, and password environment variables using Kubernetes Downward API and Secret references.
- The headless Service included the deprecated `service.alpha.kubernetes.io/tolerate-unready-endpoints` annotation. Removed the annotation and kept the current `publish_not_ready_addresses = true` field.
- The Azure Disk CSI StorageClass parameters used non-canonical casing for `cachingMode` and `kind = "Managed"`. Updated them to `cachingMode = "ReadOnly"` and `kind = "managed"` to match current driver documentation.

## Review Notes
- The corrected StatefulSet assumes a Secret named `postgresql-ha-secret` exists in the `database` namespace with `postgresql-password` and `repmgr-password` keys.
- `Premium_ZRS` support depends on Azure region and cluster/driver support.
- OpenTofu or Terraform CLI was not installed in the local environment, so validation was performed against official provider schemas and upstream Kubernetes/Azure/Bitnami documentation rather than by running `tofu validate`.
