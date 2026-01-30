# How to Implement Preview Environments Details

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Platform Engineering, CI/CD, Developer Experience, DevOps

Description: A practical guide to building preview environments that spin up isolated instances of your application for every pull request, enabling faster code reviews and safer deployments.

---

Preview environments give every pull request its own running instance of your application. Reviewers see live changes instead of reading diffs. Bugs get caught before merging. Here is how to build them from scratch.

## What Are Preview Environments?

Preview environments (also called ephemeral environments, review apps, or deploy previews) are temporary, isolated deployments created automatically for each pull request or branch.

```mermaid
flowchart LR
    Dev[Developer] -->|Push| PR[Pull Request]
    PR -->|Trigger| CI[CI Pipeline]
    CI -->|Build| Image[Container Image]
    CI -->|Deploy| Preview[Preview Environment]
    Preview -->|URL| Reviewer[Code Reviewer]

    subgraph Lifecycle
        Preview -->|PR Merged| Cleanup[Auto Cleanup]
        Preview -->|PR Closed| Cleanup
    end
```

Key benefits:

1. **Visual review** - See actual UI changes, not just code diffs
2. **Integration testing** - Test against real services and databases
3. **Stakeholder feedback** - Product managers and designers can review early
4. **Parallel development** - Multiple features tested simultaneously

## Architecture Overview

A complete preview environment system needs these components:

```mermaid
flowchart TB
    subgraph Trigger
        GitHub[GitHub Webhook]
        GitLab[GitLab Webhook]
    end

    subgraph Orchestration
        Controller[Preview Controller]
        Queue[Job Queue]
    end

    subgraph Infrastructure
        K8s[Kubernetes Cluster]
        DNS[Dynamic DNS]
        TLS[TLS Certificates]
        DB[Database Provisioner]
    end

    subgraph Cleanup
        TTL[TTL Manager]
        GC[Garbage Collector]
    end

    GitHub --> Controller
    GitLab --> Controller
    Controller --> Queue
    Queue --> K8s
    Queue --> DNS
    Queue --> TLS
    Queue --> DB
    TTL --> GC
    GC --> K8s
```

## Implementation Options

| Approach | Complexity | Cost | Best For |
|----------|------------|------|----------|
| Kubernetes Namespaces | Medium | Low | Teams already on K8s |
| Docker Compose per PR | Low | Medium | Small teams, simple apps |
| Serverless (Vercel/Netlify) | Very Low | Variable | Frontend-only projects |
| Dedicated VMs | High | High | Legacy applications |
| Custom Platform | Very High | Variable | Large organizations |

## Option 1: Kubernetes Namespaces

The most flexible approach uses Kubernetes namespaces to isolate each preview.

### Namespace Template

This template creates an isolated namespace for each preview environment with resource limits and network policies to prevent interference between previews.

```yaml
# preview-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: preview-${PR_NUMBER}
  labels:
    app.kubernetes.io/managed-by: preview-controller
    preview/pr-number: "${PR_NUMBER}"
    preview/branch: "${BRANCH_NAME}"
  annotations:
    preview/created-at: "${TIMESTAMP}"
    preview/ttl: "72h"
---
# Resource quota prevents runaway resource usage
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-quota
  namespace: preview-${PR_NUMBER}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    persistentvolumeclaims: "5"
```

### Application Deployment

Deploy your application stack into the preview namespace with environment-specific configuration.

```yaml
# preview-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: preview-${PR_NUMBER}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ${REGISTRY}/api:pr-${PR_NUMBER}
          ports:
            - containerPort: 3000
          env:
            # Database connection for this preview
            - name: DATABASE_URL
              value: "postgres://preview:preview@postgres/pr_${PR_NUMBER}"
            # Base URL for frontend links
            - name: BASE_URL
              value: "https://pr-${PR_NUMBER}.preview.example.com"
            # Identify the preview environment
            - name: PREVIEW_PR
              value: "${PR_NUMBER}"
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: preview-${PR_NUMBER}
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 3000
```

### Ingress with Wildcard DNS

Configure ingress to route traffic to the correct preview based on subdomain.

```yaml
# preview-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview-ingress
  namespace: preview-${PR_NUMBER}
  annotations:
    # Automatically provision TLS certificate
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Enable websocket support
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - pr-${PR_NUMBER}.preview.example.com
      secretName: preview-${PR_NUMBER}-tls
  rules:
    - host: pr-${PR_NUMBER}.preview.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
```

### GitHub Actions Workflow

This workflow handles the complete lifecycle: build, deploy, update PR with URL, and cleanup on merge.

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

env:
  REGISTRY: ghcr.io/${{ github.repository }}
  PR_NUMBER: ${{ github.event.pull_request.number }}

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      pull-requests: write
    steps:
      # Checkout repository code
      - uses: actions/checkout@v4

      # Set up Docker buildx for efficient builds
      - uses: docker/setup-buildx-action@v3

      # Authenticate to container registry
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Build and push container image tagged with PR number
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/api:pr-${{ env.PR_NUMBER }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Deploy to Kubernetes cluster
      - name: Deploy Preview
        run: |
          # Substitute environment variables in templates
          envsubst < k8s/preview/namespace.yaml | kubectl apply -f -
          envsubst < k8s/preview/deployment.yaml | kubectl apply -f -
          envsubst < k8s/preview/ingress.yaml | kubectl apply -f -

          # Wait for deployment to be ready
          kubectl rollout status deployment/api \
            -n preview-${{ env.PR_NUMBER }} \
            --timeout=300s

      # Post the preview URL as a comment on the PR
      - name: Comment Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const url = `https://pr-${process.env.PR_NUMBER}.preview.example.com`;
            const body = `## Preview Environment Ready

            Your preview is live at: ${url}

            This environment will be automatically cleaned up when the PR is merged or closed.`;

            // Find existing comment to update instead of creating duplicates
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(c =>
              c.user.login === 'github-actions[bot]' &&
              c.body.includes('Preview Environment')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body
              });
            }

  # Cleanup job runs when PR is closed or merged
  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete Preview Environment
        run: |
          # Delete the entire namespace, which removes all resources
          kubectl delete namespace preview-${{ env.PR_NUMBER }} \
            --ignore-not-found=true

          echo "Preview environment for PR #${{ env.PR_NUMBER }} deleted"
```

## Option 2: Docker Compose with Dynamic Ports

For simpler setups, run Docker Compose on a single server with dynamic port allocation.

### Preview Manager Script

This script manages preview environments on a single Docker host, handling port allocation and nginx configuration.

```bash
#!/bin/bash
# preview-manager.sh

set -euo pipefail

ACTION=$1
PR_NUMBER=$2
REPO_URL=$3

PREVIEW_DIR="/opt/previews/pr-${PR_NUMBER}"
COMPOSE_PROJECT="preview-${PR_NUMBER}"

deploy_preview() {
    echo "Deploying preview for PR #${PR_NUMBER}"

    # Clone or update repository
    if [ -d "$PREVIEW_DIR" ]; then
        cd "$PREVIEW_DIR"
        git fetch origin
        git checkout "pull/${PR_NUMBER}/head"
        git pull
    else
        mkdir -p "$PREVIEW_DIR"
        git clone "$REPO_URL" "$PREVIEW_DIR"
        cd "$PREVIEW_DIR"
        git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"
        git checkout "pr-${PR_NUMBER}"
    fi

    # Generate unique port based on PR number
    # Offset by 10000 to avoid conflicts with system ports
    BASE_PORT=$((10000 + PR_NUMBER))

    # Create environment file with preview-specific settings
    cat > .env.preview <<EOF
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT}
APP_PORT=${BASE_PORT}
DATABASE_NAME=preview_${PR_NUMBER}
PREVIEW_URL=https://pr-${PR_NUMBER}.preview.example.com
EOF

    # Start the preview environment
    docker compose \
        --env-file .env.preview \
        -f docker-compose.yml \
        -f docker-compose.preview.yml \
        up -d --build

    # Update nginx configuration for routing
    update_nginx_config

    echo "Preview deployed at https://pr-${PR_NUMBER}.preview.example.com"
}

destroy_preview() {
    echo "Destroying preview for PR #${PR_NUMBER}"

    if [ -d "$PREVIEW_DIR" ]; then
        cd "$PREVIEW_DIR"

        # Stop and remove containers
        docker compose \
            -p "$COMPOSE_PROJECT" \
            down -v --remove-orphans

        # Remove preview directory
        rm -rf "$PREVIEW_DIR"
    fi

    # Remove nginx configuration
    rm -f "/etc/nginx/sites-enabled/preview-${PR_NUMBER}.conf"
    nginx -s reload

    echo "Preview for PR #${PR_NUMBER} destroyed"
}

update_nginx_config() {
    BASE_PORT=$((10000 + PR_NUMBER))

    # Generate nginx configuration for this preview
    cat > "/etc/nginx/sites-enabled/preview-${PR_NUMBER}.conf" <<EOF
server {
    listen 443 ssl http2;
    server_name pr-${PR_NUMBER}.preview.example.com;

    ssl_certificate /etc/letsencrypt/live/preview.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preview.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${BASE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Test and reload nginx
    nginx -t && nginx -s reload
}

case $ACTION in
    deploy)
        deploy_preview
        ;;
    destroy)
        destroy_preview
        ;;
    *)
        echo "Usage: $0 {deploy|destroy} PR_NUMBER REPO_URL"
        exit 1
        ;;
esac
```

### Docker Compose Preview Override

This override file configures containers specifically for preview environments with reduced resources and preview-specific networking.

```yaml
# docker-compose.preview.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT}:3000"
    environment:
      - NODE_ENV=preview
      - DATABASE_URL=postgres://app:app@db/${DATABASE_NAME}
      - PREVIEW_URL=${PREVIEW_URL}
    depends_on:
      db:
        condition: service_healthy
    # Reduced resources for preview
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=${DATABASE_NAME}
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=app
    volumes:
      - preview_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d ${DATABASE_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Reduced resources for preview
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

volumes:
  preview_db:
```

## Database Strategies

Preview environments need isolated databases. Here are three approaches:

### Strategy 1: Separate Database per Preview

Each preview gets its own database. Simple but resource intensive.

```yaml
# Kubernetes Job to create preview database
apiVersion: batch/v1
kind: Job
metadata:
  name: create-db
  namespace: preview-${PR_NUMBER}
spec:
  template:
    spec:
      containers:
        - name: create-db
          image: postgres:16
          command:
            - /bin/sh
            - -c
            - |
              # Connect to admin database and create preview database
              PGPASSWORD=$ADMIN_PASSWORD psql \
                -h $DB_HOST \
                -U $ADMIN_USER \
                -d postgres \
                -c "CREATE DATABASE pr_${PR_NUMBER};"

              # Run migrations
              PGPASSWORD=$ADMIN_PASSWORD psql \
                -h $DB_HOST \
                -U $ADMIN_USER \
                -d pr_${PR_NUMBER} \
                -f /migrations/schema.sql
          envFrom:
            - secretRef:
                name: db-admin-credentials
      restartPolicy: Never
```

### Strategy 2: Schema per Preview

Use PostgreSQL schemas for lighter isolation. All previews share one database but have separate schemas.

```sql
-- Create schema for preview
CREATE SCHEMA IF NOT EXISTS pr_123;

-- Set search path for the application user
ALTER ROLE preview_user SET search_path TO pr_123, public;

-- Clone schema structure from template
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'template_schema'
    LOOP
        EXECUTE format(
            'CREATE TABLE pr_123.%I (LIKE template_schema.%I INCLUDING ALL)',
            tbl.tablename, tbl.tablename
        );
    END LOOP;
END $$;
```

### Strategy 3: Database Snapshots

Clone production or staging data for realistic testing.

```bash
#!/bin/bash
# create-db-snapshot.sh

PR_NUMBER=$1
SOURCE_DB="staging"
TARGET_DB="pr_${PR_NUMBER}"

# Create snapshot using pg_dump and pg_restore
pg_dump \
    -h $DB_HOST \
    -U $DB_USER \
    -d $SOURCE_DB \
    --format=custom \
    --no-owner \
    | pg_restore \
    -h $DB_HOST \
    -U $DB_USER \
    -d $TARGET_DB \
    --no-owner \
    --if-exists \
    --clean

echo "Database snapshot created for PR #${PR_NUMBER}"
```

## DNS and TLS Configuration

### Wildcard DNS Setup

Configure your DNS provider with a wildcard record pointing to your preview infrastructure.

```
# DNS Records
*.preview.example.com    A       203.0.113.10
*.preview.example.com    AAAA    2001:db8::10
```

### Cert-Manager for Automatic TLS

Cert-manager automatically provisions certificates for each preview subdomain.

```yaml
# cert-manager ClusterIssuer for wildcard certificates
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      # Use DNS-01 challenge for wildcard certs
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
        selector:
          dnsZones:
            - "example.com"
---
# Wildcard certificate for all previews
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: preview-wildcard
  namespace: cert-manager
spec:
  secretName: preview-wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.preview.example.com"
```

## Cleanup and Garbage Collection

Preview environments must be cleaned up to avoid resource exhaustion.

### TTL-Based Cleanup Controller

This controller runs periodically to delete preview environments that have exceeded their TTL.

```python
#!/usr/bin/env python3
# preview_gc.py

import subprocess
import json
from datetime import datetime, timedelta
from kubernetes import client, config

# Load Kubernetes configuration
config.load_incluster_config()
v1 = client.CoreV1Api()

# Configuration
DEFAULT_TTL_HOURS = 72
MAX_TTL_HOURS = 168  # 7 days maximum

def get_preview_namespaces():
    """Find all namespaces managed by preview controller."""
    namespaces = v1.list_namespace(
        label_selector="app.kubernetes.io/managed-by=preview-controller"
    )
    return namespaces.items

def should_delete(namespace):
    """Determine if a preview namespace should be deleted."""
    annotations = namespace.metadata.annotations or {}
    labels = namespace.metadata.labels or {}

    # Parse creation time
    created_at = annotations.get("preview/created-at")
    if not created_at:
        created_at = namespace.metadata.creation_timestamp.isoformat()

    creation_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    # Parse TTL
    ttl_str = annotations.get("preview/ttl", f"{DEFAULT_TTL_HOURS}h")
    ttl_hours = int(ttl_str.rstrip("h"))
    ttl_hours = min(ttl_hours, MAX_TTL_HOURS)

    # Check if TTL exceeded
    expiry_time = creation_time + timedelta(hours=ttl_hours)
    if datetime.now(expiry_time.tzinfo) > expiry_time:
        return True, "TTL exceeded"

    # Check if PR is closed
    pr_number = labels.get("preview/pr-number")
    if pr_number and is_pr_closed(pr_number):
        return True, "PR closed"

    return False, None

def is_pr_closed(pr_number):
    """Check GitHub API to see if PR is closed."""
    try:
        result = subprocess.run(
            ["gh", "pr", "view", pr_number, "--json", "state"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get("state") in ["CLOSED", "MERGED"]
    except Exception:
        pass
    return False

def delete_namespace(namespace):
    """Delete a namespace and all its resources."""
    name = namespace.metadata.name
    print(f"Deleting namespace: {name}")

    try:
        v1.delete_namespace(
            name=name,
            body=client.V1DeleteOptions(
                propagation_policy="Background"
            )
        )
        print(f"Namespace {name} deleted successfully")
    except client.ApiException as e:
        print(f"Failed to delete namespace {name}: {e}")

def main():
    """Main garbage collection loop."""
    print("Starting preview garbage collection")

    namespaces = get_preview_namespaces()
    print(f"Found {len(namespaces)} preview namespaces")

    deleted_count = 0
    for ns in namespaces:
        should_remove, reason = should_delete(ns)
        if should_remove:
            print(f"Marking {ns.metadata.name} for deletion: {reason}")
            delete_namespace(ns)
            deleted_count += 1

    print(f"Garbage collection complete. Deleted {deleted_count} namespaces")

if __name__ == "__main__":
    main()
```

### CronJob for Scheduled Cleanup

Run the garbage collector on a regular schedule.

```yaml
# preview-gc-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: preview-gc
  namespace: preview-system
spec:
  schedule: "0 */6 * * *"  # Run every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: preview-gc
          containers:
            - name: gc
              image: preview-gc:latest
              command: ["python", "/app/preview_gc.py"]
              env:
                - name: GITHUB_TOKEN
                  valueFrom:
                    secretRef:
                      name: github-token
                      key: token
          restartPolicy: OnFailure
---
# Service account with namespace deletion permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: preview-gc
  namespace: preview-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: preview-gc
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: preview-gc
subjects:
  - kind: ServiceAccount
    name: preview-gc
    namespace: preview-system
roleRef:
  kind: ClusterRole
  name: preview-gc
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring Preview Environments

Track preview environment health and usage with these metrics.

### Prometheus Metrics

```yaml
# ServiceMonitor for preview metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: preview-environments
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: preview-controller
  namespaceSelector:
    matchNames:
      - preview-system
  endpoints:
    - port: metrics
      interval: 30s
```

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `preview_environments_active` | Number of running previews | > 50 |
| `preview_deploy_duration_seconds` | Time to deploy a preview | > 600 |
| `preview_cleanup_failures_total` | Failed cleanup attempts | > 0 |
| `preview_resource_usage_percent` | Cluster resources used by previews | > 40% |

## Security Considerations

Preview environments need careful security controls.

### Network Policies

Restrict preview environments from accessing production systems.

```yaml
# Deny egress to production namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-production-access
  namespace: preview-${PR_NUMBER}
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Allow external internet
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8      # Block internal network
              - 172.16.0.0/12
              - 192.168.0.0/16
```

### Authentication for Previews

Protect preview URLs from public access using basic auth or OAuth proxy.

```yaml
# Add basic auth to preview ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: preview-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Preview Environment"
```

## Putting It All Together

Here is the complete flow for a production-ready preview environment system:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant CI as CI Pipeline
    participant K8s as Kubernetes
    participant DNS as DNS/TLS
    participant Rev as Reviewer
    participant GC as Garbage Collector

    Dev->>GH: Open Pull Request
    GH->>CI: Webhook trigger
    CI->>CI: Build container image
    CI->>K8s: Create namespace
    CI->>K8s: Deploy application
    CI->>DNS: Configure subdomain
    DNS->>DNS: Provision TLS cert
    CI->>GH: Post preview URL comment
    GH->>Rev: Notification
    Rev->>K8s: Access preview
    Rev->>GH: Approve PR
    Dev->>GH: Merge PR
    GH->>CI: Webhook (PR closed)
    CI->>K8s: Delete namespace
    Note over GC: Periodic cleanup
    GC->>K8s: Delete stale previews
```

---

Preview environments transform code review from theoretical to practical. Instead of imagining what changes look like, reviewers interact with them. The initial setup takes effort, but the payoff in caught bugs and faster feedback loops makes it worthwhile. Start simple with Docker Compose, then graduate to Kubernetes as your needs grow.
