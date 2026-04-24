# How to Configure GitHub OAuth with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitHub, OAuth, SSO, Authentication, Developer Tool

Description: Configure GitHub OAuth authentication in Portainer to allow developers to sign in with their GitHub accounts.

## Introduction

GitHub OAuth is a natural choice for development teams already using GitHub for source control. It allows developers to log in to Portainer with their GitHub credentials, eliminating another password to manage. This guide covers GitHub OAuth setup for both GitHub.com and GitHub Enterprise.

## Prerequisites

- GitHub account (and organization admin access if you want the OAuth app owned by an org)
- Portainer running on HTTPS
- Ability to register OAuth applications in GitHub

## Step 1: Create a GitHub OAuth App

1. Go to [github.com](https://github.com) → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in:

```text
Application name:     Portainer
Homepage URL:         https://portainer.example.com
Authorization callback URL: https://portainer.example.com/
```

4. Click **Register application**
5. Note the **Client ID**
6. Click **Generate a new client secret** and copy it

For GitHub Organizations:
1. Go to your organization → **Settings** → **Developer settings** → **OAuth Apps**
2. Register the app there to associate it with the org

## Step 2: GitHub OAuth Endpoints

GitHub OAuth Apps use OAuth 2.0 rather than OIDC. The endpoints are:

```text
Authorization URL: https://github.com/login/oauth/authorize
Access Token URL:  https://github.com/login/oauth/access_token
Resource URL:      https://api.github.com/user
```

## Step 3: Configure Portainer for GitHub OAuth

In Settings → Authentication → OAuth → GitHub, enter the **Client ID** and **Client secret**. Portainer fills in the standard GitHub.com endpoints. If you click **Override default configuration**, use the following GitHub.com values:

```text
Client ID:         your-github-client-id
Client Secret:     your-github-client-secret
Authorization URL: https://github.com/login/oauth/authorize
Access Token URL:  https://github.com/login/oauth/access_token
Resource URL:      https://api.github.com/user
Redirect URL:      https://portainer.example.com/
User Identifier:   login
Scopes:            read:user
```

**Note**: `login` is the GitHub username. You can also use `email`, but with `https://api.github.com/user` that only works if the user has a public email address.

## Step 4: Configure via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "your-github-client-id",
      "ClientSecret": "your-github-client-secret",
      "AuthorizationURI": "https://github.com/login/oauth/authorize",
      "AccessTokenURI": "https://github.com/login/oauth/access_token",
      "ResourceURI": "https://api.github.com/user",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "login",
      "Scopes": "read:user",
      "OAuthAutoCreateUsers": true,
      "SSO": true
    }
  }'
```

## Restricting Access to GitHub Organization Members

GitHub OAuth Apps do not support an `allowed_organizations` or `allow_organizations` authorization parameter for limiting sign-in to a specific organization.

GitHub's OAuth app access restrictions can still protect organization resources, but they do not by themselves restrict Portainer sign-ins to organization members:

1. Go to your organization → **Settings** → **OAuth app policy**
2. Enable OAuth app access restrictions if needed
3. Review and approve only the Portainer OAuth app

## GitHub Enterprise Configuration

For GitHub Enterprise Server:

```text
Authorization URL: https://github.yourcompany.com/login/oauth/authorize
Access Token URL:  https://github.yourcompany.com/login/oauth/access_token
Resource URL:      https://github.yourcompany.com/api/v3/user
```

Register the OAuth app in your GitHub Enterprise Server instance under your personal account or an organization you administer.

## Verifying Access

```bash
# Test the GitHub OAuth token manually

GITHUB_TOKEN="your-github-oauth-token"
curl \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  https://api.github.com/user \
  | python3 -m json.tool

# Should return your GitHub profile including "login" field
```

## Troubleshooting

**"bad_verification_code"**: The authorization code was already used or expired. GitHub codes expire in 10 minutes.

**Blank callback page**: Redirect URI mismatch. The callback URL must exactly match what's in GitHub OAuth settings.

**User sees "Origin invalid" or a 403 after login behind a reverse proxy**: Portainer `--trusted-origins` is not configured. Add `--trusted-origins=https://portainer.example.com`.

## Conclusion

GitHub OAuth is straightforward to set up and ideal for development teams. The user identifier `login` maps Portainer users to GitHub usernames, making it easy to identify who's who in Portainer. If you need to protect GitHub organization resources, GitHub's OAuth app policy can control the app's org access, but it does not by itself restrict Portainer sign-ins to organization members.
