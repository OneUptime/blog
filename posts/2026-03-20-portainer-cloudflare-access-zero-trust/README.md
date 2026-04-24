# How to Configure Cloudflare Access with Portainer for Zero Trust (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Zero Trust, Access, Authentication

Description: Learn how to configure Cloudflare Access as a zero-trust authentication layer in front of Portainer, requiring identity verification before users can reach the Portainer login page.

## Introduction

Cloudflare Access adds a zero-trust authentication layer in front of Portainer, requiring users to authenticate through your identity provider before they can even reach the Portainer login page. This means even if Portainer credentials are compromised, attackers still need to pass Cloudflare Access authentication. This guide covers setting up Cloudflare Access with various identity providers for Portainer.

## Prerequisites

- Portainer accessible via Cloudflare Tunnel (see the Cloudflare Tunnel guide)
- A Cloudflare Zero Trust account (free tier available)
- An identity provider (Google, GitHub, Microsoft, Okta, etc.)

## Step 1: Configure an Identity Provider in Cloudflare

1. Log into [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Go to **Integrations** → **Identity providers**
3. Click **Add new identity provider**

**Option A: Google**
```text
Type: Google
App ID: your-client-id.apps.googleusercontent.com
Client Secret: your-google-client-secret

# In Google Cloud Console, create OAuth credentials:
# Authorized JavaScript origin: https://YOUR_TEAM.cloudflareaccess.com
# Authorized redirect URI: https://YOUR_TEAM.cloudflareaccess.com/cdn-cgi/access/callback
```

**Option B: GitHub**
```text
Type: GitHub
App ID: your-github-app-client-id
Client Secret: your-github-app-client-secret

# GitHub OAuth App settings:
# Homepage URL: https://YOUR_TEAM.cloudflareaccess.com
# Authorization callback URL: https://YOUR_TEAM.cloudflareaccess.com/cdn-cgi/access/callback
# After saving in Cloudflare, click Finish setup and authorize GitHub access
```

**Option C: One-Time PIN (simplest - uses email)**
```text
Type: One-time PIN
# No additional configuration needed
# Users receive a PIN via email to authenticate
```

## Step 2: Create a Cloudflare Access Application for Portainer

1. Go to **Access controls** → **Applications** → **Add an application**
2. Choose **Self-hosted**
3. Configure:

```text
Application Configuration:
  Application name: Portainer Admin
  Session duration: 24 hours
  Application domain: portainer.example.com
  Path: (leave empty to protect the entire app)

Logo: Upload Portainer logo (optional)
```

## Step 3: Define Access Policies

Policies control who can access Portainer:

**Policy 1: Allow specific team members**
```text
Policy name: Engineering Team
Action: Allow
Include rules:
  Selector: Emails
  Value: alice@company.com, bob@company.com, charlie@company.com
```

**Policy 2: Allow by email domain**
```text
Policy name: Company Employees
Action: Allow
Include rules:
  Selector: Emails ending in
  Value: @yourcompany.com
```

**Policy 3: Allow by GitHub organization**
```text
Policy name: GitHub Org Members
Action: Allow
Include rules:
  Selector: GitHub Organizations
  Value: your-github-org
```

**Policy 4: Block everyone except specific IPs (bypass for internal access)**
```text
Policy name: Office Network
Action: Allow
Include rules:
  Selector: IP Ranges
  Value: 203.0.113.0/24    (your office IP range)
```

## Step 4: Configure Application Settings

```text
CORS Settings (only if Portainer API is accessed cross-origin; values must match your origin response):
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods / Access-Control-Allow-Headers: match your origin response

Cookie Settings:
  SameSite: Lax
  HTTP Only: ON    (enabled by default)

Additional Settings:
  401 Response for Service Auth policies: ON    (optional, useful for API clients)
```

## Step 5: Service Tokens for API Access

For CI/CD or scripts that access Portainer API through the Cloudflare Access layer:

1. Go to **Access controls** → **Service credentials** → **Service Tokens** → **Create Service Token**

```text
Name: portainer-cicd-token
Token duration: 1 year
```

Copy the Client ID and Client Secret.

```bash
# The service token satisfies Cloudflare Access; Portainer still requires its own login
curl -X POST https://portainer.example.com/api/auth \
  -H "CF-Access-Client-Id: your-client-id.access" \
  -H "CF-Access-Client-Secret: your-client-secret" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}'
```

Update your Cloudflare Access application policy to allow the service token:
```text
Policy name: Service Accounts
Action: Service Auth
Include rules:
  Selector: Service Token
  Value: portainer-cicd-token
```

## Step 6: Bypass Access for Portainer Edge Agents

If you're using Portainer Edge Agents, Portainer documents that agents need the Portainer API port (usually `9443`) and the tunnel port (`8000`) reachable on the Portainer Server. For the Access-protected HTTPS hostname, create a separate, more specific self-hosted application for the poll endpoint and attach a **Bypass** policy to it:

1. Create a separate Access application and **Bypass** policy for the Edge Agent poll path:
```text
Application domain: portainer.example.com
Path: /api/endpoints/*/status

Policy name: Edge Agent Polling
Action: Bypass (no authentication)
Include rules:
  Selector: Everyone
```

The Edge Agent also needs Portainer's tunnel port (`8000` by default) reachable. Cloudflare Access application paths only cover the HTTPS hostname, not the separate tunnel port.

## Step 7: Test the Zero Trust Flow

```bash
# Test that unauthenticated access is blocked
curl -I https://portainer.example.com
# Expected: 302 redirect to Cloudflare Access login page, not Portainer

# Verify authenticated access (using service token)
curl -I https://portainer.example.com \
  -H "CF-Access-Client-Id: client-id.access" \
  -H "CF-Access-Client-Secret: client-secret"
# Expected: request reaches Portainer instead of redirecting to Cloudflare Access login page

# Check audit logs in Cloudflare Access
# Cloudflare One → Insights → Logs → Access authentication logs
# Filter by App: Portainer Admin
```

## Conclusion

Cloudflare Access creates a zero-trust perimeter around Portainer, requiring identity verification before any user can interact with the management interface. This defense-in-depth approach means credential stuffing and brute force attacks on Portainer itself are blocked at the Cloudflare edge. Combine Access with service tokens for CI/CD automation, and configure bypass policies for Portainer Edge Agents that need programmatic access without browser-based authentication flows.
