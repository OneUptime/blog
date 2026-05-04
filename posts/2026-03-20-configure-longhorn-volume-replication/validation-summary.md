# Validation Summary: How to Configure Longhorn Volume Replication

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (StorageClass, kubectl patch, CRDs)
- Longhorn CRDs: `settings.longhorn.io`, `volumes.longhorn.io`, `replicas.longhorn.io`

## Sources Consulted
- Longhorn StorageClass Parameters reference: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn Settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn manager source `types/setting.go`: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/types/setting.go (verified internal setting key names)

## Issues Found
No technical issues found.

Verifications performed:
- StorageClass parameters `numberOfReplicas`, `staleReplicaTimeout`, `fsType`, `nodeSelector`, `diskSelector` all confirmed valid against the official StorageClass parameters reference.
- Setting keys `default-replica-count`, `replica-soft-anti-affinity`, `replica-zone-soft-anti-affinity`, `concurrent-replica-rebuild-per-node-limit`, `replica-replenishment-wait-interval` all confirmed against the Longhorn manager source.
- Semantics of `replica-soft-anti-affinity`: `true` allows same-node scheduling when no other choice exists; `false` (default) is strict — matches the post's explanation.
- Semantics of `replica-zone-soft-anti-affinity`: `false` is strict (replicas across zones), `true` allows same-zone — matches the post.
- `kubectl patch settings.longhorn.io ... --type merge` is the correct mechanism for modifying Longhorn settings via CRDs.
- Volume status fields `.status.state`, `.status.robustness`, and `.spec.numberOfReplicas` are valid; robustness values include `healthy`, `degraded`, `faulted`, `unknown`.
- Replica label selector `longhornvolume=<volume-name>` is the convention used by Longhorn for replica CRs.
- Synchronous replication and `n-1` failure tolerance claims are accurate.

## Review Notes
- The default value of `staleReplicaTimeout` per Longhorn docs is `2880` minutes (48 hours); the post uses `"30"` as an example value. This is a valid configuration choice rather than a documentation error, but readers may want to be aware that aggressive stale timeouts can cause replicas to be considered useless for rebuild sooner than the Longhorn default.
- The UI menu name in the Longhorn dashboard has historically been "Setting" (singular) but newer versions and screenshots use "Settings" — minor wording, not technically incorrect.
- The post does not specify a Longhorn version; the settings and parameters used are stable across recent Longhorn 1.5.x–1.7.x releases.
