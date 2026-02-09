# How to Set Up Gitpod with Kubernetes Cluster Access for Cloud-Based Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gitpod, Kubernetes, Cloud Development, DevOps, Remote

Description: Configure Gitpod workspaces with direct Kubernetes cluster access to enable cloud-based development with full kubectl capabilities, service access, and deployment workflows.

---

Cloud development environments eliminate the need for powerful local machines and ensure consistent setups across teams. Gitpod provides browser-based workspaces, but integrating them with Kubernetes clusters requires careful configuration of credentials, network access, and tooling.

This guide shows you how to configure Gitpod workspaces that connect seamlessly to your Kubernetes clusters, enabling developers to deploy, debug, and test directly from their browser-based environment.

## Understanding Gitpod and Kubernetes Integration

Gitpod workspaces are themselves Kubernetes pods running in Gitpod's infrastructure. To access your own Kubernetes clusters from Gitpod, you need to:

- Configure kubectl with appropriate credentials
- Establish network connectivity to cluster API servers
- Handle authentication securely
- Install necessary development tools
- Automate workspace initialization

The result is a complete development environment accessible from any device with a browser.

## Creating a Basic Gitpod Configuration

Start with a `.gitpod.yml` file in your repository:

```yaml
# .gitpod.yml
image:
  file: .gitpod.Dockerfile

tasks:
  - name: Setup Kubernetes Access
    init: |
      # Install kubectl
      curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
      sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
      rm kubectl

      # Install additional tools
      curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
      kubectl krew install ctx ns

    command: |
      # Configure kubectl
      gp sync-await kubeconfig
      export KUBECONFIG=/workspace/.kube/config

      # Test connection
      kubectl cluster-info

      # Start application
      npm install
      npm run dev

  - name: Configure Cluster Access
    init: |
      # Wait for kubeconfig to be ready
      mkdir -p /workspace/.kube

    command: |
      # Signal that kubeconfig is ready
      gp sync-done kubeconfig

ports:
  - port: 3000
    onOpen: open-preview
    visibility: public
  - port: 8080
    onOpen: ignore
    visibility: private

vscode:
  extensions:
    - ms-kubernetes-tools.vscode-kubernetes-tools
    - redhat.vscode-yaml
```

Create a custom Dockerfile with pre-installed tools:

```dockerfile
# .gitpod.Dockerfile
FROM gitpod/workspace-full:latest

USER root

# Install Kubernetes tools
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install k9s
RUN curl -sS https://webinstall.dev/k9s | bash

# Install krew
RUN set -x; cd "$(mktemp -d)" && \
    OS="$(uname | tr '[:upper:]' '[:lower:]')" && \
    ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" && \
    KREW="krew-${OS}_${ARCH}" && \
    curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" && \
    tar zxvf "${KREW}.tar.gz" && \
    ./"${KREW}" install krew && \
    mv .krew /home/gitpod/.krew

ENV PATH="${PATH}:/home/gitpod/.krew/bin"

# Install kubectx and kubens
RUN /home/gitpod/.krew/bin/kubectl krew install ctx ns

USER gitpod
```

## Securely Managing Kubeconfig

Use Gitpod environment variables to store kubeconfig securely:

```bash
# Encode your kubeconfig
cat ~/.kube/config | base64 -w 0

# Add to Gitpod variables at https://gitpod.io/variables
# Variable: KUBECONFIG_BASE64
# Value: <base64 encoded kubeconfig>
# Scope: your-org/your-repo
```

Update `.gitpod.yml` to decode and use the kubeconfig:

```yaml
tasks:
  - name: Configure Kubernetes
    init: |
      # Create kubeconfig from environment variable
      mkdir -p /workspace/.kube
      echo $KUBECONFIG_BASE64 | base64 -d > /workspace/.kube/config
      chmod 600 /workspace/.kube/config

      # Set KUBECONFIG environment variable
      export KUBECONFIG=/workspace/.kube/config

      # Verify connection
      kubectl cluster-info

    command: |
      export KUBECONFIG=/workspace/.kube/config
      echo "Kubernetes cluster access configured"
      kubectl get nodes
```

## Implementing Dynamic Cluster Configuration

Fetch kubeconfig dynamically from a secure service:

```yaml
# .gitpod.yml
tasks:
  - name: Setup Cluster Access
    init: |
      # Fetch kubeconfig from internal service
      curl -H "Authorization: Bearer $GITPOD_TOKEN" \
           https://kubeconfig-service.company.com/api/config \
           -o /workspace/.kube/config

      chmod 600 /workspace/.kube/config
      export KUBECONFIG=/workspace/.kube/config

      # Configure context
      kubectl config use-context dev-cluster

    command: |
      export KUBECONFIG=/workspace/.kube/config
      kubectl get pods
```

Build the kubeconfig service:

```javascript
// kubeconfig-service.js
const express = require('express');
const jwt = require('jsonwebtoken');
const k8s = require('@kubernetes/client-node');

const app = express();

app.get('/api/config', authenticateToken, async (req, res) => {
  const { email, teams } = req.user;

  // Generate limited kubeconfig for developer
  const kubeconfig = generateKubeconfig(email, teams);

  res.send(kubeconfig);
});

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function generateKubeconfig(email, teams) {
  const devNamespace = `dev-${email.split('@')[0].replace('.', '-')}`;

  const config = {
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [{
      name: 'dev-cluster',
      cluster: {
        'certificate-authority-data': process.env.CLUSTER_CA,
        server: process.env.CLUSTER_SERVER
      }
    }],
    users: [{
      name: email,
      user: {
        token: generateServiceAccountToken(email, devNamespace)
      }
    }],
    contexts: [{
      name: 'dev-context',
      context: {
        cluster: 'dev-cluster',
        user: email,
        namespace: devNamespace
      }
    }],
    'current-context': 'dev-context'
  };

  return JSON.stringify(config, null, 2);
}

app.listen(3000);
```

## Building Multi-Cluster Configurations

Support multiple cluster contexts:

```yaml
# .gitpod.yml
tasks:
  - name: Multi-Cluster Setup
    init: |
      mkdir -p /workspace/.kube

      # Fetch configurations for all accessible clusters
      curl -H "Authorization: Bearer $GITPOD_TOKEN" \
           https://kubeconfig-service.company.com/api/config/all \
           -o /workspace/.kube/config

      export KUBECONFIG=/workspace/.kube/config

      # List available contexts
      kubectl config get-contexts

      # Set default context
      kubectl config use-context dev-cluster

    command: |
      export KUBECONFIG=/workspace/.kube/config

      echo "Available clusters:"
      kubectx

      echo ""
      echo "Quick commands:"
      echo "  kubectx dev-cluster    # Switch to dev"
      echo "  kubectx staging        # Switch to staging"
      echo "  kubectl get pods       # View pods in current context"
```

## Automating Development Workflows

Create startup scripts that prepare the environment:

```yaml
# .gitpod.yml
tasks:
  - name: Initialize Environment
    init: |
      # Setup kubectl
      export KUBECONFIG=/workspace/.kube/config

      # Create/update development namespace
      DEV_NS="dev-$(echo $GITPOD_GIT_USER_EMAIL | cut -d@ -f1 | tr '[:upper:]' '[:lower:]' | tr '.' '-')"
      kubectl create namespace $DEV_NS --dry-run=client -o yaml | kubectl apply -f -

      # Set as default namespace
      kubectl config set-context --current --namespace=$DEV_NS

      # Deploy dependencies
      kubectl apply -f k8s/dependencies/

      # Wait for dependencies to be ready
      kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

      echo "Environment initialized: $DEV_NS"

    command: |
      export KUBECONFIG=/workspace/.kube/config
      DEV_NS="dev-$(echo $GITPOD_GIT_USER_EMAIL | cut -d@ -f1 | tr '[:upper:]' '[:lower:]' | tr '.' '-')"

      # Show environment status
      kubectl get all

      # Start application with hot reload
      npm run dev
```

## Implementing Port Forwarding Automation

Automatically forward necessary ports:

```yaml
tasks:
  - name: Port Forwarding
    command: |
      export KUBECONFIG=/workspace/.kube/config

      # Forward database port
      kubectl port-forward svc/postgres 5432:5432 &

      # Forward Redis port
      kubectl port-forward svc/redis 6379:6379 &

      # Forward API gateway
      kubectl port-forward svc/api-gateway 8080:80 &

      echo "Port forwards established"

  - name: Application
    command: |
      # Wait for port forwards
      sleep 5

      # Start application
      npm run dev
```

## Creating Development Snapshots

Save workspace state for later:

```yaml
tasks:
  - name: Workspace Management
    command: |
      # Function to save workspace state
      save_workspace() {
        echo "Saving workspace state..."

        # Export current resources
        kubectl get all -o yaml > /workspace/.state/resources.yaml

        # Save environment variables
        env > /workspace/.state/env.txt

        echo "Workspace state saved to .state/"
      }

      # Function to restore workspace state
      restore_workspace() {
        if [ -f /workspace/.state/resources.yaml ]; then
          echo "Restoring workspace state..."
          kubectl apply -f /workspace/.state/resources.yaml
        fi
      }

      # Make functions available
      export -f save_workspace restore_workspace

      echo "Workspace management commands available:"
      echo "  save_workspace    # Save current state"
      echo "  restore_workspace # Restore saved state"
```

## Integrating with CI/CD Pipelines

Deploy from Gitpod to cluster:

```yaml
tasks:
  - name: Deployment Tools
    command: |
      # Function to deploy current branch
      deploy() {
        local environment=${1:-dev}

        echo "Deploying to $environment..."

        # Build and push image
        docker build -t myregistry/myapp:$GITPOD_GIT_USER_EMAIL-$GITPOD_WORKSPACE_ID .
        docker push myregistry/myapp:$GITPOD_GIT_USER_EMAIL-$GITPOD_WORKSPACE_ID

        # Update deployment
        kubectl set image deployment/myapp \
          myapp=myregistry/myapp:$GITPOD_GIT_USER_EMAIL-$GITPOD_WORKSPACE_ID \
          -n $environment

        # Wait for rollout
        kubectl rollout status deployment/myapp -n $environment

        echo "Deployment complete!"
      }

      export -f deploy

      echo "Deploy with: deploy [dev|staging]"
```

## Monitoring Resource Usage

Track cluster resources from Gitpod:

```bash
#!/bin/bash
# .gitpod/scripts/monitor-resources.sh

export KUBECONFIG=/workspace/.kube/config

echo "Resource Usage in Development Namespace"
echo "========================================"

# Get current namespace
NS=$(kubectl config view --minify -o jsonpath='{..namespace}')

# Show pod resource usage
kubectl top pods -n $NS

echo ""
echo "Resource Quota Status"
echo "===================="
kubectl describe resourcequota -n $NS
```

Add to `.gitpod.yml`:

```yaml
tasks:
  - name: Resource Monitor
    command: |
      # Run resource monitor every 60 seconds
      watch -n 60 .gitpod/scripts/monitor-resources.sh
```

## Best Practices for Team Usage

Document Gitpod workflows in your repository:

```markdown
# Development with Gitpod

## Quick Start

Click the button to open a workspace:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/yourorg/yourrepo)

## What Gets Configured

- Kubernetes cluster access (dev-cluster)
- Your personal development namespace
- All required CLI tools (kubectl, helm, k9s)
- Port forwards to cluster services
- Hot reload for local development

## Common Commands

\`\`\`bash
# View your pods
kubectl get pods

# Deploy changes
deploy dev

# Switch clusters
kubectx staging

# Save workspace state
save_workspace
\`\`\`

## Environment Variables

Set these in Gitpod settings:

- `KUBECONFIG_BASE64`: Base64-encoded kubeconfig
- `DOCKER_REGISTRY_TOKEN`: Container registry access
\`\`\`
```

Gitpod with Kubernetes integration delivers instant, consistent development environments accessible from anywhere. Developers can contribute without local setup, and teams gain reproducible environments that match production.
