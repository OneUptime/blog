# Validation Summary: How to Implement Longhorn Storage Classes

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Longhorn
- Kubernetes StorageClass
- Kubernetes PersistentVolumeClaim
- Longhorn recurring jobs
- Longhorn node and disk tags

## Sources Consulted
- Longhorn StorageClass Parameters: https://longhorn.io/docs/1.12.0/references/storage-class-parameters/
- Longhorn Data Locality: https://longhorn.io/docs/1.12.0/high-availability/data-locality/
- Longhorn Recurring Snapshots and Backups: https://longhorn.io/docs/1.12.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn Auto Balance Replicas: https://longhorn.io/docs/1.12.0/high-availability/auto-balance-replicas/
- Longhorn Scheduling: https://longhorn.io/docs/1.12.0/nodes-and-volumes/nodes/scheduling/
- Longhorn Storage Tags: https://longhorn.io/docs/1.12.0/nodes-and-volumes/nodes/storage-tags/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post used the non-current `revisionCounterDisabled` StorageClass parameter. Changed it to `disableRevisionCounter`, which is the documented Longhorn parameter.
- The node selector examples described Kubernetes node labels and used `key:value` / semicolon syntax. Longhorn `nodeSelector` uses Longhorn node tags in comma-separated form, so the examples and setup commands were corrected.
- The disk tag patch example used device paths as disk map keys. Updated it to use placeholder Longhorn disk names so readers patch the existing `nodes.longhorn.io` disk entries.
- The replica anti-affinity examples used boolean string values and described the fields inaccurately. Updated them to documented values (`ignored`, `enabled`, `disabled`) and corrected the comments.
- The parameter reference table listed outdated defaults for `replicaAutoBalance`, anti-affinity settings, and the revision counter parameter. Updated the table to match current Longhorn documentation.
- The provisioning workflow referred to per-volume engine and replica pods. Updated the wording to engine and replica instances, which is more accurate for current Longhorn architecture.
- The recurring job selector comment said jobs were comma-separated. Updated it to say the value uses JSON format.

## Review Notes
The post is technically relevant and the Kubernetes API versions used in the examples are current. Some recommendations, such as specific replica counts or filesystem choices, are workload-dependent and should still be validated in a real cluster before production use.
