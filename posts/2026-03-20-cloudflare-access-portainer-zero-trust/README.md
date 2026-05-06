# How to Configure Cloudflare Access with Portainer for Zero Trust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare Access, Zero Trust, Authentication, Security

Description: Learn how to put Portainer behind Cloudflare Access for zero-trust authentication, requiring identity verification before users can even see the Portainer login page.

## What Is Cloudflare Access?

Cloudflare Access sits in front of your application and authenticates users before forwarding requests to your backend. Even if someone finds your Portainer URL, they must first authenticate through Cloudflare - they never reach Portainer without valid identity.

```text
User → Cloudflare Access (identity check) → Cloudflare Tunnel → Portainer
         ↓ if not authenticated
         Cloudflare login page (Google, GitHub, etc.)
```

## Prerequisites

- Portainer accessible via Cloudflare Tunnel (see cloudflare-tunnel-portainer guide)
- Cloudflare Zero Trust account (free tier available)
- An identity provider (Google, GitHub, Okta, or email OTP)

## Step 1: Connect an Identity Provider

1. **Zero Trust → Integrations → Identity providers**
2. Click **Add new identity provider** and select your provider:

```text
Google: Enter Client ID and Client Secret from Google OAuth
GitHub: Enter Client ID and Client Secret from GitHub OAuth app
One-time PIN (email): No setup required - Cloudflare sends email codes
```

## Step 2: Create an Access Application

1. **Zero Trust → Access controls → Applications → Add an application**
2. Select **Self-hosted**
3. Configure:

```text
Application name:  Portainer
Public hostname:   portainer.yourdomain.com
Session duration:  24h (or your preference)
```

## Step 3: Create an Access Policy

Policies define who can access Portainer:

```text
Policy name:   Allow Team
Decision:      Allow

Include rules:
  Emails ending in: @yourcompany.com

  OR

  Emails:
    alice@example.com
    bob@example.com
```

For stricter control, require additional conditions:

```text
Include:
  Emails ending in: @yourcompany.com
Require:
  Country: US    (only US-based users)
```

## Step 4: Enable App Launcher (Optional)

Add Portainer to the Cloudflare App Launcher so team members can find it at `<your-team-name>.cloudflareaccess.com`:

1. **Zero Trust → Access controls → Access settings → Manage your App Launcher**
2. Add an App Launcher policy and choose the login methods you want to allow
3. Open the Portainer application and enable **Show application in App Launcher** under **Experience settings**

## Step 5: Test Access

1. Open an incognito window
2. Visit `https://portainer.yourdomain.com`
3. You're redirected to Cloudflare's login page
4. Authenticate via your configured identity provider
5. After auth, you're forwarded to Portainer

## Service Tokens for Automation

For CI/CD pipelines or scripts that need to access Portainer's API:

1. **Zero Trust → Access controls → Service credentials → Service Tokens → Create Service Token**
2. Note the `CF-Access-Client-Id` and `CF-Access-Client-Secret`
3. In the Portainer Access application, add a policy with **Decision: Service Auth** so the token can authenticate without an IdP login
4. Include in API requests:

```bash
curl -s "https://portainer.yourdomain.com/api/endpoints" \
  -H "CF-Access-Client-Id: ${CF_CLIENT_ID}" \
  -H "CF-Access-Client-Secret: ${CF_CLIENT_SECRET}" \
  -H "X-API-Key: ${PORTAINER_API_KEY}"
```

## Bypass Access for Specific Paths

If Portainer webhooks need to be accessible without auth:

1. Create a separate self-hosted Access application for the exact webhook path Portainer generated (for example, `portainer.yourdomain.com/api/stacks/webhooks/*`)
2. Add a **Bypass** policy to that path-specific application:

```text
Application path: portainer.yourdomain.com/api/stacks/webhooks/*

Policy name:   Webhook Bypass
Decision:      Bypass

Include:
  Everyone
```

## WARP Client for Team VPN Alternative

If you want to reduce repeated browser logins, combine Cloudflare WARP with Access:

- Team members install and enroll the WARP client
- Enable device authentication identity on the Portainer Access application
- If you want enrolled-device-only access, add a Gateway posture check to the Access policy

## Conclusion

Cloudflare Access transforms Portainer's security posture by adding an identity layer that Portainer's built-in auth doesn't provide. Even compromised Portainer credentials don't help an attacker if they can't pass Cloudflare's identity check first. This is especially valuable for home labs and small teams that don't want to manage a VPN.
