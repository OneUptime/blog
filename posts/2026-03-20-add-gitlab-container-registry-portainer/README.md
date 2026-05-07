# How to Add GitLab Container Registry to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitLab, Container Registry, CI/CD, DevOps

Description: Learn how to connect GitLab's built-in container registry to Portainer for pulling CI-built images.

## Overview

GitLab includes a built-in container registry that integrates with GitLab CI/CD pipelines. On GitLab.com, images are pushed under `registry.gitlab.com/<namespace>/<project>[/<optional-path>]`. In Portainer, you can connect to this registry either with Portainer's GitLab registry option and a GitLab personal access token, or with a Custom registry entry and a GitLab deploy token.

## Creating a GitLab Deploy Token

Deploy tokens are the preferred way to grant Portainer read access when you add GitLab as a Custom registry:

1. In GitLab, go to your project's **Settings > Repository**.
2. Expand **Deploy tokens**.
3. Create a new token with:
   - **Name**: `portainer-pull`
   - **Scopes**: Check `read_registry`
4. Copy the **username** and **token** - you won't see the token again.

## Creating a Personal Access Token (Alternative)

```bash
# In GitLab UI: Avatar > Edit profile > Access > Personal access tokens

# Create a token with scopes: read_api, read_registry
# Token acts as the PAT/password value, your GitLab username as username
```

## Adding GitLab Registry to Portainer

1. Go to **Registries** and click **Add registry**.
2. If you are using a GitLab personal access token, select **GitLab** and enter:
   - **Username**: Your GitLab username
   - **Personal Access Token**: A token with `read_api` and `read_registry`
3. If you are using a deploy token instead, select **Custom registry** and enter:
   - **Registry URL**: `registry.gitlab.com`
   - **Authentication**: Enabled
   - **Username**: Your deploy token username (e.g., `gitlab+deploy-token-123`)
   - **Password**: Your deploy token value
4. Click **Add registry**.

## For Self-Hosted GitLab

If you run GitLab on your own server, use the exact registry hostname configured for your instance:

```text
registry.yourcompany.com
```

The setup is similar - use **GitLab** with **Override default configuration** for a self-hosted GitLab instance, or use **Custom registry** with your self-hosted registry hostname and credentials.

## Using GitLab Registry Images in a Stack

```yaml
version: "3.8"

services:
  app:
    # Portainer uses the stored GitLab registry credentials
    image: registry.gitlab.com/mygroup/myproject/app:latest
    deploy:
      replicas: 2
```

## Testing GitLab Registry Access

```bash
# Test login to GitLab registry via CLI
echo "<your-deploy-token>" | docker login registry.gitlab.com \
  -u gitlab+deploy-token-123 \
  --password-stdin

# Pull an image to verify
docker pull registry.gitlab.com/mygroup/myproject/app:latest
```

## CI/CD Integration

In your `.gitlab-ci.yml`, push images that Portainer can then pull:

```yaml
# .gitlab-ci.yml snippet for building and pushing to GitLab registry
build:
  stage: build
  image: docker:24
  services:
    - docker:dind
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Conclusion

GitLab's built-in registry makes it straightforward to integrate with Portainer. If you're using Portainer's **Custom registry** option, prefer deploy tokens for pull-only service access; if you're using Portainer's **GitLab** registry option, use a personal access token with the required scopes.
