# How to Use Private Git Repositories with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Docker, Security, Authentication

Description: Learn how to configure Portainer to authenticate with private Git repositories using personal access tokens and SSH keys for secure stack deployments.

## Introduction

Most production infrastructure repositories are private, requiring authentication to access. Portainer documents Git repository authentication for stack deployments over HTTPS using Git credentials such as a username/password or personal access token. This guide covers the token-based approach for GitHub, GitLab, Gitea, and other Git hosts.

## Prerequisites

- Portainer CE or BE
- A private Git repository containing Docker Compose files
- Repository credentials (personal access token or project access token)

## HTTPS Authentication with Personal Access Tokens

This is the most common approach and works with all major Git hosts.

### GitHub - Create a Personal Access Token

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. GitHub recommends **Fine-grained tokens**. Click **Fine-grained tokens** → **Generate new token**.
3. Set a name: `Portainer Deploy Token`
4. Set an expiry date.
5. Choose the repository owner and select only the repository Portainer needs.
6. Grant the token repository read access.
7. Click **Generate token** and copy the token immediately.

If you use a classic token instead, select the `repo` scope for private repositories.

### GitLab - Create a Project Access Token

1. Go to your GitLab project → **Settings** → **Access tokens**.
2. Click **Add new token**.
3. Name: `Portainer`
4. Role: `Reporter` (minimum needed for read access)
5. Scopes: `read_repository`
6. Click **Create project access token**.

Note: On GitLab.com, project access tokens require Premium or Ultimate. On Free plans, use a personal access token instead.

### Configure in Portainer (UI)

1. When creating/editing a Git-connected stack:
2. Enable **Authentication**.
3. If your Portainer version shows an **Authorization type** option, select **Basic**.
4. Set:
   - **Username**: your Git username
   - **Personal Access Token**: your personal access token

For GitHub specifically:

```text
Username: your-github-username
Personal Access Token: your-github-token
```

For GitLab:

```text
Username: your-gitlab-username
Personal Access Token: glpat-YourProjectAccessToken
```

### Configure via the Portainer API

```bash
PORTAINER_URL="https://portainer.example.com"
PORTAINER_API_KEY="your-portainer-api-key"
ENDPOINT_ID=1

# Create stack from private Git repository
curl -s -X POST \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/create/standalone/repository?endpointId=${ENDPOINT_ID}" \
  -d '{
    "Name": "my-private-app",
    "RepositoryURL": "https://github.com/your-org/private-infra",
    "RepositoryReferenceName": "refs/heads/main",
    "ComposeFile": "docker-compose.yml",
    "RepositoryAuthentication": true,
    "RepositoryUsername": "your-username",
    "RepositoryPassword": "your-personal-access-token",
    "Env": []
  }' | jq .
```

## Using Portainer's Stored Git Credentials

Portainer BE allows you to store Git credentials centrally and reuse them across multiple stacks:

1. Go to **Settings** → **Shared credentials** (BE only).
2. Click **Add credentials** and choose **Git**.
3. Name: `GitHub Deploy Token`
4. Enter your credentials.
5. When creating stacks, select the stored credential instead of entering it manually.

## Self-Hosted Git (Gitea/GitLab CE) with Self-Signed Certs

For self-hosted Git servers with self-signed TLS:

1. When configuring the repository, enable **Skip TLS verification** if needed.
2. Use this sparingly, since it disables certificate validation for the repository connection.

## Security Best Practices

1. Use dedicated read-only access tokens where possible - write access is not needed
2. Create **dedicated** credentials for Portainer, not your personal account credentials
3. Rotate credentials on a schedule (every 6-12 months)
4. Use tokens with **minimal repository read permissions**
5. Name tokens clearly: `portainer-production-deploy-2026-03`
6. Revoke credentials immediately if Portainer is compromised

## Conclusion

Connecting Portainer to private Git repositories is straightforward using HTTPS authentication with a username and personal access token. Store credentials using Portainer's shared credential manager (BE) or your CI/CD secrets manager, and rotate them regularly to maintain security hygiene.
