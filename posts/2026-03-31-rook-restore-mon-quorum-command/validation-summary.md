# Validation Summary: How to Restore Mon Quorum Using the restore-quorum Command in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Monitor (mon) quorum
- kubectl-rook-ceph plugin
- Kubernetes (kubectl)

## Sources Consulted
- Rook Disaster Recovery Documentation: https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- kubectl-rook-ceph plugin mons documentation: https://github.com/rook/kubectl-rook-ceph/blob/master/docs/mons.md
- kubectl-rook-ceph restore_quorum.go source code: https://github.com/rook/kubectl-rook-ceph/blob/main/pkg/mons/restore_quorum.go
- Rook operator mon.go source code: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mon/mon.go
- Rook GitHub issue #3985 (original feature request): https://github.com/rook/rook/issues/3985
- Rook PR #11184 (documentation update resolving the feature request): https://github.com/rook/rook/pull/11184

## Issues Found

### 1. CRITICAL: Non-existent annotation-based mechanism (entire approach was wrong)
- **What was wrong:** The post claimed that restore-quorum is triggered by adding a `ceph.rook.io/restore-mon-quorum` annotation to the CephCluster CR. This annotation does not exist in Rook's source code. The correct mechanism is the `kubectl rook-ceph mons restore-quorum <mon-id>` command provided by the kubectl-rook-ceph plugin.
- **What was changed:** Replaced the annotation-based instructions with the correct `kubectl rook-ceph mons restore-quorum` plugin command. Added a section on installing the kubectl-rook-ceph plugin as a prerequisite.
- **Why:** The annotation `ceph.rook.io/restore-mon-quorum` was entirely fabricated. No such annotation exists in the Rook operator codebase. Following the original instructions would have no effect on a real cluster.

### 2. Incorrect description of the restore process steps
- **What was wrong:** The post described 4 high-level steps performed by "the Rook operator." The actual restore-quorum process is performed by the kubectl-rook-ceph plugin (not the operator's reconciliation loop) and involves 10 distinct steps including scaling down the operator, extracting/modifying/injecting the monmap, updating the ConfigMap, and requiring interactive confirmation.
- **What was changed:** Replaced the 4-step description with the accurate 10-step process as implemented in the plugin's `restore_quorum.go` source code.
- **Why:** The original steps were inaccurate and omitted critical details like the operator being scaled down, the monmap extraction/injection process, and the interactive confirmation prompts.

### 3. Incorrect annotation removal step
- **What was wrong:** The post instructed users to remove the `ceph.rook.io/restore-mon-quorum` annotation after recovery using `kubectl annotate ... ceph.rook.io/restore-mon-quorum-`. Since the annotation doesn't exist, this step is meaningless.
- **What was changed:** Removed the annotation removal command. The plugin handles all cleanup automatically.
- **Why:** There is no annotation to remove. The plugin manages the entire lifecycle of the restore operation.

### 4. Summary section described wrong mechanism
- **What was wrong:** The summary stated the operation is "triggered by annotating the CephCluster CR."
- **What was changed:** Updated to correctly describe the `kubectl-rook-ceph` plugin command.
- **Why:** Consistency with the corrected content throughout the post.

## Review Notes
- The `kubectl-rook-ceph` plugin's `restore-quorum` command requires two interactive confirmations (`yes-really-restore` and `continue`), which is appropriate for such a destructive operation. The post now mentions these prompts.
- The kubectl commands for checking pod status, verifying recovery via `ceph status`, and the post-recovery health checks are all correct.
- The example `ceph status` output showing `HEALTH_WARN` with one mon in quorum is realistic for the post-restore state.
- The `kubectl krew install rook-ceph` installation method is one way to install; users can also download binaries directly from the GitHub releases page.
