# Validation Summary: How to Back Up Downstream Cluster Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Velero
- Helm
- AWS S3
- Fleet

## Sources Consulted
- Rancher backup and disaster recovery docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher backup usage guide for downstream cluster scope: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher Helm charts and apps UI docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Velero Helm chart README: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/README.md
- Velero Helm chart values: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/main/charts/velero/values.yaml
- Velero AWS plugin README: https://github.com/velero-io/velero-plugin-for-aws
- Velero CSI support docs: https://velero.io/docs/main/csi/
- Velero resource filtering docs: https://velero.io/docs/main/resource-filtering/
- Velero restore reference: https://velero.io/docs/v1.15/restore-reference/
- Fleet GitRepo deployment tutorial: https://fleet.rancher.io/tutorials/tut-deployment
- Kubernetes kubectl config reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/

## Issues Found
- The post used `velero` CLI commands but did not list the Velero CLI as a prerequisite. I added it so the command examples are runnable as written.
- The Helm install example injected credentials with `--set` and pinned `velero-plugin-for-aws:v1.8.0`. I changed this to `--set-file credentials.secretContents.cloud=./velero-credentials.txt` and updated the AWS plugin image to `v1.12.2`, which matches the current Helm chart's Velero 1.16.x compatibility guidance.
- The persistent volume section incorrectly told readers to install CSI snapshot CRDs from the external-snapshotter `master` branch. I replaced that with a check for the configured Velero `VolumeSnapshotLocation`, because the AWS-based example in the post relies on the Velero AWS snapshot plugin rather than manually applying CSI CRDs.
- The cross-cluster monitoring example queried Rancher management cluster resources and then reused those names as `kubectl` contexts, which does not work reliably. I changed it to iterate over actual kubeconfig context names with `kubectl config get-contexts -o name`.

## Review Notes
- The Helm example is AWS-specific. If the post is later expanded back to generic S3-compatible storage, it should add the provider-specific settings required for non-AWS endpoints.
- Velero CSI snapshot support exists, but on current Velero releases it is no longer installed through a separate CSI plugin. It requires a compatible CSI driver and feature configuration if the post is updated to cover CSI API-based snapshots explicitly.
