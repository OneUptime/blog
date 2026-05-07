# How to Enable Two-Factor Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, 2FA, RBAC

Description: Learn how to implement two-factor authentication for Rancher access using identity provider integrations and additional security layers.

Two-factor authentication (2FA) adds an essential security layer to your Rancher environment by requiring users to provide a second form of verification beyond their password. While Rancher does not have a built-in 2FA feature for local accounts, you can implement 2FA effectively through identity provider integrations. This guide covers multiple approaches to enabling 2FA for Rancher.

## Prerequisites

- Rancher v2.6 or later with admin access
- An external authentication provider configured (or willingness to set one up)
- Users with smartphones or hardware tokens for TOTP
- Admin access to your identity provider

## Understanding 2FA Options for Rancher

Rancher relies on its authentication providers for 2FA enforcement. The recommended approaches are:

1. **OIDC/SAML provider with built-in MFA** (Okta, Microsoft Entra ID, Keycloak, etc.)
2. **GitHub with 2FA enforcement**
3. **Proxy-based authentication with MFA**

## Method 1: 2FA via Keycloak

Keycloak provides built-in TOTP-based 2FA that applies to Rancher logins.

### Step 1: Configure OTP Policy in Keycloak

1. Log in to the Keycloak Admin Console.
2. Navigate to **Authentication** in your realm.
3. Click **Policies** then **OTP Policy**.

Configure the OTP settings:

```plaintext
OTP Type: Time-Based (TOTP)
OTP Hash Algorithm: SHA1
Number of Digits: 6
Look Around Window: 1
OTP Token Period: 30 seconds
```

### Step 2: Enable OTP as Required Action

1. Go to **Authentication** then **Required Actions**.
2. Find **Configure OTP** in the list.
3. Set it as **Default Action** so new users must configure it on first login.

```plaintext
Configure OTP:
  Enabled: ON
  Default Action: ON
```

### Step 3: Verify the Browser Flow Uses the Built-in 2FA Step

1. Go to **Authentication** then **Flows**.
2. Open the default **Browser** flow and confirm it contains the built-in conditional 2FA step.
3. For the standard username/password + TOTP experience, you do not need to create a separate browser flow.

```plaintext
Browser Flow:
  ├── Cookie (Alternative)
  ├── Identity Provider Redirector (Alternative)
  └── Forms (Alternative)
      ├── Username Password Form (Required)
      └── Browser - Conditional 2FA (Conditional)
          ├── Condition - User Configured (Required)
          ├── Condition - credential (Required)
          └── OTP Form (Alternative)
```

### Step 4: Test OTP with Rancher

1. Log out of Rancher.
2. Click **Log in with Keycloak**.
3. Enter your username and password.
4. You will be prompted to set up TOTP if it is your first time.
5. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.).
6. Enter the verification code.
7. Verify that you are logged in to Rancher.

## Method 2: 2FA via Microsoft Entra ID (Azure AD) Conditional Access

### Step 1: Create a Conditional Access Policy

1. Sign in to the Microsoft Entra admin center and navigate to **Entra ID** then **Conditional Access** then **Policies**.
2. Click **New policy**.

Configure the policy:

```plaintext
Name: Rancher MFA Requirement
Assignments:
  Users: All users (or specific groups)
  Target resources: Select the Rancher enterprise application
Conditions:
  (configure as needed - e.g., all locations)
Access controls:
  Grant:
    Grant access
    ☑ Require multi-factor authentication
Session:
  Sign-in frequency: 8 hours
```

3. Enable the policy and click **Create**.

### Step 2: Configure Azure MFA Methods

1. Navigate to **Entra ID** then **Protection** then **Authentication methods**.
2. Enable the MFA methods your organization supports:

```plaintext
☑ Microsoft Authenticator (push notifications)
☑ Hardware OATH tokens
☑ Software OATH tokens (TOTP apps)
☑ SMS (less secure, not recommended)
☑ Voice call (less secure, not recommended)
```

### Step 3: Verify MFA with Rancher

1. Navigate to Rancher and click **Log in with Azure AD**.
2. Enter your Azure AD credentials.
3. Complete the MFA challenge.
4. Verify successful login to Rancher.

## Method 3: 2FA via Okta

### Step 1: Configure Okta MFA Policy

1. Log in to the Okta Admin Console.
2. Navigate to **Security** then **Authenticators**.
3. Enable the authenticators you want to allow and set them to **Required** or **Optional** in your authenticator enrollment policy:

```plaintext
Authenticators:
  ☑ Okta Verify (push/TOTP)
  ☑ Google Authenticator
  ☑ YubiKey OTP or Security Key / Biometric Authenticator
  ☐ Phone (SMS/voice, disabled for security)
```

### Step 2: Create an MFA Sign-On Policy

1. Navigate to the Rancher application in Okta.
2. Open the **Sign On** tab and assign or create an app sign-in policy.
3. Add a sign-on rule:

```plaintext
Rule Name: Require MFA for Rancher
Conditions:
  People: All users
Access:
  User must authenticate with: Any 2 factor types
  Prompt for authentication: Every time user signs in to resource
```

### Step 3: Enroll Users

Users will be prompted to enroll in MFA on their next login attempt:

1. Navigate to Rancher.
2. Click **Log in with Okta**.
3. Enter credentials.
4. Follow the enrollment flow to set up an authenticator app.
5. Complete the MFA challenge.

## Method 4: 2FA via GitHub Organization

### Step 1: Enforce 2FA in GitHub Organization

1. Go to your GitHub organization settings.
2. Navigate to **Authentication security**.
3. Enable **Require two-factor authentication**:

```plaintext
☑ Require two-factor authentication for everyone in the organization
```

4. Optionally enable **Only allow secure two-factor methods** if you want to exclude SMS-based 2FA.

### Step 2: Verify Enforcement

Members and billing managers who do not enable 2FA will retain membership but lose access to organization resources until they comply. Outside collaborators who do not enable 2FA are removed automatically. This ensures that Rancher logins through GitHub meet GitHub's organization-level 2FA requirement.

## Method 5: Reverse Proxy with MFA

For environments that need an additional access-control layer in front of Rancher, place OAuth2 Proxy in front of Rancher and enforce MFA in the upstream OIDC provider. This protects access to the Rancher UI, but it does not add MFA to Rancher's built-in local authentication.

### Step 1: Deploy OAuth2 Proxy

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: cattle-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:latest
          args:
            - --provider=keycloak-oidc
            - --http-address=0.0.0.0:4180
            - --reverse-proxy=true
            - --oidc-issuer-url=https://keycloak.example.com/realms/your-realm
            - --redirect-url=https://rancher.example.com/oauth2/callback
            - --client-id=rancher-proxy
            - --client-secret=<client-secret>
            - --cookie-secret=<base64-cookie-secret>
            - --upstream=http://rancher.cattle-system.svc.cluster.local:80
            - --email-domain=*
            - --set-xauthrequest=true
          ports:
            - containerPort: 4180
---
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: cattle-system
spec:
  selector:
    app: oauth2-proxy
  ports:
    - name: http
      port: 4180
      targetPort: 4180
```

### Step 2: Configure Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oauth2-proxy
  namespace: cattle-system
spec:
  tls:
    - hosts:
        - rancher.example.com
      secretName: rancher-tls
  rules:
    - host: rancher.example.com
      http:
        paths:
          - path: /oauth2
            pathType: Prefix
            backend:
              service:
                name: oauth2-proxy
                port:
                  number: 4180
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rancher-mfa
  namespace: cattle-system
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://$host/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://$host/oauth2/start?rd=$escaped_request_uri"
spec:
  tls:
    - hosts:
        - rancher.example.com
      secretName: rancher-tls
  rules:
    - host: rancher.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rancher
                port:
                  number: 80
```

## Monitoring 2FA Compliance

Track which users have 2FA enabled:

```bash
# For GitHub-based auth, check organization members

curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "https://api.github.com/orgs/your-org/members?filter=2fa_disabled"

# For Rancher, audit authentication events
kubectl -n cattle-system logs deploy/rancher --tail=500 | \
  grep -Ei "login|auth" | tail -20
```

## Best Practices

- **Use phishing-resistant methods**: Prefer authenticator apps and hardware tokens over SMS-based 2FA.
- **Enforce MFA at the IdP level**: Configure MFA in your identity provider so it applies to all applications, not just Rancher.
- **Provide backup codes**: Ensure users have recovery options if they lose their 2FA device.
- **Audit MFA enrollment**: Regularly check that all users have MFA enabled and no exceptions exist.
- **Test the recovery flow**: Verify that the account recovery process works before users need it.

## Conclusion

While Rancher does not include built-in 2FA for local accounts, you can effectively implement it through identity provider integrations. Whether you use Keycloak, Microsoft Entra ID (Azure AD), Okta, or GitHub, the key is to enforce MFA at the identity provider level so that every Rancher authentication goes through a second factor. Choose the approach that aligns with your existing identity infrastructure and security requirements.
