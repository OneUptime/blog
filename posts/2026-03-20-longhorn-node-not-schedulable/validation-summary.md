# Validation Summary: How to Fix Longhorn Node Not Schedulable Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Longhorn custom resources (`node.longhorn.io`)
- Taints and tolerations

## Sources Consulted
- Longhorn Node Conditions: https://longhorn.io/docs/1.11.0/nodes-and-volumes/nodes/node-conditions/
- Longhorn Settings Reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn Multiple Disk Support: https://longhorn.io/docs/1.11.1/nodes-and-volumes/nodes/multidisk/
- Longhorn Scheduling: https://longhorn.io/docs/1.11.1/nodes-and-volumes/nodes/scheduling/
- Longhorn Node Space Usage: https://longhorn.io/docs/1.11.1/nodes-and-volumes/nodes/node-space-usage/
- Longhorn Evicting Replicas on Disabled Disks or Nodes: https://longhorn.io/docs/1.11.1/nodes-and-volumes/nodes/disks-or-nodes-eviction/
- Longhorn Taints and Tolerations: https://longhorn.io/docs/1.11.1/advanced-resources/deploy/taint-toleration/
- Longhorn CRD definitions: https://raw.githubusercontent.com/longhorn/longhorn/master/chart/templates/crds.yaml
- Longhorn node validator: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/webhook/resources/node/validator.go

## Issues Found
- The post used `kubectl get lhnode` and related `lhnode` commands, but the current Longhorn CRD uses `node.longhorn.io` and `nodes.longhorn.io`, with `lhn` as the short name. I replaced the resource names so the commands match the shipped CRD.
- The initial discovery command only showed the `Schedulable` status condition, which reflects cordon state and does not reveal `spec.allowScheduling=false`. I added `ALLOW_SCHEDULING` so readers can identify manual scheduling disablement directly.
- The post claimed Longhorn stops scheduling at a default 85% disk-usage threshold. Current Longhorn docs define scheduling in terms of `Storage Minimal Available Percentage` with a default of 25% free space, and the default root disk also reserves 30% space. I corrected the explanation and the related best-practices guidance.
- The post referred to `diskReady: false`, but current Longhorn disk status uses condition types such as `Ready` and `Schedulable`. I updated the wording and generalized the host-path examples to use `<disk-path>` instead of always assuming `/var/lib/longhorn`.
- The taint section implied the UI setting alone was sufficient. Longhorn requires matching tolerations for both user-deployed components and system-managed components. I corrected the setting name and added that missing requirement.
- The eviction section implied canceling `evictionRequested` alone restores schedulability. Longhorn only allows eviction on scheduling-disabled nodes or disks, so canceling eviction may still leave `allowScheduling=false`. I added that clarification.

## Review Notes
- Verified against Longhorn 1.11.x documentation and current official CRD/source definitions.
- Using the full resource names `node.longhorn.io` and `nodes.longhorn.io` is safer in documentation than relying on short names.
