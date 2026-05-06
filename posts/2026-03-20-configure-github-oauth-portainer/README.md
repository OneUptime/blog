# How to Configure GitHub OAuth with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitHub, OAuth, Authentication, SSO

Description: Configure GitHub OAuth to allow developers to log into Portainer using their GitHub accounts for a seamless developer experience.

---

GitHub OAuth is ideal for developer teams where everyone already has a GitHub account. It provides a frictionless login experience without requiring separate credentials.

## Step 1: Create a GitHub OAuth Application

1. In GitHub, go to **Settings**
2. Navigate to **Developer settings > OAuth Apps**
3. Click **New OAuth App**
4. Fill in:
   - **Application name**: Portainer
   - **Homepage URL**: `https://portainer.example.com`
   - **Authorization callback URL**: `https://portainer.example.com/`
5. Click **Register application**
6. Copy the **Client ID**
7. Click **Generate a new client secret** and copy the secret

## Step 2: Configure Portainer with GitHub OAuth

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
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
      "Scopes": "read:user user:email",
      "OAuthAutoCreateUsers": true
    }
  }' \
  --insecure
```

## GitHub OAuth Endpoint Reference

| Field | Value |
|-------|-------|
| Authorization URL | `https://github.com/login/oauth/authorize` |
| Access Token URL | `https://github.com/login/oauth/access_token` |
| Resource URL | `https://api.github.com/user` |
| User Identifier | `login` (GitHub username) |
| Scopes | `read:user user:email` |

## Using GitHub Enterprise

For GitHub Enterprise Server, replace the endpoints with your instance URL:

```bash
GITHUB_BASE="https://github.corp.example.com"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"your-client-id\",
      \"ClientSecret\": \"your-client-secret\",
      \"AuthorizationURI\": \"$GITHUB_BASE/login/oauth/authorize\",
      \"AccessTokenURI\": \"$GITHUB_BASE/login/oauth/access_token\",
      \"ResourceURI\": \"$GITHUB_BASE/api/v3/user\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"login\",
      \"Scopes\": \"read:user user:email\"
    }
  }" \
  --insecure
```

## Restrict Access to a GitHub Organization

GitHub OAuth scopes do not restrict Portainer sign-in to members of a specific organization by themselves. To limit access, request organization read access, disable automatic user provisioning, and manually create only users whose organization membership you have verified:

```bash
"Scopes": "read:user user:email read:org",
"OAuthAutoCreateUsers": false

# Then manually create only users whose GitHub organization
# membership you have verified
```

## Test GitHub OAuth

1. Open Portainer in a private browser window
2. Click **Login with OAuth**
3. Authorize the GitHub OAuth application
4. You'll be redirected back and logged in as your GitHub username

---

*Integrate developer tooling monitoring with [OneUptime](https://oneuptime.com) for full DevOps observability.*
