# Validation Summary: How to Configure Snapshot Deletion Policy for Lifecycle Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes VolumeSnapshot
- Kubernetes VolumeSnapshotClass
- Kubernetes VolumeSnapshotContent
- CSI external snapshotter
- AWS EBS CSI driver
- AWS CLI / Amazon EBS snapshots
- Google Cloud Compute Engine snapshots
- Azure managed disk snapshots
- Bash, jq, and Kubernetes CronJob/RBAC manifests

## Sources Consulted
- Kubernetes documentation: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes documentation: Volume Snapshot Classes - https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI Developer Documentation: Volume Snapshot API - https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- AWS EBS CSI driver documentation: snapshot tagging through VolumeSnapshotClass parameters - https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- AWS CLI documentation: describe-snapshots - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html
- AWS CLI documentation: list-snapshots-in-recycle-bin - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/list-snapshots-in-recycle-bin.html
- Amazon EBS documentation: Recycle Bin for EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin.html
- Google Cloud documentation: Compute Engine snapshots and deletion behavior - https://docs.cloud.google.com/compute/docs/disks/snapshots
- Microsoft Learn: Azure CLI az snapshot - https://learn.microsoft.com/en-us/cli/azure/snapshot

## Issues Found
- The AWS EBS CSI driver tag examples used `Name=...|Value=...`, but the driver expects `key=value` strings in `tagSpecification_*` parameters. Updated all snapshot tag examples to use `Environment=Production`, `Tier=Staging`, and similar key-value syntax.
- The cleanup and monitoring scripts assumed `.spec.volumeSnapshotRef.name` becomes empty for retained, orphaned `VolumeSnapshotContent` objects. That reference is required and immutable, so it remains after the `VolumeSnapshot` is deleted. Updated the scripts to check whether the referenced `VolumeSnapshot` still exists.
- The CronJob selected staging content with `kubectl get volumesnapshotcontent -l tier=staging`, but labels on `VolumeSnapshotClass` are not a reliable selector for generated `VolumeSnapshotContent` objects. Updated the selection to use `.spec.volumeSnapshotClassName == "staging-snapshots"`.
- The CronJob parsed multi-line jq object output line by line. Updated the jq command to emit compact JSON with `jq -c` and quoted shell variable expansions.
- The CronJob used `amazon/aws-cli:latest` with `/bin/bash` and then attempted to install and use `jq`, which is not guaranteed in that image. Updated the example to use `alpine:3.20`, install `aws-cli`, `curl`, and `jq`, and run with `/bin/sh`.
- The Delete policy verification command grepped AWS snapshots for the Kubernetes `VolumeSnapshot` name, which is not a reliable EBS snapshot identifier. Updated the example to capture `.status.snapshotHandle` from the `VolumeSnapshotContent` before deletion and query AWS by snapshot ID.
- The Retain policy example used a placeholder AWS snapshot ID even though the post already retrieved the content name. Updated it to capture and reuse `.status.snapshotHandle`.
- The AWS emergency recovery example used `describe-snapshots`, which does not list deleted snapshots in Recycle Bin. Updated it to use `aws ec2 list-snapshots-in-recycle-bin --snapshot-ids`.
- The GCP emergency recovery example claimed snapshots could be listed from trash with `status:DELETED`, but Google Cloud documents Compute Engine snapshot deletion as irreversible. Updated the note to say deleted Compute Engine snapshots cannot be recovered and changed the command to list existing snapshots by creation time.
- The monitoring script's cost calculation returned `null` when no snapshot sizes were present. Updated the jq expression to default to `0`.

## Review Notes
The Kubernetes snapshot API version used in the examples, `snapshot.storage.k8s.io/v1`, is current. The post remains AWS EBS oriented because the `parameters` examples are driver-specific; the same Kubernetes deletion policy concepts apply across CSI drivers, but driver parameters and cloud cleanup commands vary by provider.
