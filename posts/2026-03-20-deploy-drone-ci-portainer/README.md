# How to Deploy Drone CI via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Drone CI, CI/CD, Docker, Gitea

Description: Learn how to deploy Drone CI via Portainer as a lightweight, container-native CI/CD platform that integrates with Gitea, GitHub, or GitLab.

## What Is Drone CI?

Drone CI is a container-native CI/CD platform where every pipeline step runs in its own Docker container. It's lightweight, fast, and integrates with multiple Git providers.

## Drone CI with Gitea Integration

**Stacks → Add Stack → drone-ci**

```yaml
version: "3.8"

services:
  drone-server:
    image: drone/drone:2
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      # Gitea integration
      - DRONE_GITEA_SERVER=https://gitea.yourdomain.com
      - DRONE_GITEA_CLIENT_ID=${GITEA_OAUTH_CLIENT_ID}
      - DRONE_GITEA_CLIENT_SECRET=${GITEA_OAUTH_CLIENT_SECRET}
      # Drone server settings
      - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
      - DRONE_SERVER_HOST=drone.yourdomain.com
      - DRONE_SERVER_PROTO=https
      # Admin user
      - DRONE_USER_CREATE=username:admin,admin:true
    volumes:
      - drone_data:/data

  drone-runner:
    image: drone/drone-runner-docker:1
    restart: unless-stopped
    depends_on:
      - drone-server
    environment:
      - DRONE_RPC_PROTO=http
      - DRONE_RPC_HOST=drone-server
      - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
      - DRONE_RUNNER_NAME=docker-runner
      - DRONE_RUNNER_CAPACITY=2    # Concurrent builds
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  drone_data:
```

## Environment Variables

```text
GITEA_OAUTH_CLIENT_ID = (from Gitea OAuth app)
GITEA_OAUTH_CLIENT_SECRET = (from Gitea OAuth app)
DRONE_RPC_SECRET = (generate: openssl rand -hex 16)
```

## Setting Up Gitea OAuth App

In Gitea: **Settings → Applications → OAuth2 Applications**

- Application Name: Drone CI
- Redirect URI: `https://drone.yourdomain.com/login`

Copy the Client ID and Client Secret.

## Example .drone.yml Pipeline

```yaml
# .drone.yml in your repository root

kind: pipeline
type: docker
name: default

steps:
  - name: test
    image: python:3.12-slim
    commands:
      - pip install -r requirements.txt
      - pytest tests/

  - name: build
    image: plugins/docker
    settings:
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      repo: registry.example.com/myapp
      tags:
        - ${DRONE_COMMIT_SHA:0:8}
        - latest
    when:
      branch:
        - main

  - name: deploy
    image: curlimages/curl
    commands:
      - curl -s -X POST "$PORTAINER_WEBHOOK?tag=${DRONE_COMMIT_SHA:0:8}"
    environment:
      PORTAINER_WEBHOOK:
        from_secret: portainer_webhook
    when:
      branch:
        - main
```

## Adding Drone Secrets

In Drone UI or via CLI:

```bash
# Install Drone CLI
go install github.com/drone/drone-cli/drone@latest

# Export credentials
export DRONE_SERVER=https://drone.yourdomain.com
export DRONE_TOKEN=your-personal-token

# Add secret to a repository
drone secret add \
  --repository username/myapp \
  --name portainer_webhook \
  --data "https://portainer.yourdomain.com/api/webhooks/YOUR_TOKEN"
```

## Comparing Drone vs Jenkins vs GitLab CI

| Feature | Drone CI | Jenkins | GitLab CI |
|---------|----------|---------|-----------|
| RAM required | ~256MB | ~1GB | 4GB+ (GitLab) |
| Config format | YAML | Groovy/YAML | YAML |
| Container-native | Yes | Via plugins | Yes |
| UI | Minimal | Rich | Rich |

## Conclusion

Drone CI via Portainer is the most resource-efficient CI/CD platform in this comparison. Its pipeline-as-code approach uses simple YAML with every step running in a fresh Docker container. Combined with Portainer webhook deployments, it creates a clean, lightweight CI/CD pipeline suitable for small teams and resource-constrained servers.
