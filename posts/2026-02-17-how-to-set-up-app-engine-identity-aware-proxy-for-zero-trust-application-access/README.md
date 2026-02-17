# How to Set Up App Engine Identity-Aware Proxy for Zero-Trust Application Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Identity-Aware Proxy, IAP, Zero Trust, Security

Description: Set up Google Cloud Identity-Aware Proxy on App Engine to enforce user authentication and authorization without modifying your application code.

---

Identity-Aware Proxy (IAP) sits in front of your App Engine application and verifies user identity before any request reaches your code. Users must authenticate through Google's login system and be explicitly authorized before they can access your application. There is no VPN needed, no IP allowlisting required, and your application code does not need to implement authentication.

This is the zero-trust model in practice: every request is verified regardless of where it comes from. Whether a user is in the office, at home, or in a coffee shop, they go through the same authentication and authorization flow.

## How IAP Works with App Engine

When IAP is enabled for your App Engine application:

1. A user tries to access your app URL
2. IAP intercepts the request and checks if the user has a valid session
3. If not authenticated, IAP redirects to Google's login page
4. After login, IAP checks if the user is authorized (has the right IAM role)
5. If authorized, the request passes through to your application with identity headers
6. Your application receives the request with trusted identity information

The entire authentication flow happens before your code runs. Your application just reads the identity headers to know who the user is.

## Step 1: Enable IAP on App Engine

First, enable the IAP API:

```bash
# Enable the IAP API
gcloud services enable iap.googleapis.com --project=your-project-id
```

Then configure the OAuth consent screen. This is required even for internal applications:

```bash
# Configure the OAuth consent screen through the Cloud Console
# Go to: APIs & Services > OAuth consent screen
# Set the user type to "Internal" for organization-only access
# or "External" for broader access
```

You need to set this up through the Cloud Console UI because it requires interactive configuration of the consent screen fields.

## Step 2: Enable IAP for App Engine

Enable IAP for your App Engine application:

```bash
# Enable IAP for App Engine
gcloud iap web enable \
  --resource-type=app-engine \
  --project=your-project-id
```

At this point, IAP is active but nobody has access. All requests will be blocked until you grant the appropriate IAM role.

## Step 3: Grant Access to Users

Add users or groups who should have access:

```bash
# Grant access to a specific user
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --member="user:alice@yourdomain.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project=your-project-id

# Grant access to a Google Group
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --member="group:engineering@yourdomain.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project=your-project-id

# Grant access to everyone in the organization
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --member="domain:yourdomain.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project=your-project-id
```

The `roles/iap.httpsResourceAccessor` role is the key. Only users with this role can access your application through IAP.

## Step 4: Read User Identity in Your Application

After IAP authenticates a user, it adds identity information to request headers:

```python
# main.py - Reading IAP identity headers in Flask
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    # IAP adds these headers after authentication
    user_email = request.headers.get("X-Goog-Authenticated-User-Email", "")
    user_id = request.headers.get("X-Goog-Authenticated-User-ID", "")

    # Remove the "accounts.google.com:" prefix
    if user_email:
        user_email = user_email.split(":")[-1]
    if user_id:
        user_id = user_id.split(":")[-1]

    return jsonify({
        "message": f"Hello, {user_email}",
        "user_id": user_id
    })

@app.route("/admin")
def admin():
    user_email = request.headers.get("X-Goog-Authenticated-User-Email", "")
    user_email = user_email.split(":")[-1] if user_email else ""

    # Application-level authorization on top of IAP
    admin_users = ["admin@yourdomain.com", "lead@yourdomain.com"]
    if user_email not in admin_users:
        return "Forbidden - Admin access required", 403

    return "Admin panel"
```

For Node.js:

```javascript
// server.js - Reading IAP identity headers in Express
app.get("/", (req, res) => {
  // IAP identity headers
  const rawEmail = req.headers["x-goog-authenticated-user-email"] || "";
  const rawId = req.headers["x-goog-authenticated-user-id"] || "";

  // Strip the "accounts.google.com:" prefix
  const email = rawEmail.split(":").pop();
  const userId = rawId.split(":").pop();

  res.json({
    message: `Hello, ${email}`,
    userId: userId
  });
});
```

## Step 5: Verify IAP JWT Tokens (Recommended)

While the identity headers are convenient, they can theoretically be spoofed if someone bypasses IAP (for example, by calling the internal service URL directly). For production applications, verify the IAP JWT token:

```python
# iap_auth.py - Verify IAP JWT token for secure identity verification
from google.auth.transport import requests
from google.oauth2 import id_token
from flask import request
import os

# Your App Engine application's audience
EXPECTED_AUDIENCE = f"/projects/{os.environ.get('GOOGLE_CLOUD_PROJECT_NUMBER')}/apps/{os.environ.get('GOOGLE_CLOUD_PROJECT')}"

def verify_iap_jwt():
    """Verify the IAP JWT token from the request headers.
    Returns the decoded token with user identity, or None if invalid.
    """
    iap_jwt = request.headers.get("X-Goog-IAP-JWT-Assertion")
    if not iap_jwt:
        return None

    try:
        decoded_jwt = id_token.verify_token(
            iap_jwt,
            requests.Request(),
            audience=EXPECTED_AUDIENCE,
            certs_url="https://www.gstatic.com/iap/verify/public_key"
        )
        return decoded_jwt
    except Exception as e:
        print(f"JWT verification failed: {e}")
        return None

def get_verified_user():
    """Get the verified user email from the IAP JWT."""
    jwt_payload = verify_iap_jwt()
    if jwt_payload:
        return jwt_payload.get("email"), jwt_payload.get("sub")
    return None, None
```

Use it in your routes:

```python
@app.route("/secure-endpoint")
def secure_endpoint():
    email, user_id = get_verified_user()
    if not email:
        return "Authentication failed", 401

    return jsonify({"verified_email": email, "verified_id": user_id})
```

## Configuring Access for Service Accounts

If other GCP services need to call your IAP-protected App Engine app, they need to authenticate too:

```bash
# Grant a service account access through IAP
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --member="serviceAccount:my-service@your-project-id.iam.gserviceaccount.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project=your-project-id
```

The calling service needs to include an ID token in its requests:

```python
# Calling an IAP-protected App Engine service from another GCP service
import google.auth
from google.auth.transport.requests import AuthorizedSession

def call_iap_app(url, client_id):
    """Make an authenticated request to an IAP-protected app."""
    credentials, _ = google.auth.default()

    # Create an authorized session that includes the IAP client ID
    authed_session = AuthorizedSession(credentials)
    authed_session.credentials._target_audience = client_id

    response = authed_session.get(url)
    return response
```

## Per-Service IAP Configuration

You can enable IAP selectively for different App Engine services. Maybe your public-facing frontend does not need IAP, but your admin panel does:

```bash
# Enable IAP only for the admin service
gcloud iap web enable \
  --resource-type=app-engine \
  --service=admin \
  --project=your-project-id

# Grant access for the admin service
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --service=admin \
  --member="group:admins@yourdomain.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project=your-project-id
```

## Customizing the Login Flow

You can customize some aspects of the IAP login experience:

```bash
# Set a custom brand (logo and support email shown on consent screen)
gcloud iap settings set \
  --resource-type=app-engine \
  --project=your-project-id \
  --oauth2-client-id=YOUR_CLIENT_ID \
  --oauth2-client-secret=YOUR_CLIENT_SECRET
```

For internal applications (where the OAuth consent screen is set to "Internal"), users in your Google Workspace organization will see a simplified login flow without the consent screen.

## Handling Unauthenticated Endpoints

Sometimes you need specific endpoints to be accessible without authentication - like health checks or webhook receivers:

The `/_ah/health` endpoint used by App Engine is always accessible regardless of IAP settings. But for custom endpoints, you need to exclude them by configuring IAP access levels or handling them at the load balancer layer.

A practical approach is to separate authenticated and unauthenticated endpoints into different services:

```yaml
# dispatch.yaml - Route webhooks to a non-IAP service
dispatch:
  - url: "*/webhooks/*"
    service: webhook-receiver   # This service does not have IAP enabled

  - url: "*/api/*"
    service: api               # This service has IAP enabled
```

## Monitoring IAP Access

View IAP access logs to see who is accessing your application:

```bash
# View IAP access logs
gcloud logging read \
  'resource.type="gae_app" AND protoPayload.@type="type.googleapis.com/google.cloud.audit.AuditLog" AND protoPayload.serviceName="iap.googleapis.com"' \
  --project=your-project-id \
  --limit=50
```

These logs show successful authentications, failed authentication attempts, and authorization denials.

## Summary

Identity-Aware Proxy adds authentication and authorization to your App Engine application without changing your code. Enable IAP, grant the `iap.httpsResourceAccessor` role to authorized users or groups, and your app is protected. Read user identity from request headers or verify the JWT token for stronger security. For a zero-trust architecture, combine IAP with ingress controls set to `internal-and-cloud-load-balancing` so that the only way to reach your application is through IAP's authentication layer. The setup takes about 15 minutes and eliminates the need for a separate authentication system for internal applications.
