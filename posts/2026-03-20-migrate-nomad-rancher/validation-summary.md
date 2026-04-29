# Validation Summary: How to Migrate from Nomad to Rancher

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- HashiCorp Nomad (source platform)
- Rancher / Kubernetes (target platform)
- kubectl
- kompose (Docker Compose to Kubernetes converter)
- Longhorn (PVC storage class)
- AWS S3 (data migration source)
- AWS Route53 (DNS cutover)
- Python (PyYAML) for manifest conversion
- Bash scripts

## Sources Consulted
- kubectl wait reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait
- Pod status conditions: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions
- kompose releases: https://github.com/kubernetes/kompose/releases (verified v1.31.0 binary at the linked URL)
- Nomad CLI documentation: https://developer.hashicorp.com/nomad/docs/commands (job status, node status, volume status, var list)
- Longhorn install/StorageClass docs: https://longhorn.io/docs/ (default StorageClass name `longhorn`)
- AWS CLI route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Kubernetes Deployment apps/v1 spec: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- PersistentVolumeClaim v1 spec: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found

1. **Incorrect `kubectl wait` condition for Pod completion** (Step 4).
   - Original: `kubectl wait pod/data-migrator ... --for=condition=Succeeded --timeout=3600s`
   - Pods do not have a `Succeeded` condition — `Succeeded` is a value of `.status.phase`. The documented Pod conditions are `PodScheduled`, `Initialized`, `ContainersReady`, and `Ready`. Using `--for=condition=Succeeded` would never satisfy and the wait would time out.
   - Fixed to: `--for=jsonpath='{.status.phase}'=Succeeded`, which is the official kubectl pattern for waiting on a pod's phase.

2. **Inventory section referenced Docker Swarm/Compose/ECS instead of Nomad** (Step 1).
   - The post is titled "Migrate from Nomad to Rancher" but the inventory script's commented examples used `docker service ls`, `docker-compose ps`, `aws ecs list-services`, `docker volume ls`, `docker network ls`, `docker secret ls`, and `docker config ls` — none of which apply to a Nomad source environment.
   - Replaced with the equivalent Nomad CLI commands: `nomad job status`, `nomad job inspect`, `nomad node status`, `nomad volume status`, `nomad var list` (Nomad Variables, available since 1.4), and a note about Vault for secrets.

## Review Notes

- The Step 2 Python conversion script and the Step 3 `kompose` tool both target Docker Compose -> Kubernetes, not Nomad -> Kubernetes. The code itself is technically correct for that use case, and they remain useful when teams have intermediate Compose definitions or for sidecar Compose-based services. However, future revisions of this post would benefit from also showing a Nomad HCL job spec -> Kubernetes manifest conversion path (e.g., manually mapping `task` groups to Deployments/StatefulSets, `service` blocks to Kubernetes Services, and CSI volume mounts to PVCs). Per the review scope (no restructuring), these sections were left intact.
- kompose v1.31.0 was released in mid-2023; newer versions (1.34.x / 1.36.x) exist as of 2025. The pinned version still works but consumers may want to bump it.
- The `kubectl run test-client ... --rm -it --restart=Never` pattern in Step 5 is correct, though `--rm -it` requires an attached terminal; in CI/non-interactive contexts users would need to drop `-it` and use `--attach=false` plus a separate `kubectl logs`.
- The Route53 UPSERT command is correct; users should remember that the previous record's TTL governs how long stale resolvers will hold the old IP, not the new TTL value.
- Kubernetes API versions used (`apps/v1` for Deployment, `v1` for Pod/PVC) are current and not deprecated.
