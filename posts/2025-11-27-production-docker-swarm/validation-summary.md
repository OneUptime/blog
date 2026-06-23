# Validation Summary: How to Run Production-Ready Docker Swarm Stacks

## Status
validated

## Post Type
Guide / field guide (operational best-practices for running Docker Swarm in production)

## Technologies Covered
- Docker Swarm (clustering, Raft quorum, overlay networks)
- Docker Compose / stack file YAML (`docker stack deploy`)
- Docker secrets and configs
- NFS volumes via `driver_opts`
- Docker healthchecks / rolling updates
- cAdvisor, Prometheus node exporter, OpenTelemetry Collector, Fluent Bit
- CI/CD tooling: `docker buildx bake`, Trivy, GHCR/ECR, GitHub Actions/Jenkins
- OneUptime (observability/alerting)

## Sources Consulted
- Docker Compose file reference — service `healthcheck` key: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose `deploy` key reference (valid sub-keys: replicas, update_config, rollback_config, restart_policy, placement, resources): https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm rolling updates / `update_config` (`order: start-first`, `failure_action: rollback`): https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker secrets in Compose/stack files: https://docs.docker.com/engine/swarm/secrets/
- Docker volume `driver_opts` for NFS: https://docs.docker.com/engine/storage/volumes/#create-a-service-which-creates-an-nfs-volume
- Docker Swarm administration / backup & restore (`/var/lib/docker/swarm`): https://docs.docker.com/engine/swarm/admin_guide/
- `docker swarm ca --rotate` CLI reference: https://docs.docker.com/reference/cli/docker/swarm/ca/
- `docker node update --availability` reference: https://docs.docker.com/reference/cli/docker/node/update/
- FluxCD documentation (Kubernetes-only GitOps): https://fluxcd.io/flux/

## Issues Found
1. **`healthcheck` nested under `deploy:` (Section 2).** In Compose/stack files, `healthcheck` is a top-level *service* key (a sibling of `image` and `deploy`), not a child of `deploy`. The `deploy` key only accepts swarm-specific sub-keys (`replicas`, `update_config`, `rollback_config`, `restart_policy`, `placement`, `resources`). As written, the stack would fail to validate or the healthcheck would be dropped. **Fix:** moved the `healthcheck` block out of `deploy` to the service level and corrected its indentation.
2. **"Flux's Swarm support" (Section 6).** FluxCD is a Kubernetes-only GitOps tool and has no Docker Swarm support; the claim describes a capability that does not exist. **Fix:** reworded step 4 to "from your CI/CD runner (e.g., GitHub Actions or Jenkins)," which is how Swarm stack deploys are actually automated.

## Review Notes
- The encrypted overlay network (`--opt encrypted`), `order: start-first`, `failure_action: rollback`, NFS `driver_opts`, secret/config references with `mode: 0400`, `docker swarm ca --rotate`, and the "secrets mount as tmpfs / mutual TLS by default" claims are all accurate against current Docker docs.
- Section 1's example command `docker node update --availability drain worker-spot` is valid syntax, though the surrounding "keep managers taint-free" wording borrows Kubernetes terminology (Swarm uses availability states, not taints). Left as-is since it is illustrative and not technically wrong.
- Section 7 references `/var/lib/docker/swarm/raft` for snapshots; Docker's official backup guidance is to back up the entire `/var/lib/docker/swarm` directory (the raft state lives within it). The narrower path is imprecise but not incorrect — worth broadening in a future edit.
