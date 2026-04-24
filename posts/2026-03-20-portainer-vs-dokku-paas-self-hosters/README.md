# Portainer vs Dokku: PaaS Comparison for Self-Hosters - Paas Self Hosters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Dokku, PaaS, Self-Hosted, Docker, Heroku, Git Deploy

Description: Compare Portainer and Dokku for self-hosted application deployment, evaluating their different approaches to git-push deployments versus container management control.

---

Dokku is a self-hosted PaaS built on Docker that replicates the Heroku `git push` deployment workflow. Portainer is a container management platform. They overlap around container deployment, but offer fundamentally different deployment paradigms.

## Deployment Approach

**Dokku**: Git push to deploy - like Heroku on your own server.

```bash
# Dokku deployment workflow

git remote add dokku dokku@server.com:myapp
git push dokku main
# Dokku builds from source, deploys, configures the default proxy, done
```

**Portainer**: Deploy via UI or API - requires Docker images or Compose files, and can also deploy Compose files from a Git repository.

```bash
# Portainer deployment workflow
# 1. Build and push your image: docker push myregistry/myapp:v1.2
# 2. Create/update stack in Portainer UI or via API, or point Portainer at a Git repo with a Compose file
```

## Feature Comparison

| Feature | Portainer | Dokku |
|---------|-----------|-------|
| Git push deploy | No native support | Native |
| Auto-build from source | Limited | Yes (Buildpacks/Dockerfile) |
| Automatic SSL | No | Via Let's Encrypt plugin |
| Custom domains | No | Yes |
| Process scaling | Manual | `dokku ps:scale myapp web=3` |
| Docker Compose | Full | No native support |
| Multi-host | Yes | Via k3s scheduler |
| Kubernetes | Yes | Via k3s scheduler |
| Plugin ecosystem | No | Yes |

## Dokku Strengths

Dokku excels for developer self-hosting:

```bash
# Dokku is a Heroku replacement
# Set env vars
dokku config:set myapp DATABASE_URL=postgres://...

# Scale processes
dokku ps:scale myapp web=2 worker=1

# Add a Postgres database
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git
dokku postgres:create mydb
dokku postgres:link mydb myapp
```

- **Buildpack support** - auto-detects language, builds without Dockerfile
- **Procfile support** - define web/worker processes like Heroku
- **Plugin ecosystem** - Postgres, Redis, MongoDB, Let's Encrypt plugins

## Portainer Strengths

Portainer provides full container infrastructure control:

- Manage containers, volumes, networks as primitives
- Deploy Compose stacks with full YAML control
- Multi-host and Kubernetes management
- Team access with RBAC in Business Edition
- Not limited to web applications

## When to Choose Each

**Choose Dokku when:**
- You're replacing Heroku for cost reasons
- You want `git push` deployments
- You're deploying web applications with standard buildpack support
- Single-server deployments are sufficient

**Choose Portainer when:**
- You need full Docker control
- Multi-service Docker Compose applications
- Multiple servers or Kubernetes
- Non-web workloads (databases, queues, IoT)
- Team access with different permission levels

## Summary

Dokku is the best Heroku replacement for solo developers and small teams deploying web apps. Portainer is the right choice when you need full infrastructure control, multi-service orchestration, or multi-server management. They serve different self-hosting use cases rather than being direct alternatives.
