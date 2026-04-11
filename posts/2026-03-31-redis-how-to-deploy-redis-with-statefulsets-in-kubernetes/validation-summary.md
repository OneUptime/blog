# Validation Summary: How to Deploy Redis with StatefulSets in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (Alpine image)
- Kubernetes StatefulSets
- Kubernetes Services (Headless and ClusterIP)
- Kubernetes ConfigMaps and Secrets
- Persistent Volume Claims (PVCs)

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis CLI REDISCLI_AUTH documentation: https://redis.io/docs/latest/develop/tools/cli/
- Kubernetes Probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found

### 1. Redis password not wired into configuration (Critical)
**What was wrong:** The post created a Kubernetes Secret and set a `REDIS_PASSWORD` environment variable on the main container, but never added `requirepass` or `masterauth` directives to the Redis configuration. This meant Redis would run without any authentication despite the post implying password protection was in place. The "Connecting from an Application Pod" section showed URLs with passwords, which would not work without `requirepass`.

**What was changed:** Updated the initContainer script to append `requirepass $REDIS_PASSWORD` and `masterauth $REDIS_PASSWORD` to redis.conf at startup. Added the `REDIS_PASSWORD` env var (from the Secret) to the initContainer so it has access to the password value.

**Why:** Without `requirepass`, Redis accepts unauthenticated connections. Without `masterauth`, replicas cannot authenticate to the primary when replication is configured with a password. Both are required for a properly secured Redis deployment.

### 2. Probes would fail with password authentication (Critical)
**What was wrong:** The readiness and liveness probes used `redis-cli ping` without any authentication. Once `requirepass` is configured, unauthenticated `redis-cli` commands return a `NOAUTH` error, causing probes to fail and pods to be killed/marked unready.

**What was changed:** Added a `REDISCLI_AUTH` environment variable to the main container, sourced from the same Secret. The `redis-cli` tool automatically reads `REDISCLI_AUTH` for authentication, so the probe commands work without modification.

**Why:** `REDISCLI_AUTH` is the standard way to provide authentication to redis-cli without passing `-a` on the command line (which produces security warnings). This ensures probes authenticate correctly.

### 3. initContainer lacked password access
**What was wrong:** The initContainer needed to write password-related directives into redis.conf but had no access to the Secret.

**What was changed:** Added the `REDIS_PASSWORD` env var to the initContainer, sourced from the `redis-secret` Secret.

**Why:** The initContainer runs before the main container and is responsible for generating the final redis.conf. It needs the password to write `requirepass` and `masterauth` directives.

## Review Notes
- The `storageClassName: standard` may not exist in all Kubernetes clusters. Users on cloud providers may need to adjust this (e.g., `gp2` on AWS EKS, `standard-rwo` on GKE).
- The `protected-mode no` directive in the ConfigMap is acceptable here since the deployment is within a Kubernetes cluster network, but users should be aware this disables Redis's built-in network protection.
- The post uses a simple primary-replica topology via `replicaof`. For production use, Redis Sentinel or Redis Cluster would provide automatic failover. This is acceptable for a tutorial scope.
- The `save` directives (RDB snapshots) combined with `appendonly yes` (AOF) enables dual persistence, which is a valid configuration for durability but may be worth noting for readers concerned about disk I/O.
