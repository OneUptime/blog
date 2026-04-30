# Validation Summary: How to Migrate VMs Between Nodes in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- `kubectl`
- `virtctl`

## Sources Consulted
- Harvester Live Migration: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- Harvester Host Management / Node Maintenance: https://docs.harvesterhci.io/v1.7/host/
- KubeVirt Live Migration user guide: https://kubevirt.io/user-guide/compute/live_migration/
- KubeVirt Node Assignment user guide: https://kubevirt.io/user-guide/compute/node_assignment/
- KubeVirt `virtctl migrate` source: https://github.com/kubevirt/kubevirt/blob/main/pkg/virtctl/vm/migrate.go
- KubeVirt migration phase definitions: https://github.com/kubevirt/kubevirt/blob/main/staging/src/kubevirt.io/api/core/v1/types.go
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/

## Issues Found
- The introduction and migration-type table described "cold migration" of stopped VMs as a native Harvester migration mode. Harvester's official docs focus on live migration for migratable VMs and maintenance workflows that may shut down and restart non-migratable VMs. I rewrote those lines to match the documented behavior.
- The prerequisites implied that generic shared Longhorn storage was the key requirement. Harvester documents additional live-migration blockers such as `CD-ROM`, `Container Disk`, `ReadWriteOnce`, and node selectors that bind a VM to a single node. I replaced the prerequisite with migration-eligibility requirements.
- The UI steps said to click **Confirm** and implied Harvester could automatically choose a node from that screen. Harvester's live migration docs show selecting a node and clicking **Apply**, so I corrected the UI instructions.
- The `kubectl get vmi ... -o jsonpath='{.status.migrationState}' | jq .` example was incorrect because JSONPath output is not JSON. I changed it to `-o json | jq '.status.migrationState'`.
- The event-filter example used `--field-selector reason=Migration`, which is not a reliable generic filter for KubeVirt migration events. I replaced it with a migration-related grep over time-sorted events.
- The "specific node" section used a soft affinity patch plus an unrelated node label, which did not guarantee the requested destination node. I replaced it with KubeVirt's supported one-off `virtctl migrate --addedNodeSelector ...` flow using the node hostname label.
- The maintenance section used an unsupported `virtctl migrate --all -n default --node ...` command and a generic `kubectl drain` recipe that did not match Harvester's documented node-maintenance workflow. I replaced that section with Harvester Maintenance Mode guidance and the documented manual `kubectl drain` fallback for the two-control-plane node-removal case.
- The bulk migration section claimed it moved VMs "from one node to another" even though the script only evacuates VMs off a source node and lets the scheduler choose the destination. I corrected the heading, comments, and completion message to reflect what the script actually does.
- The troubleshooting section referred to a "migration pod" even though the example retrieves the VM's `virt-launcher` pod. I corrected the wording and made the log command explicit with `--all-containers=true`.

## Review Notes
- The post now matches current Harvester v1.7 and current KubeVirt migration behavior as of April 30, 2026.
- Harvester also documents CPU-model compatibility as a live-migration limitation. The post does not cover CPU-model tuning in detail, but readers should be aware that mismatched CPU models can still block migration even when storage and scheduling rules are otherwise valid.
