# How to Use Terraform Enterprise with Private VCS Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, VCS, Git, GitLab, GitHub Enterprise, Bitbucket

Description: Step-by-step guide to integrating Terraform Enterprise with private VCS servers including GitHub Enterprise, GitLab Self-Managed, Bitbucket Data Center, and Azure DevOps Server.

---

Most enterprises do not host their code on public GitHub or GitLab. They run private VCS servers - GitHub Enterprise Server, GitLab Self-Managed, Bitbucket Data Center, or Azure DevOps Server - behind their corporate firewall. Connecting Terraform Enterprise to these private VCS instances requires additional configuration because TFE needs network access to the VCS server and the VCS server needs to send webhooks back to TFE.

This guide covers setting up each major private VCS provider with TFE, including OAuth configuration, network requirements, and webhook setup.

## Network Requirements

Before configuring anything, make sure the network allows bidirectional communication:

```text
TFE Server  <-->  VCS Server

TFE needs to reach:
  - VCS API endpoint (typically port 443 or custom)
  - VCS Git clone endpoint (SSH port 22 or HTTPS 443)

VCS needs to reach:
  - TFE webhook endpoint (port 443)
  - URL: https://tfe.example.com/webhooks/vcs/<webhook-id>
```

```bash
# Test connectivity from TFE to VCS

curl -s -o /dev/null -w "%{http_code}" https://gitlab.internal.example.com/api/v4/version
# Should return 200

# Test connectivity from VCS to TFE (run on VCS server)
curl -s -o /dev/null -w "%{http_code}" https://tfe.example.com/api/v1/health/readiness
# Should return 200
```

## GitHub Enterprise Server

### Step 1: Begin Adding the VCS Provider in TFE

Start adding a GitHub Enterprise VCS provider in TFE and copy the generated `callback-url`. Use that value when registering the OAuth application in GitHub Enterprise.

### Step 2: Create an OAuth Application

On your GitHub Enterprise Server:

1. Go to your organization settings (or site admin for global)
2. Navigate to **Developer settings** > **OAuth Apps** > **New OAuth App**

```text
Application name:       Terraform Enterprise
Homepage URL:           https://tfe.example.com
Authorization callback URL: [callback-url from TFE]
```

Note the **Client ID** and generate a **Client Secret**.

### Step 3: Configure TFE

```bash
# Add the GitHub Enterprise VCS provider via API
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/oauth-clients" \
  --data '{
    "data": {
      "type": "oauth-clients",
      "attributes": {
        "service-provider": "github_enterprise",
        "name": "GitHub Enterprise",
        "http-url": "https://github.internal.example.com",
        "api-url": "https://github.internal.example.com/api/v3",
        "key": "your-oauth-client-id",
        "secret": "your-oauth-client-secret"
      }
    }
  }'
```

### Step 4: Authorize the Connection

After creating the OAuth client, you need to complete the OAuth flow:

1. Go to TFE > Organization > VCS Providers
2. Click on the GitHub Enterprise provider
3. Click "Connect" to initiate the OAuth authorization
4. You will be redirected to GitHub Enterprise to authorize the application
5. After authorization, you will be redirected back to TFE

## GitLab Self-Managed

### Step 1: Create an OAuth Application in GitLab

Start adding a GitLab Enterprise Edition or GitLab Community Edition VCS provider in TFE and copy the generated redirect URI.

1. Log in to GitLab as the service user TFE should use
2. Go to **User Settings** > **Applications** > **Add new application**

```text
Name:         Terraform Enterprise
Redirect URI: [redirect URI from TFE]
Confidential: Yes
Scopes:       api
```

### Step 2: Configure TFE

```bash
# Add GitLab Self-Managed as a VCS provider
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/oauth-clients" \
  --data '{
    "data": {
      "type": "oauth-clients",
      "attributes": {
        "service-provider": "gitlab_enterprise_edition",
        "name": "GitLab Internal",
        "http-url": "https://gitlab.internal.example.com",
        "api-url": "https://gitlab.internal.example.com/api/v4",
        "key": "your-gitlab-application-id",
        "secret": "your-gitlab-application-secret"
      }
    }
  }'
```

Use `gitlab_community_edition` instead of `gitlab_enterprise_edition` for GitLab Community Edition.

## Bitbucket Data Center

### Step 1: Create an Application Link in Bitbucket

1. Go to Bitbucket Data Center **Administration** > **Application Links**
2. Enter the TFE URL: `https://tfe.example.com`
3. Configure the incoming link:

```text
Consumer Key:     terraform-enterprise
Consumer Name:    Terraform Enterprise
Public Key:       [paste your RSA public key]
```

Generate the RSA key pair:

```bash
# Generate an RSA key pair for Bitbucket Data Center OAuth
openssl genrsa -out tfe-bitbucket.pem 2048
openssl rsa -in tfe-bitbucket.pem -pubout -out tfe-bitbucket-public.pem

# Display the public key to paste into Bitbucket
cat tfe-bitbucket-public.pem
```

### Step 2: Configure TFE

```bash
# Add Bitbucket Data Center as a VCS provider
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/oauth-clients" \
  --data '{
    "data": {
      "type": "oauth-clients",
      "attributes": {
        "service-provider": "bitbucket_data_center",
        "name": "Bitbucket Data Center",
        "http-url": "https://bitbucket.internal.example.com",
        "api-url": "https://bitbucket.internal.example.com",
        "key": "terraform-enterprise",
        "rsa-public-key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
        "secret": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
      }
    }
  }'
```

## Azure DevOps Server

### Step 1: Create a Service Connection

```bash
# For Azure DevOps Server, TFE uses personal access tokens
# Create a PAT in Azure DevOps:
# 1. Go to User Settings > Personal Access Tokens
# 2. Create a new token with these scopes:
#    - Code: Read
#    - Code: Status
# The account must have Project Collection Administrator access for
# projects containing Terraform repositories so TFE can create webhooks.

# Create an SSH key pair with an empty passphrase for cloning repositories.
ssh-keygen -t rsa -m PEM -f ./tfe-ado -C "service_terraform_enterprise"
# Add ./tfe-ado.pub to the Azure DevOps Server service user's SSH keys.

# Configure in TFE
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/oauth-clients" \
  --data '{
    "data": {
      "type": "oauth-clients",
      "attributes": {
        "service-provider": "ado_server",
        "name": "Azure DevOps Server",
        "http-url": "https://azuredevops.internal.example.com",
        "api-url": "https://azuredevops.internal.example.com",
        "oauth-token-string": "your-personal-access-token",
        "private-key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
      }
    }
  }'
```

## Connecting Workspaces to VCS Repositories

Once the VCS provider is configured, connect workspaces:

```bash
# Get the OAuth token ID
OAUTH_TOKEN_ID=$(curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/oauth-clients" | \
  jq -r '.data[0].relationships["oauth-tokens"].data[0].id')

# Create a workspace with VCS connection
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"networking-prod\",
        \"vcs-repo\": {
          \"identifier\": \"infrastructure/terraform-networking\",
          \"oauth-token-id\": \"${OAUTH_TOKEN_ID}\",
          \"branch\": \"main\",
          \"ingress-submodules\": false
        },
        \"working-directory\": \"environments/prod\"
      }
    }
  }"
```

## Webhook Configuration

TFE automatically registers webhooks with your VCS provider when you connect a workspace. If webhooks are not working:

```bash
# Check webhook deliveries in GitLab
curl -s \
  --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" \
  "https://gitlab.internal.example.com/api/v4/projects/42/hooks" | \
  jq '.[].url'

# Verify TFE can receive webhooks
# Check TFE logs for webhook events
docker logs tfe 2>&1 | grep -i webhook

# Manually test the specific webhook URL registered for a workspace
curl -X POST \
  "https://tfe.example.com/webhooks/vcs/<webhook-id>" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## TLS and Certificate Trust

Private VCS servers often use internal CA certificates. TFE must trust these:

```bash
# Add the VCS server's CA certificate to TFE's trust bundle
# Include it in the TFE_TLS_CA_BUNDLE_FILE

# Combine the existing CA bundle with the VCS CA
cat /etc/tfe/tls/ca-bundle.crt /path/to/vcs-ca.crt > /etc/tfe/tls/combined-ca-bundle.crt

# Update the TFE configuration
TFE_TLS_CA_BUNDLE_FILE=/etc/tfe/tls/combined-ca-bundle.crt

# Restart TFE to pick up the new CA bundle
docker compose restart tfe
```

## Troubleshooting

**"Could not connect to VCS provider"**: Check network connectivity from TFE to the VCS server. Use `curl` from inside the TFE container to test.

**"Webhook delivery failed"**: The VCS server cannot reach TFE. Check firewall rules and DNS resolution from the VCS server.

**"SSL certificate problem"**: TFE does not trust the VCS server's certificate. Add the CA certificate to TFE's trust bundle.

**"OAuth authorization failed"**: The callback URL in the VCS OAuth application must match exactly what TFE expects. Check for http vs https, trailing slashes, and correct paths.

**Repository not found**: The OAuth user/token may not have access to the repository. Verify permissions in the VCS provider.

## Summary

Connecting Terraform Enterprise to private VCS servers requires OAuth configuration on both sides, proper network connectivity, and TLS certificate trust. The specific setup varies by VCS provider, but the pattern is consistent - create an OAuth application in the VCS, configure TFE with the credentials, complete the authorization flow, and then connect workspaces to repositories. Once set up, TFE automatically triggers runs on push events through webhooks, giving you the same automated workflow experience as cloud-hosted VCS providers.
