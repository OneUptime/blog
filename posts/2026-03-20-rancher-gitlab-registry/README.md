# How to Configure GitLab Container Registry with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GitLab, Container Registry, CI/CD

Description: Integrate GitLab Container Registry with Rancher clusters to pull images built in GitLab CI/CD pipelines directly to your Kubernetes workloads.

## Introduction

GitLab Container Registry is a built-in feature of GitLab that allows you to store Docker images alongside your code. When using GitLab for CI/CD, integrating its registry with Rancher enables seamless deployment of images built in GitLab pipelines. This guide covers setting up authentication using deploy tokens, personal access tokens, and CI/CD variables.

## Prerequisites

- GitLab instance (SaaS or self-hosted) with Container Registry enabled
- Rancher managing at least one cluster
- kubectl access to your cluster
- GitLab project with Container Registry enabled
- GitLab Runner configured for Docker-in-Docker if you use the sample GitLab CI job below

## Step 1: Enable GitLab Container Registry

For self-hosted GitLab, ensure the registry is enabled in `gitlab.rb`:

```ruby
# /etc/gitlab/gitlab.rb - Enable Container Registry

registry_external_url 'https://registry.gitlab.example.com'
gitlab_rails['registry_enabled'] = true
registry['enable'] = true

# Configure storage backend (S3 example)
registry['storage'] = {
  's3' => {
    'accesskey' => 'your-access-key',
    'secretkey' => 'your-secret-key',
    'bucket' => 'gitlab-registry-bucket',
    'region' => 'us-east-1'
  }
}
```

```bash
# Reconfigure GitLab after changes
sudo gitlab-ctl reconfigure
sudo gitlab-ctl restart registry
```

## Step 2: Create a GitLab Deploy Token

Deploy tokens are preferred for long-lived registry authentication:

1. Navigate to your GitLab project.
2. Go to **Settings** > **Repository** > **Deploy tokens**.
3. Click **Create deploy token**.
4. Set:
   - **Name**: `rancher-registry-pull`
   - **Expiration**: Set an appropriate date
   - **Scopes**: Check `read_registry`
5. Click **Create deploy token** and save the username and token.

## Step 3: Create Kubernetes Secret for GitLab Registry

```bash
# Using deploy token (recommended)
kubectl create secret docker-registry gitlab-registry-credentials \
  --docker-server=registry.gitlab.example.com \
  --docker-username=<deploy-token-username> \
  --docker-password=<deploy-token-value> \
  --namespace=production

# Or using a personal access token with read_registry scope (for development)
kubectl create secret docker-registry gitlab-registry-personal \
  --docker-server=registry.gitlab.com \
  --docker-username=myusername \
  --docker-password=<personal-access-token-with-read_registry-scope> \
  --namespace=development
```

## Step 4: Configure GitLab CI/CD to Build and Push Images

```yaml
# .gitlab-ci.yml - Build and push to GitLab registry
stages:
  - build
  - deploy

variables:
  # Use GitLab's built-in registry URL variable
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    # Log in to GitLab registry using CI variables
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE
    # Also tag as latest
    - docker tag $DOCKER_IMAGE $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    # Update the deployment image in Rancher cluster
    - kubectl set image deployment/my-app my-app=$DOCKER_IMAGE --namespace=production
    - kubectl rollout status deployment/my-app --namespace=production
```

## Step 5: Deploy Application Using GitLab Registry Image

```yaml
# app-deployment.yaml - Deployment using GitLab registry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Use GitLab registry credentials
      imagePullSecrets:
        - name: gitlab-registry-credentials
      containers:
        - name: my-app
          # GitLab registry image format: <registry-host>/<namespace>/<project>:<tag>
          image: registry.gitlab.example.com/mygroup/my-app:latest
          ports:
            - containerPort: 8080
```

## Step 6: Automate Secret Creation in GitLab CI/CD

Store the deploy token username and token as masked CI/CD variables, for example `GITLAB_REGISTRY_USER` and `GITLAB_REGISTRY_PASSWORD`, then automate Kubernetes secret creation as part of your pipeline:

```yaml
# .gitlab-ci.yml - Automate registry secret creation
setup-k8s-secret:
  stage: .pre
  image: bitnami/kubectl:latest
  script:
    # Create/update registry credentials in Kubernetes
    - |
      kubectl create secret docker-registry gitlab-registry-credentials \
        --docker-server=$CI_REGISTRY \
        --docker-username=$GITLAB_REGISTRY_USER \
        --docker-password=$GITLAB_REGISTRY_PASSWORD \
        --namespace=production \
        --dry-run=client -o yaml | kubectl apply -f -
  only:
    - main
```

## Step 7: Configure GitLab Group-Level Deploy Token

For organizations with multiple projects sharing the same cluster:

1. Go to your GitLab Group > **Settings** > **Repository** > **Deploy tokens**.
2. Create a group-level deploy token with `read_registry` scope.
3. Use this single token across all projects:

```bash
# Create group-level registry secret
kubectl create secret docker-registry gitlab-group-registry \
  --docker-server=registry.gitlab.example.com \
  --docker-username=<group-deploy-token-username> \
  --docker-password=<group-token-value> \
  --namespace=production
```

## Step 8: Use GitLab Registry with Rancher Fleet

```yaml
# fleet.yaml - Fleet bundle using GitLab registry image
defaultNamespace: production
helm:
  chart: ./chart
  values:
    image:
      repository: registry.gitlab.example.com/mygroup/my-app
      tag: latest
    imagePullSecrets:
      - name: gitlab-registry-credentials
```

## Step 9: Configure Registry Cleanup in GitLab

```bash
# GitLab registry cleanup policy via API
curl --fail-with-body --request PUT \
  --header 'PRIVATE-TOKEN: <your-token>' \
  --header 'Content-Type: application/json;charset=UTF-8' \
  --data-binary '{
    "container_expiration_policy_attributes": {
      "cadence": "1month",
      "enabled": true,
      "keep_n": 5,
      "name_regex_delete": ".*",
      "name_regex_keep": ".*release.*",
      "older_than": "90d"
    }
  }' \
  https://gitlab.example.com/api/v4/projects/<project-id>
```

## Troubleshooting

```bash
# Verify registry access
echo "<deploy-token>" | docker login registry.gitlab.example.com \
  -u <deploy-token-username> \
  --password-stdin

# Check if secret is properly created
kubectl get secret gitlab-registry-credentials -n production -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .

# Debug pull failures
kubectl describe pod <pod-name> -n production | grep -A 10 Events
```

## Conclusion

GitLab Container Registry provides a tightly integrated solution for teams using GitLab for source control and CI/CD. By using deploy tokens with minimal permissions, you can securely pull GitLab-built images in Rancher-managed clusters. The combination of GitLab CI/CD pipelines and Rancher's deployment capabilities creates a powerful and streamlined container delivery workflow.
