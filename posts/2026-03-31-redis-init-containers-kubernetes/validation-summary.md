# Validation Summary: How to Use Redis Init Containers in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.2
- Kubernetes (StatefulSets, Init Containers, Pods)
- busybox container image
- AWS CLI (for S3 snapshot restore)
- kubectl CLI

## Sources Consulted
- Kubernetes API reference for StatefulSet spec — `serviceName` is a required field (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/)
- Kubernetes documentation on init containers (https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- Redis documentation on `vm.overcommit_memory` and Transparent Huge Pages (https://redis.io/docs/latest/operate/oss_and_stack/reference/optimization/admin/)
- Redis configuration directive reference for `maxmemory`, `maxmemory-policy`, `appendonly`, `protected-mode` (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Docker Hub busybox image — confirmed it does not ship `redis-cli` (https://hub.docker.com/_/busybox)
- Docker Hub Redis Alpine image — confirmed it includes `redis-cli` (https://hub.docker.com/_/redis)

## Issues Found

### 1. StatefulSet missing required `serviceName` field
- **What was wrong:** The StatefulSet YAML in Use Case 1 omitted the `serviceName` field, which is required by the Kubernetes API. Without it, the API server rejects the manifest with a validation error.
- **What was changed:** Added `serviceName: redis` to the StatefulSet spec.
- **Why:** `serviceName` is a mandatory field in `StatefulSetSpec` that specifies the headless Service governing Pod network identity.

### 2. Init container using `redis-cli` inside a `busybox` image
- **What was wrong:** Use Case 2 used `busybox:1.36` as the init container image but executed `redis-cli` in its command. BusyBox is a minimal image that does not include Redis tools; the command would fail with "not found."
- **What was changed:** Changed the image from `busybox:1.36` to `redis:7.2-alpine`, which includes `redis-cli`.
- **Why:** The `redis-cli ping` command requires the Redis CLI binary, which is only available in Redis images.

## Review Notes
- The kernel tuning init container (Use Case 1) uses `privileged: true` to modify host-level sysctls (`vm.overcommit_memory`) and Transparent Huge Pages. These are non-namespaced settings that affect the entire node, not just the pod. This is a common pattern but users should be aware of the node-wide impact.
- The StatefulSet example omits `volumeClaimTemplates` for persistent Redis data storage. This is acceptable since the post focuses on init container patterns, not production-ready Redis deployments.
- The `redis.conf` heredoc in Use Case 3 works correctly because YAML block scalars (`|`) strip common leading indentation before the shell interprets the script.
