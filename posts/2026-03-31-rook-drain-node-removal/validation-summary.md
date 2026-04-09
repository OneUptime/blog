# Validation Summary: How to Drain a Node Before Removal from Rook-Ceph

## Status
validated

## Post Type
Tutorial / Step-by-step operational guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, specifically OSD, CRUSH map, and cluster management)
- Kubernetes (node drain, cordon, pod management, CRDs)
- kubectl CLI
- Ceph CLI tools (via rook-ceph-tools deployment)

## Sources Consulted
- Rook documentation on OSD management and node removal (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook documentation on cleanup and OSD purge (https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/)
- Ceph documentation on OSD removal (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Kubernetes documentation on safely draining a node (https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- Rook source code confirming OSD pods are managed as Deployments (not DaemonSets)

## Issues Found

### 1. Mermaid diagram order mismatch and missing steps
**What was wrong:** The flowchart diagram showed "Stop OSDs -> Drain Kubernetes workloads -> Cordon node" but the actual steps in the post correctly perform cordon (Step 5) before drain (Step 6) before stopping OSD pods (Step 7). The diagram was also missing the "Remove OSDs from Ceph" and "Update CephCluster spec" steps.
**What was changed:** Updated the Mermaid diagram to match the actual step order: Cordon -> Drain -> Stop OSD pods -> Remove OSDs from Ceph -> Update CephCluster spec -> Verify -> Delete.
**Why:** The diagram should accurately reflect the procedure to avoid confusing readers who follow it instead of the numbered steps.

### 2. Incorrect claim about OSD pod type in Step 6
**What was wrong:** A comment stated "The drain does NOT evict OSD pods (they are DaemonSet or static pods)". In Rook-Ceph, OSD pods are managed as individual Deployments by the Rook operator, NOT as DaemonSets or static pods. Therefore, `kubectl drain --ignore-daemonsets` WILL evict OSD pods.
**What was changed:** Replaced the incorrect comment with an accurate explanation that OSD pods are Deployments and will be evicted by drain, which is safe because data was already migrated in Step 4.
**Why:** This is a significant factual error that could mislead operators into thinking their OSD pods are protected during drain when they are not. In this procedure it's safe because data was already rebalanced, but the incorrect reasoning could lead to dangerous assumptions in other contexts.

### 3. Incorrect code fence language for ceph status output
**What was wrong:** The expected `ceph status` output block was marked as ` ```yaml ` but the content is plain text Ceph status output, not YAML.
**What was changed:** Changed the code fence language from `yaml` to `text`.
**Why:** Minor formatting correctness; prevents syntax highlighting that doesn't apply.

## Review Notes
- The post correctly emphasizes waiting for complete data backfill before proceeding, which is the most critical safety step in this procedure.
- The `ceph osd crush remove`, `ceph auth del`, and `ceph osd rm` sequence in Step 8 could be simplified to a single `ceph osd purge osd.$OSD_ID --yes-i-really-mean-it` command (available in Ceph Luminous+), but the manual approach shown is also correct and more educational.
- Step 9 (editing CephCluster spec) only applies when `spec.storage.nodes` is explicitly configured. If the cluster uses `useAllNodes: true`, the procedure would differ. This could be noted in a future revision.
- All kubectl commands use correct flags and syntax. The `--delete-emptydir-data` flag is the current non-deprecated form (replacing the old `--delete-local-data`).
