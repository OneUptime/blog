# How to Run Production-Ready Docker Swarm Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Swarm, DevOps, Reliability, Monitoring, Automation

Description: A field guide to operating Docker Swarm in production-covering cluster design, rolling updates, health checks, persistent volumes, secrets, and observability.

---

Swarm is still the easiest orchestrator to explain to ops teams that do not need Kubernetes-level complexity. The trick is treating it like production infrastructure: managers quorum, overlay networks, secrets, and sane CI/CD. Here is the blueprint.

## 1. Design the Cluster

- **Managers:** Run three or five managers for Raft quorum. Spread them across racks/AZs when possible.
- **Workers:** Scale horizontally; keep managers taint-free (`docker node update --availability drain worker-spot`) so workloads land on workers.
- **Networking:** Use encrypted overlay networks (`--opt encrypted`). Place external-facing services behind Traefik or HAProxy for TLS termination.

## 2. Rolling Updates with Health Checks

This stack file configures zero-downtime deployments with automatic rollback if new containers fail health checks.

```yaml
services:
  api:
    image: ghcr.io/acme/api:1.4.0
    deploy:
      replicas: 6                      # Run 6 instances across workers
      update_config:
        parallelism: 2                 # Update 2 containers at a time
        order: start-first             # Start new before stopping old (zero downtime)
        failure_action: rollback       # Auto-rollback if health checks fail
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
        interval: 10s                  # Check every 10 seconds
        timeout: 3s                    # Fail if no response in 3 seconds
        retries: 3                     # Mark unhealthy after 3 failures
```

- `start-first` spins up a new task before stopping the old one (blue/green style).
- `failure_action: rollback` reverts automatically when health checks fail.

## 3. Persistent Storage Options

1. **Local named volumes** for single-node state (Redis, caches).
2. **NFS/SMB** mounts via `driver_opts` for shared data.
3. **CSI/third-party plugins** (Portworx, Rex-Ray) for cloud block storage.

This example configures an NFS volume for PostgreSQL data that can be accessed by containers on any node in the swarm.

```yaml
volumes:
  pgdata:
    driver_opts:
      type: "nfs"                                   # Use NFS filesystem
      o: "addr=10.0.0.5,nolock,hard,timeo=600,retrans=3"  # NFS mount options
      device: ":/exports/pgdata"                    # NFS export path on server
```

Document recovery steps: how to remount, how to rebuild nodes, where backups live.

## 4. Secrets and Configs

Swarm provides built-in secrets management. Secrets are encrypted at rest and only available to services that need them.

```bash
# Create a secret from stdin (pipe to avoid shell history)
echo "supersecret" | docker secret create pg_password -

# Create a config from a file (non-sensitive configuration)
docker config create app_settings config/prod.yaml
```

Reference them in stacks to securely inject credentials and configuration files.

```yaml
services:
  api:
    secrets:
      - source: pg_password           # Reference the secret by name
        target: pg_password           # Path inside container: /run/secrets/pg_password
        mode: 0400                    # Read-only, owner only (secure)
    configs:
      - source: app_settings          # Reference the config by name
        target: /app/config.yaml      # Mount at this path in the container
```

Secrets mount as tmpfs, automatically scoped per service.

## 5. Health Probes and Alerts

- Configure `HEALTHCHECK` in Dockerfiles or stack files.
- Use `docker service ps --no-trunc` and `docker node ls` in monitoring scripts.
- Ship metrics/logs via cAdvisor + OpenTelemetry Collector to OneUptime for dashboards and alerting (stack CPU, restart counts, network errors).

## 6. CI/CD Pipeline

1. Build multi-arch images with `docker buildx bake`.
2. Scan with `trivy image`.
3. Push to registry (GHCR/ECR).
4. Update stack using `docker stack deploy -c stack.yaml myapp` via GitOps (e.g., Flux's Swarm support) or Jenkins.
5. Run `docker service ls` + smoke tests post-deploy.

## 7. Backup and Disaster Recovery

- Schedule `docker swarm join-token` backups.
- Regularly snapshot Raft state (`/var/lib/docker/swarm/raft`). Store encrypted copies off-cluster.
- Keep infrastructure-as-code (Terraform/Ansible) for node provisioning.

## 8. Security Hardening

- Rotate manager certificates periodically (`docker swarm ca --rotate`).
- Enforce mutual TLS for inter-node traffic (Swarm does this by default; verify with `docker info`).
- Limit published ports; use ingress network + reverse proxies.
- Run workers with the minimal OS (Bottlerocket, Flatcar) and patch automatically.

## 9. Observability Checklist

- `docker events` streaming into OneUptime to spot rollbacks/reschedules.
- Prometheus scraping node exporter + cAdvisor.
- Log routing through Fluent Bit → OpenTelemetry Collector → backend of choice.
- Trigger synthetic checks against published services to catch regressions beyond Swarm.

---

Docker Swarm remains a pragmatic orchestrator when you couple it with disciplined deploys, secrets, health checks, and monitoring. Treat managers as control-plane nodes, automate stack rollouts, and bake observability in from day zero to keep Swarm boring in production-the highest compliment an ops team can give.
