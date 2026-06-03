# Validation Summary: How to Deploy YugabyteDB with Multi-Zone Placement on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes StatefulSets, Services, StorageClasses, PersistentVolumeClaims, and CronJobs
- AWS EBS CSI storage
- YugabyteDB YB-Master, YB-TServer, YSQL, YCQL, and yb-admin
- Multi-zone database placement and high availability

## Sources Consulted
- YugabyteDB multi-zone Kubernetes deployment docs: https://docs.yugabyte.com/stable/deploy/kubernetes/multi-zone/eks/helm-chart/
- YugabyteDB yb-admin command reference: https://docs.yugabyte.com/v2.25/admin/yb-admin/
- YugabyteDB YB-Master configuration reference: https://docs.yugabyte.com/stable/reference/configuration/yb-master/
- YugabyteDB YB-TServer configuration reference: https://docs.yugabyte.com/stable/reference/configuration/yb-tserver/
- YugabyteDB default ports reference: https://docs.yugabyte.com/preview/reference/configuration/default-ports/
- YugabyteDB release support information: https://docs.yugabyte.com/preview/releases/ybdb-releases/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- YugabyteDB YEDIS deprecation notice: https://docs.yugabyte.com/stable/yedis/

## Issues Found
- The AWS EBS StorageClass examples used the removed in-tree `kubernetes.io/aws-ebs` provisioner. Updated them to the current AWS EBS CSI provisioner `ebs.csi.aws.com` and added a CSI filesystem parameter.
- The storage class text described the classes as zone-specific. Updated the wording to explain that `WaitForFirstConsumer` delays volume provisioning until pod scheduling determines the zone.
- The pinned YugabyteDB image was `2.19.3.0-b140`, a preview-era release inappropriate for a 2026 tutorial. Updated examples to the current 2025.2 LTS image tag used by the official docs.
- The YB-Master readiness probe used `/api/v1/is-leader`, which would make follower masters fail readiness. Changed it to `/api/v1/health`.
- The examples exposed Redis/YEDIS port 6379 even though YEDIS is deprecated for new application development. Removed the Redis/YEDIS port from the service and container port examples.
- The `modify_placement_info` example used incomplete placement values. Updated the format to `cloud.region.zone`, for example `aws.us-east-1.us-east-1a`.
- The `yb-admin` examples used only one master address. Updated them to include all three master RPC addresses.
- The zone-failure pod deletion command selected only the first node and used a `node/<name>` style output in a `spec.nodeName` selector. Updated it to iterate over node names in the selected zone.
- The monitoring section described a health endpoint as checking replication lag. Updated it to say it checks master health.
- The backup CronJob referenced `backup-pvc` without defining it. Added a matching PersistentVolumeClaim to the YAML example.
- Added a placement caveat explaining that `modify_placement_info` only works as intended when YB-Master and YB-TServer processes are started with matching `--placement_cloud`, `--placement_region`, and `--placement_zone` flags.

## Review Notes
The post remains a simplified manual StatefulSet walkthrough. For production Kubernetes deployments, YugabyteDB's official guidance uses the Helm chart or YugabyteDB Anywhere so each zone can receive explicit placement flags and zone-specific scheduling configuration.
