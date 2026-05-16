# Validation Summary: How to Deploy Redis Cluster on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Redis 7.2 (Redis Cluster mode)
- Kubernetes (StatefulSet, Headless Service, ConfigMap, Secret, PVC)
- redis-cli (cluster create / add-node / rebalance)
- oliver006/redis_exporter (Prometheus metrics)
- Pod anti-affinity scheduling

## Sources Consulted
- Redis Cluster spec / tutorial: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/ and https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis configuration reference (redis.conf directives — `cluster-enabled`, `cluster-node-timeout`, `cluster-announce-port`, `cluster-announce-bus-port`, `appendonly`, `appendfsync`, `maxmemory`, `maxmemory-policy`): https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Kubernetes Container `command`/`args` env var expansion: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#use-environment-variables-to-define-arguments
- Kubernetes `ExecAction` (probes) API — confirms commands are exec'd directly without shell or `$(VAR)` substitution: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/ (and upstream `k8s.io/api/core/v1/types.go`)
- Kubernetes StatefulSet headless service / stable pod DNS: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- oliver006/redis_exporter env-var/flag reference (`REDIS_ADDR`, `REDIS_PASSWORD`): https://github.com/oliver006/redis_exporter#flags
- Talos Linux documentation: https://www.talos.dev/latest/

## Issues Found
1. **Liveness/readiness probes used `$(REDIS_PASSWORD)` in `exec.command`, which Kubernetes does not expand.** Per the Kubernetes API, `$(VAR_NAME)` expansion only applies to `Container.command`/`args`; `ExecAction.command` is exec'd directly (no shell, no env-var substitution), so the probe would have passed the literal string `$(REDIS_PASSWORD)` to redis-cli and authentication would fail. Fixed both probes by wrapping the redis-cli invocation in `sh -c '...'` so the shell expands `$REDIS_PASSWORD` at runtime, and added a short comment explaining why.

## Review Notes
- The container's main `command` correctly uses `$(REDIS_PASSWORD)` — that field *does* support Kubernetes env-var expansion, so no change was needed there.
- Other technical details verified as correct: 16384 hash slots, default cluster-bus port 16379 (client port + 10000), `redis-cli --cluster create ... --cluster-replicas 1 --cluster-yes` semantics (3 primaries + 3 replicas from 6 nodes), headless Service with `clusterIP: None` for stable pod DNS, redis_exporter's `REDIS_ADDR` / `REDIS_PASSWORD` env vars, and the stable pod DNS form `redis-cluster-0.redis-cluster.redis-cluster.svc.cluster.local`.
- `image: oliver006/redis_exporter:latest` works but pinning to a specific tag would be better practice for reproducibility.
- `bind 0.0.0.0` plus `protected-mode no` is acceptable inside an isolated cluster network with `requirepass` enabled, but operators deploying to shared environments should also consider NetworkPolicies.
- `redis-cli -a <password>` triggers a "Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe." warning in modern Redis; functionally fine inside scripted `kubectl exec` flows, but worth noting.
- The Redis 7.2 image is current and supported at time of review; readers on newer Redis 7.x or 8.x lines should re-verify config directive compatibility.
