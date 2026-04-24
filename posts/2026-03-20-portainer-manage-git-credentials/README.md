# How to Manage Git Credentials in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Git, Business Edition, GitOps, Credential, Security

Description: Store and manage Git credentials in Portainer Business Edition for secure GitOps deployments from private repositories.

## Introduction

Portainer Business Edition allows you to store Git credentials and reuse them across multiple stacks and environments. Instead of entering credentials each time you deploy from a private repository, you save them once and reference them by name. This guide covers creating, using, and managing Git credentials in Portainer BE.

## Prerequisites

- Portainer Business Edition (CE does not support saved Git credentials)
- Access to a private Git repository (GitHub, GitLab, Bitbucket, Azure DevOps, etc.)
- Admin or appropriate user permissions

## Types of Git Authentication

Portainer supports:
1. **Basic authorization** - Username + personal access token (PAT) or password. GitHub, GitLab, and Bitbucket Cloud use this even when authenticating with a token.
2. **Token authorization** - Token-only authentication for providers that require it.

## Step 1: Generate a Personal Access Token

### GitHub PAT

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Set expiration and scopes:
   - Scope: `repo` for private repository access
4. Copy the token - it's shown once

### GitLab PAT

1. Go to **GitLab** → **Edit profile** → **Access** → **Personal access tokens**
2. Create a token with `read_repository` scope
3. Copy the token

## Step 2: Add Git Credentials in Portainer

1. Log in to Portainer Business Edition
2. For personal credentials, click your username and select **My account** → **Git credentials**. For shared credentials, go to **Settings** → **Shared credentials**
3. Click **Add git credential** for personal credentials, or **Add credentials** and choose **Git** for shared credentials
4. Fill in:

```text
Name:               my-github-credentials
Authorization type: Basic
Username:           your-github-username
Personal Access Token: ghp_your_token_here
```

5. Click **Save git credential** or **Add credentials**

## Step 3: Use Saved Credentials in a Stack

When creating or editing a stack from a Git repository:

1. Select **Git Repository** as the source
2. Enter the repository URL (e.g., `https://github.com/yourorg/your-private-repo`)
3. Toggle **Authentication**
4. Under **Git Credentials**, choose your saved credential set from the dropdown
5. Configure the repository reference and compose file path
6. Deploy

## Managing Credentials via the API

Per-user saved Git credentials use the `/api/users/{id}/gitcredentials` endpoints. Admin-level shared Git credentials are exposed separately under `/api/cloud/gitcredentials`.

```bash
# Get admin token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get current user ID
USER_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/users/me?noEndpointAuthorizations=true" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

# List saved Git credentials for the current user
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/users/${USER_ID}/gitcredentials" \
  | python3 -m json.tool

# Create saved Git credentials for the current user
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/users/${USER_ID}/gitcredentials" \
  -d '{
    "name": "github-ci-account",
    "username": "ci-bot-user",
    "password": "ghp_your_personal_access_token"
  }'

# Update credentials (e.g., rotate PAT)
CRED_ID=1
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/users/${USER_ID}/gitcredentials/${CRED_ID}" \
  -d '{
    "name": "github-ci-account",
    "username": "ci-bot-user",
    "password": "ghp_new_rotated_token"
  }'

# Delete credentials
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/users/${USER_ID}/gitcredentials/${CRED_ID}"
```

## Rotating Credentials

When a PAT expires or is rotated:

1. Generate a new PAT in your Git provider
2. Update the credential in Portainer via UI or API
3. All stacks using the saved credential automatically use the new token
4. Revoke the old PAT in your Git provider

This is the key advantage of saved credentials - updating in one place updates all deployments.

## Sharing Credentials vs. Per-User Credentials

| Type | Scope | Created By |
|------|-------|-----------|
| User credentials | Only visible to the creating user | Any user |
| Shared credentials | Available to admin-level users | Admin |

For team environments, admins can create shared credentials that admin-level users can select when deploying.

## Security Best Practices

- Use the minimum repository scopes or permissions required by your Git provider and Portainer
- Set expiration dates on PATs and rotate them regularly
- Use a dedicated service account in your Git provider (not a personal account)
- Never use credentials that have write access to production branches in automated deployments

## Conclusion

Portainer Business Edition's Git credential management simplifies GitOps workflows by centralizing authentication. Instead of managing credentials per-stack, you maintain them in one place and rotate them without touching individual stack configurations. This makes credential hygiene practical even when you have dozens of Git-backed stacks.
