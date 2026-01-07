# How to Migrate Legacy VMs to Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Migration, DevOps, Modernization, Automation

Description: A step-by-step plan for lifting applications out of virtual machines and into Docker-covering dependency discovery, data migration, image builds, smoke tests, and rollout strategies.

---

Every company has that VM running critical code from 2014. Containerizing it buys you reproducibility, faster deploys, and easier scaling-but only if you migrate methodically. Here’s the seven-step blueprint we follow.

## 1. Inventory and Baseline

Create a simple worksheet:

| Item | Notes |
| --- | --- |
| OS version | Ubuntu 16.04 |
| App stack | Python 3.6 + Gunicorn |
| Packages | `apt list --installed` export |
| Services | `systemctl list-units --type=service` |
| Scheduled jobs | Cron entries |
| Ports | `ss -tulpn` output |
| Data dirs | `/var/lib/app`, `/etc/app/config.yml` |

Use `osquery`, `ansible setup`, or `chef-ohai` to collect facts automatically. Classify dependencies into runtime, build-time, and host-level (kernel modules, drivers).

## 2. Extract Application Code and Configs

- Pull the latest git commit if it exists; otherwise, rsync `/opt/app`.
- Copy configs and secrets, but never bake secrets into images-store them in Vault/Secrets Manager.
- Document environment variables from `/etc/environment`, service unit files, or `.bashrc`.

## 3. Design the Container Boundary

Decide what belongs in the image vs. runtime:

- **Image:** OS packages, language runtime, application code.
- **Runtime:** Environment variables, secrets, persistent volumes, TLS certs.

Plan volumes for mutable data (uploads, caches) and map host paths or cloud storage accordingly.

## 4. Author the Dockerfile

Create a Dockerfile that replicates the VM's runtime environment. This example containerizes a Python/Gunicorn application extracted from a legacy VM.

```dockerfile
# Use slim Python image (smaller than full debian-based image)
FROM python:3.11-slim AS base
WORKDIR /app

# Install dependencies using Poetry (common in Python projects)
# First, copy only dependency files for better caching
COPY pyproject.toml poetry.lock ./
RUN pip install --upgrade pip \
 && pip install poetry \
 && poetry export -f requirements.txt --output requirements.txt

# Install production dependencies without caching (smaller image)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Configure the application port (matches what the VM was using)
ENV PORT=8000
EXPOSE 8000

# Start Gunicorn with 4 workers (adjust based on container CPU limits)
ENTRYPOINT ["gunicorn", "app.wsgi:application", "-b", "0.0.0.0:8000", "--workers", "4"]
```

Use multi-stage builds if you need compilation, and pin versions to keep reproducibility.

## 5. Migrate Data Safely

- Snapshot the VM and copy databases to managed services or containerized DBs.
- For file storage, sync to S3/NFS and mount into the new container.
- Run checksum comparisons to confirm parity.

## 6. Build, Test, Repeat

Follow this iterative process to validate the containerized application matches the VM's behavior.

1. Build the image with a descriptive tag indicating this is a migration candidate:
   ```bash
   docker build -t ghcr.io/acme/legacy-api:migration .
   ```

2. Run the container with the same environment variables the VM used:
   ```bash
   # Map host port 8080 to container port 8000
   # Load environment variables from file (extracted from VM)
   docker run -p 8080:8000 --env-file env/dev.env ghcr.io/acme/legacy-api:migration
   ```

3. Execute the VM's smoke tests (curl, integration suites, synthetic traffic).
4. Add container tests to CI so regressions stay caught.

## 7. Plan Cutover

- **Blue/Green:** Run the container alongside the VM, point a small percentage of traffic via load balancer weights.
- **Feature Flags:** Use config toggles to switch data sources or dependencies gradually.
- **Rollback:** Keep the VM snapshot ready for a quick revert.

Document operational changes (logs now in `docker logs`, metrics via cAdvisor) and update on-call runbooks.

## 8. Automate Deployments

Pick a runtime: Docker Swarm, Kubernetes, ECS, or Nomad. Define Compose/Helm manifests with resource limits, health checks, and secrets. Integrate with OneUptime for metrics and alerts.

## 9. Decommission the VM

- Freeze cron jobs.
- Archive the VM image for compliance.
- Update CMDB/asset inventory.

Only after 30+ days of stable container operations should you delete the VM to ensure no hidden dependency remains.

---

Migrating VMs takes patience, but the payoff is huge: reproducible builds, automated deploys, and the ability to run the same stack locally, in CI, and in production. Follow this checklist and every "mystery VM" becomes a clean container image.
