# Validation Summary: How to Migrate from Portainer to Rancher

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer (source platform)
- Rancher (target platform)
- Kubernetes (apps/v1 Deployments, PersistentVolumeClaim, Pod)
- Docker / Docker Swarm / Docker Compose (CLI inventory)
- kompose (Docker Compose to Kubernetes converter, v1.31.0)
- kubectl (apply, wait, run, get)
- Longhorn (storage class for Rancher)
- AWS CLI (S3 sync, Route53 DNS records)
- Python 3 with PyYAML
- Bash scripting
- Fleet (mentioned for GitOps)

## Sources Consulted
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Pod Lifecycle (conditions vs phases): https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- kompose releases: https://github.com/kubernetes/kompose/releases (v1.31.0 confirmed)
- Kubernetes Deployment API (apps/v1) and PVC API (v1)
- Docker CLI references for `docker service ls`, `docker volume ls`, `docker network ls`, `docker secret ls`, `docker config ls`
- AWS Route53 `change-resource-record-sets` CLI reference

## Issues Found
- **`kubectl wait --for=condition=Succeeded` is not valid for Pods.** "Succeeded" is a Pod *phase* (`status.phase`), not a condition (`status.conditions[]`). The standard Pod conditions are `PodScheduled`, `ContainersReady`, `Initialized`, and `Ready`. Using `--for=condition=Succeeded` would never match and would time out after the 3600s deadline. Replaced with the canonical jsonpath form documented in the official kubectl wait reference: `--for=jsonpath='{.status.phase}'=Succeeded`. (jsonpath support was added in Kubernetes 1.23.)

## Review Notes
- The Python conversion script's port parser handles only the simple short-form `host:container` and bare-int port specs. Compose long-form ports (`{target, published, protocol}`) and `host:container/protocol` strings (e.g., `"80:80/tcp"`) would raise; this is acceptable for an illustrative example but readers with non-trivial Compose files should reach for kompose (Step 3) instead.
- The Python script imports `subprocess` but does not use it. Cosmetic only.
- The `curl` install line for kompose and the `kubectl run` line contain runs of multiple spaces between arguments. Bash collapses these, so the commands still execute correctly — purely a visual artifact and left as-is.
- `--restart=Never` on `kubectl run` is still functional but the generator-based form has been deprecated; modern kubectl creates a Pod directly. No change needed.
- The post frames the migration as Portainer → Rancher but the inventory examples (Docker Swarm, Docker Compose, ECS) cover broader source platforms. This is fine since Portainer commonly fronts Swarm/Compose environments, but readers running Portainer's KaaS/Kubernetes mode would skip Steps 1–3.
- v1.31.0 of kompose is real but no longer the latest; the install command remains valid. Future updates may want to bump to a newer release.
