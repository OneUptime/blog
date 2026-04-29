# Validation Summary: How to Debug Longhorn Replica Rebuilding Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Linux host storage diagnostics (`dmesg`, `smartctl`)

## Sources Consulted
- Longhorn replica rebuilding documentation: https://longhorn.io/docs/1.11.1/advanced-resources/rebuilding/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn volume and replica conditions: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/volume-conditions/
- Longhorn knowledge base article on failed replica deletion and rebuild loops: https://longhorn.io/kb/troubleshooting-handling-persistent-replica-failures-via-node-or-disk-isolation/
- Official Longhorn CRD manifest (`volumes.longhorn.io`, `replicas.longhorn.io`, `nodes.longhorn.io`): https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Official Longhorn replica API type (`RebuildFailed`, `WaitForBackingImage`): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/pkg/apis/longhorn/v1beta2/replica.go
- Official Longhorn settings definitions (`replica-rebuild-concurrent-sync-limit`): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/types/setting.go
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used invalid Longhorn resource names (`lhvolume`, `lhreplica`, `lhnode`). I changed them to the actual CRD resources (`volumes.longhorn.io`, `replicas.longhorn.io`, `nodes.longhorn.io`) based on the official CRD manifest.
- The first `kubectl get` example labeled `.status.currentNodeID` as `REPLICAS`, but that field is the attached node ID, not the replica count. I renamed the output column to `NODE`.
- The post referred to a replica being stuck in `WaitForCleaning`, but the public replica CRD documents `RebuildFailed` and `WaitForBackingImage` conditions instead. I changed the section to the documented `RebuildFailed` condition.
- The post recommended force deleting a replica CR with `--force`. I changed this to a normal replica deletion because Longhorn’s documented recovery flow is to delete the failed replica and allow Longhorn to recreate it, and the original command did not match Kubernetes force-delete guidance.
- The scheduling section referred to `Unschedulable: true` on Longhorn nodes. I corrected this to the actual Longhorn node indicators `Schedulable: False` and `AllowScheduling: false`.
- The rebuild tuning snippet used the wrong setting key (`concurrent-volume-backup-restore-per-node-limit`). I replaced it with the correct rebuild setting, `replica-rebuild-concurrent-sync-limit`, and used a `kubectl patch` example that matches the current setting format.
- The concurrent rebuild section tried to count rebuilds using `kubectl get ... | grep RB`, which does not correspond to an official replica state or column. I replaced it with checking and patching the actual `concurrent-replica-rebuild-per-node-limit` setting.
- The best-practices note said to "run" Replica Auto Balance after adding nodes. I corrected this because Replica Auto Balance is a Longhorn setting/behavior, not a manual command.
- The best-practices note said to keep disk usage below 80%. I changed this to the documented Longhorn rule: keep enough free space to satisfy `Storage Minimal Available Percentage`, which is 25% free by default.
- The host-level disk diagnostic commands did not account for the elevated privileges usually required to read kernel logs and SMART data. I added `sudo` to those commands.

## Review Notes
- The `replica-rebuild-concurrent-sync-limit` setting is most relevant to newer Longhorn releases that support scaled replica rebuilding and is data-engine specific (`v1` in current settings).
- `concurrent-replica-rebuild-per-node-limit` controls node-wide rebuild contention, while `replica-rebuild-concurrent-sync-limit` affects how many healthy replicas can sync to a single rebuilding replica.
- The remaining operational recommendations, such as replica count and alert thresholds, are workload-dependent but are not technically incorrect.
