# Validation Summary: How to Migrate Workloads Between Rancher Clusters

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Rancher (Kubernetes management platform)
- Kubernetes (kubectl, Deployments, Pods, PVCs)
- Docker Compose / Docker Swarm / AWS ECS (as source platforms)
- kompose (Docker Compose to Kubernetes converter)
- Longhorn (storage class)
- AWS CLI (S3 sync, Route53)
- Bash and Python scripting
- PyYAML

## Sources Consulted
- Kubernetes Pod Lifecycle (conditions vs. phases): https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kompose releases: https://github.com/kubernetes/kompose/releases/tag/v1.31.0
- kubectl run / Pod conventions: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- AWS Route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Kubernetes PersistentVolumeClaim spec: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Longhorn storage class docs: https://longhorn.io/docs/

## Issues Found
1. **`kubectl wait --for=condition=Succeeded pod/...`** in Step 4 (data migration). "Succeeded" is a Pod *phase* (`.status.phase`), not a Pod *condition* (the standard Pod conditions are `PodScheduled`, `Initialized`, `ContainersReady`, `Ready`). The original command would block until timeout because the condition would never be matched. Replaced with `--for=jsonpath='{.status.phase}'=Succeeded`, which is the documented way to wait on a phase value (added in kubectl v1.23+).

## Review Notes
- The post's title says "Between Rancher Clusters" but the body actually walks through migrating *into* Rancher from Docker Compose / Docker Swarm / ECS. The conclusion paragraph also reads awkwardly ("Migrating to Rancher from workloads-clusters"). This appears to be a content/title mismatch but is not a technical inaccuracy, so it was left as-is per the "no stylistic changes" guidance.
- The Python conversion script imports `subprocess` but never uses it — harmless dead import, not a technical error.
- The Python port-parsing logic only handles simple `host:container` and bare-port forms. Docker Compose long-form port mappings (e.g., `127.0.0.1:8001:8080` or dictionary syntax) would not parse correctly, but this is acceptable for an illustrative example.
- `kubectl run --restart=Never` still works as documented; since kubectl 1.18 the `--restart` flag effectively only chooses generators (Pod is the only valid one for `Never`), but the command remains valid.
- kompose v1.31.0 is a real release (published 2023-09-29) and the download URL is valid. Newer releases exist; users may wish to pin the latest stable version when running this in production.
- The `kubectl get pods -n my-app | grep -c Running` check in Step 7 is a heuristic and will count any line containing the substring "Running" (e.g., a pod whose name contains "running"); this is acceptable for an example checklist but is not a robust health check.
