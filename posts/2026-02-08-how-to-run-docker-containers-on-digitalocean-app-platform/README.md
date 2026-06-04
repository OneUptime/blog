# How to Run Docker Containers on DigitalOcean App Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DigitalOcean, App Platform, Cloud, PaaS, Deployment, DevOps, Container

Description: Learn how to deploy Docker containers on DigitalOcean App Platform with automatic builds, scaling, and managed infrastructure.

---

DigitalOcean App Platform is a Platform-as-a-Service that builds and runs your applications from source code or Docker images. It handles SSL certificates, load balancing, scaling, and zero-downtime deployments. You push code or point to a container image, and App Platform does the rest. For teams that want the convenience of Heroku with more control over the underlying container, App Platform is a solid choice.

## Deployment Options

App Platform supports several ways to deploy Docker containers:

1. **From a Dockerfile in your repo** - App Platform builds the image for you
2. **From DigitalOcean Container Registry (DOCR)** - Pre-built images
3. **From Docker Hub** - Public or private images
4. **From GitHub Container Registry (GHCR)** - Public or private images

## Deploying from a Dockerfile

The simplest approach. Point App Platform at a repo containing a Dockerfile.

### Using the CLI

Install the DigitalOcean CLI:

```bash
# Install doctl

brew install doctl  # macOS
snap install doctl  # Linux

# Authenticate
doctl auth init
```

Create an app spec file:

```yaml
# .do/app.yaml - Deploy from Dockerfile in the repository
name: myapp
region: nyc
services:
  - name: web
    github:
      repo: your-username/your-repo
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
        type: SECRET

ingress:
  rules:
    - match:
        path:
          prefix: /
      component:
        name: web

databases:
  - name: db
    engine: PG
    version: "16"
```

Deploy the app:

```bash
# Create the app from the spec
doctl apps create --spec .do/app.yaml

# Or if the app already exists, update it
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Using the Web Console

1. Go to the DigitalOcean dashboard
2. Click "Create" and select "Apps"
3. Connect your GitHub or GitLab repository
4. App Platform detects the Dockerfile automatically
5. Configure resources, environment variables, and domains
6. Click "Create Resources"

## Deploying from DigitalOcean Container Registry

For pre-built images stored in DOCR:

```yaml
# .do/app.yaml - Deploy from DOCR
name: myapp
region: nyc
services:
  - name: web
    image:
      registry_type: DOCR
      registry: my-registry
      repository: myapp
      tag: latest
      deploy_on_push:
        enabled: true
    http_port: 8080
    instance_count: 2
    instance_size_slug: apps-s-1vcpu-1gb
    health_check:
      http_path: /health
      initial_delay_seconds: 10
      period_seconds: 30

ingress:
  rules:
    - match:
        path:
          prefix: /
      component:
        name: web
```

Push a new image tag to DOCR and trigger a deployment:

```bash
# Build and push a new version
docker build -t registry.digitalocean.com/my-registry/myapp:v2.0.0 .
docker push registry.digitalocean.com/my-registry/myapp:v2.0.0

# After updating .do/app.yaml to use the new tag, update and redeploy the app
doctl apps update YOUR_APP_ID --spec .do/app.yaml --update-sources
```

## Deploying from Docker Hub

For public Docker Hub images or private ones with credentials:

```yaml
# .do/app.yaml - Deploy from Docker Hub
name: myapp
region: nyc
services:
  - name: web
    image:
      registry_type: DOCKER_HUB
      registry: yourusername
      repository: myapp
      tag: latest
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs

ingress:
  rules:
    - match:
        path:
          prefix: /
      component:
        name: web
```

For private Docker Hub images, add `registry_credentials` in the image spec or add credentials in the App Platform settings.

## Multi-Service Applications

App Platform shines with multi-service applications. Define your entire stack in one app spec:

```yaml
# .do/app.yaml - Full stack application
name: my-fullstack-app
region: nyc

services:
  # Frontend - Next.js application
  - name: frontend
    github:
      repo: your-username/frontend
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    http_port: 3000
    instance_count: 2
    instance_size_slug: apps-s-1vcpu-1gb
    envs:
      - key: API_URL
        value: ${api.PUBLIC_URL}

  # Backend API
  - name: api
    github:
      repo: your-username/backend
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    http_port: 8080
    instance_count: 2
    instance_size_slug: apps-s-1vcpu-1gb
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
        type: SECRET
      - key: CACHE_URL
        value: ${cache.DATABASE_URL}
        type: SECRET

ingress:
  rules:
    - match:
        path:
          prefix: /api
      component:
        name: api
    - match:
        path:
          prefix: /
      component:
        name: frontend

# Background worker (no HTTP route)
workers:
  - name: queue-worker
    github:
      repo: your-username/backend
      branch: main
    dockerfile_path: Dockerfile.worker
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-1gb
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
        type: SECRET
      - key: CACHE_URL
        value: ${cache.DATABASE_URL}
        type: SECRET

# Scheduled job
jobs:
  - name: daily-cleanup
    github:
      repo: your-username/backend
      branch: main
    dockerfile_path: Dockerfile.cleanup
    instance_size_slug: basic-xxs
    kind: SCHEDULED
    schedule:
      cron: "0 2 * * *"
      time_zone: UTC
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
        type: SECRET

databases:
  - name: db
    engine: PG
    version: "16"

  - name: cache
    engine: VALKEY
    version: "8"
    production: true
    cluster_name: cache-cluster
```

## Environment Variables and Secrets

Manage configuration through environment variables:

```bash
# Set an environment variable
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Validate an app spec before applying it
doctl apps spec validate .do/app.yaml
```

In the app spec, use `type: SECRET` for sensitive values:

```yaml
envs:
  - key: PUBLIC_CONFIG
    value: "some-value"
  - key: API_SECRET
    value: "encrypted-at-rest"
    type: SECRET
```

## Health Checks

Configure health checks so App Platform knows when your container is ready:

```yaml
services:
  - name: web
    # ... other config ...
    health_check:
      http_path: /health
      initial_delay_seconds: 15
      period_seconds: 30
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3
```

Make sure your application has a health endpoint:

```javascript
// Express health endpoint example
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

## Custom Domains and SSL

App Platform provides free SSL certificates for custom domains:

```yaml
# Add custom domains in the app spec
services:
  - name: web
    # ... other config ...
ingress:
  rules:
    - match:
        path:
          prefix: /
      component:
        name: web
domains:
  - domain: myapp.example.com
    type: PRIMARY
  - domain: www.myapp.example.com
    type: ALIAS
```

After deploying, add a CNAME record pointing your domain to the App Platform URL.

## Scaling

Scale vertically by changing instance sizes or horizontally by adding instances:

```bash
# Update instance count
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

Available instance sizes range from `basic-xxs` (512 MiB RAM, shared CPU) to `professional-xl` (16 GiB RAM, 4 dedicated CPUs).

CPU-based auto-scaling requires a dedicated CPU instance size:

```yaml
services:
  - name: web
    instance_size_slug: apps-d-1vcpu-0.5gb
    instance_count: 2
    autoscaling:
      min_instance_count: 2
      max_instance_count: 10
      metrics:
        cpu:
          percent: 75
```

## Viewing Logs and Monitoring

```bash
# View runtime logs
doctl apps logs YOUR_APP_ID --type run

# View build logs
doctl apps logs YOUR_APP_ID --type build

# Follow logs in real time
doctl apps logs YOUR_APP_ID --type run --follow

# List recent deployments
doctl apps list-deployments YOUR_APP_ID
```

## Rollbacks

If a deployment goes wrong, roll back to a previous version:

```bash
# List deployments to find the one to roll back to
doctl apps list-deployments YOUR_APP_ID

# Roll back to a specific deployment
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  -d '{ "deployment_id": "YOUR_DEPLOYMENT_ID" }' \
  "https://api.digitalocean.com/v2/apps/YOUR_APP_ID/rollback"
```

From the web console, you can click "Rollback" on one of the ten most recent successful deployments to restore it.

## Cost Optimization Tips

App Platform charges based on the number and size of instances. To optimize costs:

- Use `basic-xxs` for development and staging environments
- Scale to zero with jobs instead of always-running workers when processing is periodic
- Use managed databases instead of running database containers (they include backups and failover)
- Combine services into a single container if they are tightly coupled

DigitalOcean App Platform removes the ops burden of running Docker containers in production. You get automatic builds from your repository, zero-downtime deployments, managed SSL, and straightforward scaling. For teams that want container-based deployments without managing Kubernetes, App Platform provides the right level of abstraction.
