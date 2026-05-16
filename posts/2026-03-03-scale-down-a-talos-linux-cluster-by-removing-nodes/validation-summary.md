# Validation Summary: How to Scale Down a Talos Linux Cluster by Removing Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes
- kubectl CLI
- etcd
- HAProxy (load balancer example)
- Longhorn, Rook-Ceph, LINSTOR (referenced for storage replication)
- Bash scripting

## Sources Consulted
- Talos Linux official documentation — https://www.talos.dev/latest/
- talosctl reference (reset, etcd subcommands) — https://www.talos.dev/latest/reference/cli/
- Talos "Disaster recovery" / "Removing nodes" guides — https://www.talos.dev/latest/talos-guides/howto/
- kubectl drain reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- kubectl cordon / drain task guide — https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- kubectl run reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- etcd FAQ on quorum and fault tolerance — https://etcd.io/docs/v3.5/faq/
- Pod Disruption Budgets — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- **Smoke-test command would fail**: The original command was `kubectl run smoke-test --image=nginx --rm -it -- curl -s http://kubernetes.default`. The official `nginx` image does not include `curl`, so the override command would fail with "executable file not found in $PATH". Additionally, `--rm -it` with `kubectl run` requires `--restart=Never` to behave as a one-shot pod that is cleaned up after exit, and the in-cluster `kubernetes.default` service is served over HTTPS on port 443 (HTTP requests are not the canonical path). Updated to: `kubectl run smoke-test --image=curlimages/curl --rm -it --restart=Never -- curl -sk https://kubernetes.default`. This uses an image that actually has `curl` available, correctly targets HTTPS, and ensures the pod is removed when the command finishes.

## Review Notes
- All `kubectl drain` flags (`--ignore-daemonsets`, `--delete-emptydir-data`, `--grace-period`, `--timeout`, `--force`) are current and correct. The deprecated `--delete-local-data` is correctly not used.
- The `talosctl reset --graceful` invocation and the `--system-labels-to-wipe STATE/EPHEMERAL` flags are valid in current Talos releases.
- `talosctl etcd members`, `talosctl etcd status`, and `talosctl etcd remove-member <member-id>` are the correct subcommands for managing etcd membership on Talos control plane nodes.
- The etcd quorum / fault-tolerance table (3/5/7 members tolerating 1/2/3 failures) is correct.
- The sequence — cordon → drain → (for control plane) remove from etcd → delete node → reset — matches the recommended procedure in the Talos and Kubernetes documentation.
- The example node version comment shows `v1.29.0`; readers running newer Kubernetes versions should treat it as illustrative only.
- The `kubectl get pods -A -o wide | grep -v worker-04` snippet under "Verify Workloads Migrated" will also filter out unrelated lines containing the substring `worker-04`; this is fine as a quick check but a stricter alternative would be `kubectl get pods -A -o wide --field-selector spec.nodeName=worker-04` (which is already used elsewhere in the post).
