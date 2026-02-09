# How to Build a Drone CI Pipeline That Deploys to Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone CI, Kubernetes, CI/CD, Multi-Cluster, DevOps

Description: Build a complete Drone CI pipeline that deploys applications to multiple Kubernetes clusters across different environments with proper credential management and rollout strategies.

---

Managing deployments across multiple Kubernetes clusters is a common requirement for organizations with multi-region setups, staging environments, or hybrid cloud architectures. Drone CI provides a flexible pipeline system that can orchestrate complex multi-cluster deployments. This guide demonstrates how to build a robust Drone pipeline for deploying to multiple Kubernetes clusters.

## Understanding Drone CI Architecture

Drone CI uses a container-native approach where each pipeline step runs in its own container. This isolation makes it perfect for managing multiple Kubernetes contexts and credentials. Drone supports multiple runners, secrets management, and conditional execution, all essential for multi-cluster deployments.

## Setting Up Drone Server

Install Drone server with Docker:

```bash
# Create docker-compose.yml for Drone
cat > docker-compose.yml <<EOF
version: '3'
services:
  drone-server:
    image: drone/drone:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./drone:/data
    environment:
      - DRONE_GITHUB_CLIENT_ID=your-client-id
      - DRONE_GITHUB_CLIENT_SECRET=your-client-secret
      - DRONE_RPC_SECRET=your-rpc-secret
      - DRONE_SERVER_HOST=drone.example.com
      - DRONE_SERVER_PROTO=https
      - DRONE_USER_CREATE=username:admin,admin:true

  drone-runner:
    image: drone/drone-runner-docker:1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone-server
      - DRONE_RPC_SECRET=your-rpc-secret
      - DRONE_RUNNER_CAPACITY=2
      - DRONE_RUNNER_NAME=docker-runner
EOF

docker-compose up -d
```

## Configuring Kubernetes Cluster Credentials

Store kubeconfig files for each cluster as Drone secrets:

```bash
# Add production cluster credentials
drone secret add \
  --name kubeconfig_production \
  --data @~/.kube/config-production \
  your-org/your-repo

# Add staging cluster credentials
drone secret add \
  --name kubeconfig_staging \
  --data @~/.kube/config-staging \
  your-org/your-repo

# Add development cluster credentials
drone secret add \
  --name kubeconfig_dev \
  --data @~/.kube/config-dev \
  your-org/your-repo
```

For better security, create service account tokens per cluster:

```bash
# Create deployment service account in each cluster
kubectl create serviceaccount drone-deployer -n default
kubectl create clusterrolebinding drone-deployer \
  --clusterrole=cluster-admin \
  --serviceaccount=default:drone-deployer

# Get the token
TOKEN=$(kubectl create token drone-deployer --duration=87600h)
drone secret add \
  --name k8s_token_production \
  --data "$TOKEN" \
  your-org/your-repo
```

## Creating the Multi-Cluster Pipeline

Create `.drone.yml` with deployment steps for multiple clusters:

```yaml
kind: pipeline
type: docker
name: multi-cluster-deploy

steps:
  # Build and test
  - name: build
    image: node:18
    commands:
      - npm install
      - npm test
      - npm run build

  # Build Docker image
  - name: docker
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/myapp
      tags:
        - ${DRONE_COMMIT_SHA}
        - ${DRONE_BRANCH}
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password

  # Deploy to dev cluster
  - name: deploy-dev
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_dev
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl config use-context dev-cluster
      - kubectl set image deployment/myapp myapp=registry.example.com/myapp:${DRONE_COMMIT_SHA} -n development
      - kubectl rollout status deployment/myapp -n development --timeout=5m
    when:
      branch:
        - develop
      event:
        - push

  # Deploy to staging cluster
  - name: deploy-staging
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_staging
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl config use-context staging-cluster
      - kubectl set image deployment/myapp myapp=registry.example.com/myapp:${DRONE_COMMIT_SHA} -n staging
      - kubectl rollout status deployment/myapp -n staging --timeout=5m
    when:
      branch:
        - main
      event:
        - push

  # Deploy to production clusters (parallel)
  - name: deploy-prod-us-east
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_prod_us_east
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl config use-context prod-us-east
      - kubectl set image deployment/myapp myapp=registry.example.com/myapp:${DRONE_COMMIT_SHA} -n production
      - kubectl rollout status deployment/myapp -n production --timeout=10m
    when:
      event:
        - promote
      target:
        - production

  - name: deploy-prod-eu-west
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_prod_eu_west
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl config use-context prod-eu-west
      - kubectl set image deployment/myapp myapp=registry.example.com/myapp:${DRONE_COMMIT_SHA} -n production
      - kubectl rollout status deployment/myapp -n production --timeout=10m
    when:
      event:
        - promote
      target:
        - production

trigger:
  branch:
    - main
    - develop
```

## Using Helm for Multi-Cluster Deployments

Create a reusable Helm deployment step:

```yaml
steps:
  - name: deploy-with-helm
    image: alpine/helm:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_${CLUSTER}
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - helm upgrade --install myapp ./charts/myapp \
          --namespace ${NAMESPACE} \
          --create-namespace \
          --set image.tag=${DRONE_COMMIT_SHA} \
          --set cluster.name=${CLUSTER} \
          --values ./values/${CLUSTER}.yaml \
          --wait \
          --timeout 10m
```

Create cluster-specific values files:

```yaml
# values/prod-us-east.yaml
replicaCount: 3
ingress:
  enabled: true
  host: app-us.example.com
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
```

## Implementing Sequential Rollouts

Deploy to clusters sequentially with health checks:

```yaml
steps:
  - name: deploy-canary
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_canary
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl apply -f k8s/canary/ -n production
      - kubectl rollout status deployment/myapp-canary -n production

  - name: validate-canary
    image: curlimages/curl:latest
    commands:
      - |
        for i in {1..10}; do
          curl -f https://canary.example.com/health || exit 1
          sleep 5
        done

  - name: deploy-primary
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_primary
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl apply -f k8s/production/ -n production
      - kubectl rollout status deployment/myapp -n production
    depends_on:
      - validate-canary
```

## Adding Deployment Notifications

Integrate Slack notifications for deployment status:

```yaml
steps:
  - name: notify-start
    image: plugins/slack
    settings:
      webhook:
        from_secret: slack_webhook
      channel: deployments
      template: >
        Deployment started for ${DRONE_REPO_NAME}
        Branch: ${DRONE_BRANCH}
        Commit: ${DRONE_COMMIT_SHA:0:8}
        Clusters: dev, staging, production

  - name: notify-success
    image: plugins/slack
    settings:
      webhook:
        from_secret: slack_webhook
      channel: deployments
      template: >
        Deployment successful for ${DRONE_REPO_NAME}
        Branch: ${DRONE_BRANCH}
        Commit: ${DRONE_COMMIT_SHA:0:8}
    when:
      status:
        - success

  - name: notify-failure
    image: plugins/slack
    settings:
      webhook:
        from_secret: slack_webhook
      channel: deployments
      template: >
        Deployment FAILED for ${DRONE_REPO_NAME}
        Branch: ${DRONE_BRANCH}
        Commit: ${DRONE_COMMIT_SHA:0:8}
    when:
      status:
        - failure
```

## Implementing Rollback Capability

Add rollback steps for failed deployments:

```yaml
steps:
  - name: deploy-prod
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_production
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl set image deployment/myapp myapp=registry.example.com/myapp:${DRONE_COMMIT_SHA} -n production
      - kubectl rollout status deployment/myapp -n production --timeout=10m

  - name: rollback-prod
    image: bitnami/kubectl:latest
    environment:
      KUBECONFIG: /tmp/kubeconfig
      KUBE_CONFIG:
        from_secret: kubeconfig_production
    commands:
      - echo "$KUBE_CONFIG" > /tmp/kubeconfig
      - kubectl rollout undo deployment/myapp -n production
      - kubectl rollout status deployment/myapp -n production
    when:
      status:
        - failure
    depends_on:
      - deploy-prod
```

## Managing Environment-Specific Configurations

Use Drone templates for DRY configuration:

```yaml
# Create a template for deployment
kind: template
name: k8s-deploy
data:
  steps:
    - name: deploy-{{cluster}}
      image: bitnami/kubectl:latest
      environment:
        KUBECONFIG: /tmp/kubeconfig
        KUBE_CONFIG:
          from_secret: kubeconfig_{{cluster}}
      commands:
        - echo "$KUBE_CONFIG" > /tmp/kubeconfig
        - kubectl apply -f k8s/{{environment}}/ -n {{namespace}}
        - kubectl rollout status deployment/myapp -n {{namespace}}

---
kind: pipeline
name: deploy-all

steps:
  - template: k8s-deploy
    vars:
      cluster: dev
      environment: development
      namespace: dev

  - template: k8s-deploy
    vars:
      cluster: staging
      environment: staging
      namespace: staging

  - template: k8s-deploy
    vars:
      cluster: production
      environment: production
      namespace: prod
```

## Monitoring Pipeline Execution

Check pipeline status through Drone CLI:

```bash
# Install Drone CLI
curl -L https://github.com/harness/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar zx
sudo install -t /usr/local/bin drone

# Configure CLI
export DRONE_SERVER=https://drone.example.com
export DRONE_TOKEN=your-token

# View pipeline builds
drone build ls your-org/your-repo

# Get logs for specific step
drone log view your-org/your-repo 123 deploy-prod

# Promote build to production
drone build promote your-org/your-repo 123 production
```

## Conclusion

Drone CI provides a powerful platform for orchestrating multi-cluster Kubernetes deployments. By leveraging Drone's secret management, conditional execution, and container-native approach, you can build reliable deployment pipelines that safely promote applications across development, staging, and multiple production clusters. This approach scales well and maintains security through proper credential isolation while providing flexibility for complex deployment scenarios.
