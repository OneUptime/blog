# How to Add GitLab Container Registry to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitLab, Registry, CI/CD, DevOps

Description: Learn how to configure GitLab Container Registry in Portainer to deploy images built by GitLab CI/CD pipelines.

## Introduction

GitLab's built-in Container Registry provides a convenient way to store images built by GitLab CI/CD pipelines. Portainer can be configured to pull from GitLab Container Registry either by using its built-in GitLab registry integration with a personal access token, or by adding GitLab Container Registry as a custom registry with a deploy token. This enables a seamless GitOps workflow where GitLab builds images and Portainer deploys them.

## Prerequisites

- Portainer CE or BE installed
- GitLab instance (gitlab.com or self-hosted) with Container Registry enabled
- A project with container images
- GitLab account with appropriate permissions
- GitLab Runner with Docker build support if you plan to use the CI example below

## GitLab Registry URL Formats

| GitLab Type | Registry URL |
|-------------|-------------|
| gitlab.com | `registry.gitlab.com` |
| Self-hosted | `registry.yourdomain.com` or `gitlab.yourdomain.com:5050` |

Image paths follow the pattern:

```text
registry.gitlab.com/{namespace}/{project-name}:{tag}
registry.gitlab.com/{namespace}/{project-name}/{optional-path}:{tag}
# Examples:

registry.gitlab.com/myorg/myapp:latest
registry.gitlab.com/myorg/myapp/backend:latest
registry.gitlab.com/myorg/myapp/frontend:v2.0
```

## Step 1: Create a Deploy Token (Recommended for Custom Registry Entries)

Deploy tokens are project or group-level tokens specifically designed for deployment use cases. Use them when you plan to add GitLab Container Registry to Portainer as a **Custom registry**:

1. In GitLab, navigate to your project or group
2. Go to **Settings → Repository → Deploy tokens**
3. Click **Add a deploy token**
4. Fill in:
   ```text
   Name:       portainer-pull
   Expires at: (set 1 year from now)
   Username:   portainer (custom username)
   Scopes:     [x] read_registry
   ```
5. Click **Create deploy token**
6. Copy the **username** and **token** (shown once)

## Step 2: Create a Personal Access Token (For Portainer's GitLab Registry Type)

If you want to use Portainer's built-in GitLab registry type:

1. In the upper-right corner, select your avatar
2. Click **Edit profile**
3. In the left sidebar, go to **Access → Personal access tokens**
4. From **Generate token**, select **Legacy token**
5. Configure:
   ```text
   Token name:     portainer-registry
   Expiration:     (set future date)
   Scopes:         [x] read_api
                   [x] read_registry
   ```
6. Click **Create personal access token**
7. Copy the generated token

## Step 3: Add GitLab Registry in Portainer

1. Go to **Registries** in Portainer
2. Click **+ Add registry**
3. Choose the registry type that matches the credentials you created

### Use the GitLab Registry Type with a PAT

```text
Registry type:         GitLab
Username:              your-gitlab-username
Personal Access Token: glpat-xxxxx...
```

For self-hosted GitLab, enable **Override default configuration** and set your registry URL.

### Use a Custom Registry with a Deploy Token

```text
Registry type:  Custom registry
URL:           registry.gitlab.com
Username:      portainer          (deploy token username)
Password:      gldt-xxxxx...     (deploy token value)
```

For self-hosted GitLab, set `URL` to `registry.gitlab.yourdomain.com` or `gitlab.yourdomain.com:5050`.

4. Click **Add registry**

## Step 4: Configure GitLab CI to Build and Push Images

Set up your `.gitlab-ci.yml` to build and push images automatically. This example assumes your GitLab Runner is configured to run Docker-in-Docker builds:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build-image:
  stage: build
  image: docker:24.0.5-cli
  services:
    - docker:24.0.5-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

trigger-portainer-deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    # Trigger a Portainer webhook to redeploy the service or stack
    - |
      curl -X POST "$PORTAINER_WEBHOOK_URL" \
        --fail \
        --max-time 30
  only:
    - main
```

## Step 5: Use GitLab Registry Images in Portainer Stacks

```yaml
services:
  backend:
    image: registry.gitlab.com/myorg/myapp/backend:latest
    # Portainer uses stored GitLab registry credentials

  frontend:
    image: registry.gitlab.com/myorg/myapp/frontend:v2.0
    ports:
      - "80:80"
```

## Step 6: Enable the Portainer Webhook in GitLab

For automatic deployments when CI builds a new image, use a Portainer webhook. Stack webhooks are available in Portainer Business Edition on non-Edge environments:

1. Get the Portainer service webhook URL, or a stack webhook URL if you're using Portainer BE
2. In GitLab, set it as a CI/CD variable:
   - **Project → Settings → CI/CD → Variables**
   - Add `PORTAINER_WEBHOOK_URL` as a masked variable

3. Add the deploy step to your GitLab CI pipeline (see Step 4 above)

## Step 7: Use Group Deploy Tokens for Multiple Projects

For organizations with multiple GitLab projects deploying through the same Portainer custom registry entry:

1. Create a **Group Deploy Token** at the group level
2. Grant `read_registry` scope
3. Use the same token in a Portainer **Custom registry** entry for all projects under that group

```text
Group URL:   registry.gitlab.com/myorg/{any-project-in-group}/{image}:tag
```

## Troubleshooting

### Authentication Failed

```text
Error: unauthorized: HTTP Basic: Access denied
```

- Verify the deploy token or PAT is valid and not expired
- Confirm the token has `read_registry` scope
- For PATs, ensure the user has at least Reporter access to the project

### Registry Not Enabled

If the registry URL returns 404, the Container Registry may be disabled for your project:

1. Go to **Project Settings → General → Visibility, project features, permissions**
2. Enable **Container Registry**

### Self-Signed Certificate

For self-hosted GitLab with self-signed TLS:

```bash
# Add certificate to Docker hosts
sudo cp gitlab.crt /etc/docker/certs.d/registry.gitlab.yourdomain.com/ca.crt
sudo systemctl restart docker
```

If your registry uses a non-default port, include it in the `/etc/docker/certs.d/<host>:<port>/` directory name.

## Conclusion

Integrating GitLab Container Registry with Portainer closes the loop on your CI/CD pipeline - GitLab builds and stores images, and Portainer deploys them. Using a deploy token with minimal scope (`read_registry`) for a custom registry entry, or a personal access token with `read_api` and `read_registry` for Portainer's GitLab registry type, follows the documented authentication model. Combined with GitLab CI webhooks triggering Portainer deployments, you have a complete automated deployment workflow.
