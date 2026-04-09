# Validation Summary: How to Integrate Red Hat Ceph with OpenShift Data Foundation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat OpenShift Data Foundation (ODF)
- Red Hat Ceph Storage (RHCS)
- Rook (underlying ODF operator)
- OpenShift Container Platform
- Kubernetes (PersistentVolumeClaims, StorageClasses, Secrets)
- Ceph RBD (block storage)
- CephFS (file storage)
- Ceph RGW (S3-compatible object storage)
- Operator Lifecycle Manager (OLM Subscriptions)

## Sources Consulted
- Red Hat ODF 4.15 External Mode Deployment Guide: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.15/html-single/deploying_openshift_data_foundation_in_external_mode/index
- Red Hat ODF 4.15 Managing Storage - Adding File and Object to External Cluster: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.15/html/managing_and_allocating_storage_resources/adding-file-and-object-storage-to-an-existing-external-ocs-cluster
- Rook External Cluster Provider Export Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/provider-export/
- Red Hat Developer - Install ODF Operator via GitOps: https://developers.redhat.com/learning/learn:openshift:deployment-red-hat-openshift-data-foundation-using-gitops/resource/resources:install-red-hat-openshift-data-foundation-operator
- Red Hat Sysadmin - How to reconfigure Ceph storage in ODF: https://www.redhat.com/sysadmin/ceph-storage-openshift
- Red Hat KBA on ceph-external-cluster-details-exporter.py flags: https://access.redhat.com/solutions/7011465

## Issues Found

1. **Incorrect output flag on exporter script**: The command used `--output-json-file external-cluster-details.json`, but this is not a documented flag for `ceph-external-cluster-details-exporter.py`. The script outputs JSON to stdout, so shell redirection (`> external-cluster-details.json`) should be used instead. Fixed by replacing the flag with stdout redirection.

2. **Incorrect secret key name**: The secret creation command used `--from-file=external-cluster-config=external-cluster-details.json`, but the ODF operator expects the key inside the secret to be `external_cluster_details` (with underscores). Fixed by changing the key to `external_cluster_details`.

## Review Notes
- The post omits creating the `openshift-storage` namespace and OperatorGroup before the Subscription, which are prerequisites in practice. These are standard setup steps documented in the ODF installation guide.
- The exporter script command omits the commonly required `--run-as-user` flag (e.g., `--run-as-user client.ocs`), which specifies the Ceph user context for credential creation. Depending on the RHCS cluster configuration, this may be needed.
- The StorageCluster YAML omits `cephObjectStoreUsers` and `cephObjectStores` under `managedResources`, which are commonly included in external mode examples. This is not necessarily wrong but a more complete example would include them.
- The `channel: stable-4.15` ties the post to a specific ODF version. Readers targeting different ODF versions should adjust the channel accordingly.
- The Subscription YAML omits `installPlanApproval: Automatic`, which is optional since it defaults to `Automatic`.
