# How to Configure DevSpace for Team-Based Kubernetes Development with Shared Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DevSpace, Kubernetes, Development, Team, Collaboration

Description: Configure DevSpace for team-based Kubernetes development enabling multiple developers to work independently while sharing common dependencies, services, and infrastructure resources.

---

Team-based Kubernetes development faces a fundamental challenge: developers need isolated environments to work independently, but deploying every dependency for each developer wastes resources. DevSpace solves this by enabling personal development spaces that share common infrastructure like databases, message queues, and external services.

This guide shows you how to configure DevSpace for team workflows where developers get isolated workspaces for their services while leveraging shared dependencies, reducing cluster resource usage and simplifying environment management.

## Understanding DevSpace Team Architecture

DevSpace creates isolated development spaces within a shared Kubernetes cluster. Each developer gets:

- Personal namespace for their services
- Isolated network space for testing
- Shared access to common dependencies
- Independent deployment configurations
- Synchronized file access for hot reload

This architecture balances isolation with resource efficiency.

## Installing and Configuring DevSpace

Install DevSpace CLI:

```bash
# macOS or Linux
curl -s -L "https://github.com/loft-sh/devspace/releases/latest" | sed -nE 's!.*"([^"]*devspace-linux-amd64)".*!https://github.com\1!p' | xargs -n 1 curl -L -o devspace
chmod +x devspace
sudo mv devspace /usr/local/bin
```

Initialize DevSpace in your project:

```bash
cd your-project
devspace init
```

## Configuring Shared Dependencies

Create a base configuration for shared services:

```yaml
# devspace-shared.yaml
version: v2beta1

name: shared-dependencies

deployments:
  postgres:
    helm:
      chart:
        name: postgresql
        repo: https://charts.bitnami.com/bitnami
      values:
        auth:
          database: devdb
          username: devuser
          password: devpass
        primary:
          persistence:
            size: 10Gi

  redis:
    helm:
      chart:
        name: redis
        repo: https://charts.bitnami.com/bitnami
      values:
        master:
          persistence:
            size: 5Gi

  rabbitmq:
    helm:
      chart:
        name: rabbitmq
        repo: https://charts.bitnami.com/bitnami
      values:
        auth:
          username: devuser
          password: devpass
```

Deploy shared dependencies once:

```bash
devspace deploy --profile shared -n shared-services
```

## Creating Developer-Specific Configurations

Build a personal development configuration:

```yaml
# devspace.yaml
version: v2beta1

name: api-service

vars:
  DEVELOPER_NAME: ${DEVSPACE_USERNAME}
  NAMESPACE: dev-${DEVELOPER_NAME}
  IMAGE: myregistry/api-service:dev-${DEVELOPER_NAME}

deployments:
  api:
    helm:
      chart:
        name: ./charts/api
      values:
        image: ${IMAGE}
        replicaCount: 1
        env:
          # Connect to shared services
          DATABASE_HOST: postgres-postgresql.shared-services.svc.cluster.local
          DATABASE_NAME: devdb
          DATABASE_USER: devuser
          DATABASE_PASSWORD: devpass
          REDIS_HOST: redis-master.shared-services.svc.cluster.local
          RABBITMQ_HOST: rabbitmq.shared-services.svc.cluster.local
          # Developer-specific variables
          LOG_LEVEL: debug
          DEVELOPER: ${DEVELOPER_NAME}

dev:
  api:
    labelSelector:
      app: api
      developer: ${DEVELOPER_NAME}

    # Sync source code for hot reload
    sync:
      - path: ./src:/app/src
        excludePaths:
          - node_modules/
          - .git/
        printLogs: true
        disableDownload: true

    # Port forwarding
    ports:
      - port: "3000"

    # Override command for development
    command: ["npm", "run", "dev"]

    # Auto reload on changes
    autoReload:
      paths:
        - ./src/**/*.js
        - ./package.json

profiles:
  - name: shared
    patches:
      - op: remove
        path: dev

  - name: isolated
    patches:
      - op: add
        path: deployments.postgres
        value:
          helm:
            chart:
              name: postgresql
              repo: https://charts.bitnami.com/bitnami
      - op: replace
        path: deployments.api.helm.values.env.DATABASE_HOST
        value: postgres-postgresql.${NAMESPACE}.svc.cluster.local
```

## Setting Up Team Namespaces

Automate namespace creation for team members:

```bash
#!/bin/bash
# setup-dev-namespace.sh

DEVELOPER=$1

if [ -z "$DEVELOPER" ]; then
    echo "Usage: $0 <developer-name>"
    exit 1
fi

NAMESPACE="dev-$DEVELOPER"

echo "Creating namespace for $DEVELOPER..."

# Create namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Label namespace
kubectl label namespace "$NAMESPACE" \
    developer="$DEVELOPER" \
    environment="development" \
    team="engineering"

# Create resource quota
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
EOF

# Create network policy allowing access to shared services
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-shared-services
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: shared-services
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
EOF

# Grant developer access
kubectl create rolebinding "$DEVELOPER-admin" \
    --clusterrole=admin \
    --user="$DEVELOPER@company.com" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "Namespace $NAMESPACE created and configured"
```

## Implementing Service Dependencies

Configure services that depend on each other:

```yaml
# devspace.yaml (frontend service)
version: v2beta1

name: frontend

vars:
  DEVELOPER_NAME: ${DEVSPACE_USERNAME}
  NAMESPACE: dev-${DEVELOPER_NAME}
  API_ENDPOINT: http://api.dev-${DEVELOPER_NAME}.svc.cluster.local:3000

deployments:
  frontend:
    helm:
      chart:
        name: ./charts/frontend
      values:
        image: myregistry/frontend:dev-${DEVELOPER_NAME}
        env:
          API_URL: ${API_ENDPOINT}
          ENABLE_DEBUGGING: "true"

dev:
  frontend:
    sync:
      - path: ./src:/app/src
    ports:
      - port: "8080"
    command: ["npm", "run", "serve"]

dependencies:
  # Ensure API service is deployed first
  - name: api
    git: https://github.com/company/api-service
    devSpace:
      profile: dev
```

## Building Cross-Developer Collaboration

Enable developers to share test environments:

```yaml
# devspace.yaml
pipelines:
  dev:
    run: |-
      create_deployments --all
      start_dev --all

  dev-team:
    run: |-
      # Deploy with team-accessible ingress
      set_var TEAM_MODE=true
      create_deployments --all
      create_ingress

commands:
  - name: share
    command: |-
      echo "Creating shareable link..."

      # Get ingress URL
      INGRESS=$(kubectl get ingress api-${DEVSPACE_USERNAME} -n dev-${DEVSPACE_USERNAME} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

      echo "Your environment is accessible at:"
      echo "  https://${DEVSPACE_USERNAME}.dev.company.com"

      # Update team status
      curl -X POST https://dev-status.company.com/api/share \
        -d "{\"developer\": \"${DEVSPACE_USERNAME}\", \"url\": \"https://${DEVSPACE_USERNAME}.dev.company.com\"}"
```

## Managing Database Migrations

Handle database schemas across developers:

```yaml
# devspace.yaml
hooks:
  - command: |-
      # Run migrations before starting dev mode
      kubectl exec -n shared-services deployment/postgres-postgresql -- \
        psql -U devuser -d devdb -c "
          CREATE SCHEMA IF NOT EXISTS dev_${DEVSPACE_USERNAME};
          GRANT ALL ON SCHEMA dev_${DEVSPACE_USERNAME} TO devuser;
        "

      # Run application migrations
      kubectl run migrate-${DEVSPACE_USERNAME} \
        --image=myregistry/api-service:dev-${DEVSPACE_USERNAME} \
        --restart=Never \
        --rm -i \
        --env="DATABASE_SCHEMA=dev_${DEVSPACE_USERNAME}" \
        --env="DATABASE_HOST=postgres-postgresql.shared-services.svc.cluster.local" \
        -- npm run migrate

    events: ["before:deploy"]
```

## Implementing Resource Cleanup

Automatically clean up idle development environments:

```bash
#!/bin/bash
# cleanup-idle-dev-spaces.sh

# Delete dev namespaces idle for more than 7 days
IDLE_THRESHOLD=7

kubectl get namespaces -l environment=development -o json | \
  jq -r ".items[] | select(.metadata.creationTimestamp | fromdateiso8601 < (now - ($IDLE_THRESHOLD * 86400))) | .metadata.name" | \
  while read namespace; do
    echo "Cleaning up idle namespace: $namespace"

    # Check if there's been recent activity
    RECENT_PODS=$(kubectl get pods -n "$namespace" \
      --field-selector=status.phase=Running \
      --no-headers 2>/dev/null | wc -l)

    if [ "$RECENT_PODS" -eq 0 ]; then
      echo "No running pods, deleting namespace..."
      kubectl delete namespace "$namespace" &
    else
      echo "Active pods found, keeping namespace"
    fi
  done

wait
echo "Cleanup complete"
```

Schedule with CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-dev-spaces
  namespace: devops
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - /scripts/cleanup-idle-dev-spaces.sh
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: cleanup-scripts
          restartPolicy: OnFailure
```

## Creating a Team Dashboard

Build a simple status page:

```javascript
// team-dashboard.js
const express = require('express');
const k8s = require('@kubernetes/client-node');

const app = express();
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

app.get('/api/dev-spaces', async (req, res) => {
  const namespaces = await k8sApi.listNamespace(
    undefined,
    undefined,
    undefined,
    undefined,
    'environment=development'
  );

  const devSpaces = await Promise.all(
    namespaces.body.items.map(async (ns) => {
      const pods = await k8sApi.listNamespacedPod(ns.metadata.name);

      const runningPods = pods.body.items.filter(
        p => p.status.phase === 'Running'
      ).length;

      return {
        name: ns.metadata.name,
        developer: ns.metadata.labels?.developer,
        created: ns.metadata.creationTimestamp,
        active: runningPods > 0,
        podCount: pods.body.items.length
      };
    })
  );

  res.json(devSpaces);
});

app.listen(3000);
```

## Best Practices for Team DevSpace Usage

Document workflows in your repository:

```markdown
# Development with DevSpace

## Quick Start

1. Set up your namespace:
   \`\`\`bash
   ./scripts/setup-dev-namespace.sh $USER
   \`\`\`

2. Start development:
   \`\`\`bash
   devspace dev
   \`\`\`

3. Access your service:
   \`\`\`bash
   devspace open
   \`\`\`

## Shared Services

All developers share these services in the \`shared-services\` namespace:

- PostgreSQL: postgres-postgresql.shared-services.svc.cluster.local:5432
- Redis: redis-master.shared-services.svc.cluster.local:6379
- RabbitMQ: rabbitmq.shared-services.svc.cluster.local:5672

## Commands

- \`devspace dev\` - Start development mode
- \`devspace deploy\` - Deploy without dev mode
- \`devspace purge\` - Delete all resources
- \`devspace cleanup images\` - Clean up old images
- \`devspace list namespaces\` - Show all dev namespaces

## Sharing Your Environment

Create a shareable link:
\`\`\`bash
devspace run share
\`\`\`
\`\`\`

DevSpace with shared dependencies provides team members with independent development environments while maximizing resource efficiency. Configure it once, and every developer gains instant access to a complete, isolated workspace.
