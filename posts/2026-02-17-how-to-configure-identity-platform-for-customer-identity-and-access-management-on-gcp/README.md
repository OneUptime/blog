# How to Configure Identity Platform for Customer Identity and Access Management on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Identity Platform, CIAM, Authentication, User Management

Description: A practical guide to setting up Google Cloud Identity Platform for customer-facing authentication with multi-tenant support, social login, and MFA capabilities.

---

Identity Platform is Google Cloud's customer identity and access management (CIAM) service. While Workforce Identity Federation handles employee access to Google Cloud, Identity Platform handles authentication for the users of your applications - your customers, partners, and external collaborators. It provides authentication features you would otherwise build yourself: email/password login, social sign-in, phone authentication, multi-factor authentication, and multi-tenant isolation.

This guide covers setting up Identity Platform, configuring authentication providers, implementing multi-tenancy, and integrating it with your applications.

## What Identity Platform Provides

Identity Platform is the enterprise-grade version of Firebase Authentication. It includes everything Firebase Auth offers, plus:

- Multi-tenancy with isolated user pools
- SAML and OIDC federation for enterprise customers
- Blocking functions for custom authentication logic
- Audit logging for compliance
- SLA-backed availability
- Integration with Google Cloud services

## Enabling Identity Platform

Start by enabling the service and configuring basic settings.

```bash
# Enable Identity Platform API
gcloud services enable identitytoolkit.googleapis.com \
  --project=my-app-project

# Enable the Identity Platform service in the project
gcloud identity-platform config update \
  --project=my-app-project \
  --autodelete-anonymous-users
```

## Configuring Authentication Providers

### Email and Password Authentication

The most common starting point. Enable it and configure password requirements.

```bash
# Enable email/password authentication
gcloud identity-platform config update \
  --project=my-app-project \
  --enable-email-signin
```

For more granular configuration, use the REST API or Terraform.

```hcl
# Terraform configuration for Identity Platform
resource "google_identity_platform_config" "default" {
  project = "my-app-project"

  sign_in {
    allow_duplicate_emails = false

    email {
      enabled           = true
      password_required = true
    }

    phone_number {
      enabled = true
      test_phone_numbers = {
        "+15551234567" = "123456"  # Test number for development
      }
    }
  }

  # Auto-delete anonymous users after 30 days
  autodelete_anonymous_users = true
}
```

### Social Login Providers

Configure social login for Google, GitHub, and other providers.

```hcl
# Google sign-in provider
resource "google_identity_platform_default_supported_idp_config" "google" {
  project  = "my-app-project"
  idp_id   = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled  = true
}

# GitHub sign-in provider
resource "google_identity_platform_default_supported_idp_config" "github" {
  project  = "my-app-project"
  idp_id   = "github.com"
  client_id     = var.github_oauth_client_id
  client_secret = var.github_oauth_client_secret
  enabled  = true
}
```

Using gcloud for the same setup:

```bash
# Configure Google as a sign-in provider
gcloud identity-platform default-supported-idp-configs create \
  --project=my-app-project \
  --idp-id=google.com \
  --client-id=YOUR_GOOGLE_CLIENT_ID \
  --client-secret=YOUR_GOOGLE_CLIENT_SECRET \
  --enabled=true

# Configure GitHub as a sign-in provider
gcloud identity-platform default-supported-idp-configs create \
  --project=my-app-project \
  --idp-id=github.com \
  --client-id=YOUR_GITHUB_CLIENT_ID \
  --client-secret=YOUR_GITHUB_CLIENT_SECRET \
  --enabled=true
```

## Implementing Multi-Tenancy

Multi-tenancy is one of the key differentiators of Identity Platform. Each tenant gets an isolated user pool, its own authentication configuration, and separate user data. This is essential for SaaS applications that serve multiple organizations.

```bash
# Create a tenant for a customer organization
gcloud identity-platform tenants create \
  --project=my-app-project \
  --display-name="Acme Corporation" \
  --allow-password-signup \
  --enable-email-link-signin

# Create another tenant
gcloud identity-platform tenants create \
  --project=my-app-project \
  --display-name="Globex Industries" \
  --allow-password-signup
```

Each tenant can have its own authentication providers. For enterprise customers, you can configure SAML or OIDC federation per tenant.

```bash
# Configure SAML federation for a tenant's enterprise IdP
gcloud identity-platform tenants inbound-saml-configs create \
  --project=my-app-project \
  --tenant=TENANT_ID \
  --display-name="Acme SSO" \
  --idp-entity-id="https://idp.acme.com/saml" \
  --sso-url="https://idp.acme.com/saml/sso" \
  --idp-certificates=@acme-idp-cert.pem \
  --sp-entity-id="https://myapp.com/saml/acme" \
  --enabled
```

## Integrating with Your Application

Identity Platform provides client SDKs and a server-side Admin SDK. Here is integration using the Firebase Admin SDK (which works with Identity Platform).

### Server-Side Setup (Node.js)

```javascript
// Initialize the Admin SDK for Identity Platform
const admin = require('firebase-admin');

// Initialize with your project credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'my-app-project',
});

// Verify an ID token from a client
async function verifyToken(idToken, tenantId) {
  try {
    // Get the tenant-specific auth instance
    const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);

    // Verify the token
    const decodedToken = await tenantAuth.verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      tenantId: decodedToken.firebase.tenant,
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw error;
  }
}

// Create a user in a specific tenant
async function createTenantUser(tenantId, email, password) {
  const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);

  const user = await tenantAuth.createUser({
    email: email,
    password: password,
    emailVerified: false,
  });

  console.log(`Created user ${user.uid} in tenant ${tenantId}`);
  return user;
}
```

### Client-Side Setup (JavaScript)

```javascript
// Client-side authentication with Identity Platform
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInWithPopup,
         GoogleAuthProvider, multiFactor, PhoneAuthProvider,
         PhoneMultiFactorGenerator } from 'firebase/auth';

// Initialize the app
const app = initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'my-app-project.firebaseapp.com',
  projectId: 'my-app-project',
});

const auth = getAuth(app);

// Set the tenant ID for multi-tenant authentication
auth.tenantId = 'TENANT_ID';

// Email/password sign-in
async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await result.user.getIdToken();
    // Send idToken to your backend for verification
    return idToken;
  } catch (error) {
    console.error('Sign-in failed:', error.message);
    throw error;
  }
}

// Google sign-in
async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
```

## Configuring Multi-Factor Authentication

MFA adds a second verification step after the initial authentication. Identity Platform supports SMS-based and TOTP-based MFA.

```bash
# Enable MFA for the project
gcloud identity-platform config update \
  --project=my-app-project \
  --mfa-state=ENABLED \
  --mfa-enabled-providers=PHONE_SMS
```

Using Terraform:

```hcl
# Enable MFA with SMS verification
resource "google_identity_platform_config" "default" {
  project = "my-app-project"

  mfa {
    state = "ENABLED"

    provider_configs {
      state = "ENABLED"
      totp_provider_config {
        adjacent_intervals = 1
      }
    }
  }
}
```

## Blocking Functions for Custom Logic

Blocking functions let you run custom logic during authentication events. You can block sign-in, modify tokens, or enforce custom policies.

```javascript
// Cloud Function that runs before user creation
// Enforces email domain restrictions per tenant
const functions = require('firebase-functions');

exports.beforeCreate = functions.auth.user().beforeCreate((user, context) => {
  const tenantId = context.credential?.providerId;

  // Block free email providers for enterprise tenants
  const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com'];
  const emailDomain = user.email?.split('@')[1];

  if (context.resource?.name?.includes('enterprise-tenant') &&
      freeProviders.includes(emailDomain)) {
    throw new functions.auth.HttpsError(
      'invalid-argument',
      'Enterprise tenants require a corporate email address'
    );
  }

  // Add custom claims
  return {
    customClaims: {
      createdVia: 'identity-platform',
      tenantId: context.resource?.name,
    }
  };
});

// Blocking function that runs before sign-in
exports.beforeSignIn = functions.auth.user().beforeSignIn((user, context) => {
  // Check if user account is suspended in your system
  // This is a simplified example
  if (user.customClaims?.suspended) {
    throw new functions.auth.HttpsError(
      'permission-denied',
      'Account is suspended. Contact support.'
    );
  }
});
```

## Audit Logging

Identity Platform generates audit logs that you can use for compliance and security monitoring.

```bash
# View recent authentication events
gcloud logging read 'resource.type="identitytoolkit_project" AND protoPayload.methodName="google.cloud.identitytoolkit.v1.AuthenticationService.SignInWithPassword"' \
  --project=my-app-project \
  --limit=20 \
  --format="table(timestamp, protoPayload.request.email, protoPayload.response.localId)"
```

## Scaling Considerations

Identity Platform handles millions of users without manual scaling, but here are things to plan for:

1. **Rate limits** - authentication requests are rate-limited. For high-traffic applications, request quota increases proactively.
2. **Token verification** - verify tokens server-side using the Admin SDK, which caches public keys for efficient validation.
3. **User migration** - when migrating from another auth system, use the Admin SDK bulk import with password hashes to avoid forcing password resets.

Identity Platform gives you enterprise-grade customer authentication without building it from scratch. The multi-tenancy support, federation capabilities, and blocking functions cover most CIAM requirements out of the box, and you get the reliability of Google Cloud infrastructure behind it.
