# How to Configure OAuth Consent Screen and API Scopes for Least Privilege in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, OAuth, API Scopes, Least Privilege, Google Cloud Security

Description: A practical guide to configuring the OAuth consent screen and selecting API scopes with least privilege principles on Google Cloud Platform.

---

Every application that accesses Google APIs on behalf of users needs an OAuth consent screen. It is the dialog that asks users to grant your application specific permissions. Getting this configuration right is not just about compliance - it directly affects user trust, security posture, and whether Google approves your app for production use.

The principle of least privilege applies heavily here: request only the scopes your application actually needs. Requesting broad scopes like `https://www.googleapis.com/auth/cloud-platform` when you only need read-only Cloud Storage access is a security risk and can make Google's verification review harder to justify. Use IAM permissions to limit access to a specific bucket or object.

## Understanding OAuth Scopes on GCP

OAuth scopes define what your application can do with a user's authorization. Each Google API has its own set of scopes ranging from broad (full access) to narrow (read-only on specific resources).

```mermaid
graph TD
    A[Broad Scope] --> B["cloud-platform<br/>Full access to all GCP APIs"]
    A --> C["cloud-platform.read-only<br/>Read access to all GCP APIs"]

    D[Narrow Scopes] --> E["devstorage.read_only<br/>Read Cloud Storage data"]
    D --> F["bigquery.readonly<br/>Read BigQuery data"]
    D --> G["compute.readonly<br/>Read Compute Engine resources"]

    style A fill:#ea4335,color:#fff
    style D fill:#34a853,color:#fff
```

Always prefer narrow scopes. They limit the blast radius if your application or a user's token is compromised.

## Configuring the OAuth Consent Screen

### Using the Google Cloud Console

For general Google API OAuth apps, configure the consent screen in the Google Auth Platform section of the Google Cloud Console:

```text
Google Cloud Console > Google Auth Platform > Branding
Google Cloud Console > Google Auth Platform > Audience
Google Cloud Console > Google Auth Platform > Data Access
Google Cloud Console > Google Auth Platform > Clients
```

The old `gcloud alpha iap oauth-brands` and `gcloud alpha iap oauth-clients` commands were for Identity-Aware Proxy OAuth brands and clients, not general OAuth consent screen configuration. They are deprecated because the IAP OAuth Admin APIs were shut down in March 2026.

### Consent Screen Configuration Options

The consent screen has several important settings:

**User type** - Choose "Internal" if your app is only for users within your Google Workspace organization. Internal apps skip the verification process and only show the consent screen to organization members. Choose "External" for apps available to any Google account.

**Application name** - This appears on the consent screen. Use your actual product name.

**Scopes** - The permissions your app requests. This is where least privilege matters most.

**Authorized domains** - Domains verified in Google Search Console that your app uses.

## Selecting Least-Privilege Scopes

Here is how to choose scopes for common scenarios:

### Cloud Storage Access

```python
# Bad: Requesting full cloud-platform scope just to read files
# This gives access to ALL GCP services, not just Storage
SCOPES_BAD = ['https://www.googleapis.com/auth/cloud-platform']

# Good: Request only the specific Storage scope needed
# Read-only access to Cloud Storage objects
SCOPES_GOOD = ['https://www.googleapis.com/auth/devstorage.read_only']

# Even better: combine the narrowest OAuth scope with IAM
# bucket/object permissions for the resources the user should read
SCOPES_BEST = ['https://www.googleapis.com/auth/devstorage.read_only']
```

### BigQuery Access

```python
# Only need to run queries and read results
SCOPES = [
    'https://www.googleapis.com/auth/bigquery.readonly',  # Read data
]

# If you also need to create tables and write data
SCOPES = [
    'https://www.googleapis.com/auth/bigquery',  # Full BigQuery access
]

# Never use cloud-platform scope just for BigQuery
# BAD: 'https://www.googleapis.com/auth/cloud-platform'
```

### Gmail and Google Workspace

```python
# Only need to send emails on behalf of the user
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',  # Send only, no read
]

# Need to read email metadata but not content
SCOPES = [
    'https://www.googleapis.com/auth/gmail.metadata',  # Headers only
]

# BAD: Full Gmail access when you only need to send
# 'https://www.googleapis.com/auth/gmail.modify'
```

## Implementing OAuth in Your Application

Here is a complete example of an application that properly requests minimal scopes:

```python
# oauth_app.py
# Web application that accesses BigQuery with least-privilege scopes

from flask import Flask, redirect, request, session, url_for
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.cloud import bigquery

app = Flask(__name__)
app.secret_key = 'your-secret-key'

# Only request the scopes the application actually needs
# bigquery.readonly - read BigQuery data
# userinfo.email - identify the user
SCOPES = [
    'https://www.googleapis.com/auth/bigquery.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
]

# OAuth flow configuration
CLIENT_SECRETS_FILE = 'client_secret.json'

@app.route('/authorize')
def authorize():
    """Start the OAuth flow with minimal scopes."""
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=url_for('callback', _external=True)
    )

    # Generate the authorization URL
    authorization_url, state = flow.authorization_url(
        access_type='offline',       # Get a refresh token
        include_granted_scopes='true', # Incremental authorization
        prompt='consent',             # Always show consent screen
    )

    session['state'] = state
    return redirect(authorization_url)

@app.route('/callback')
def callback():
    """Handle the OAuth callback and store credentials."""
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        state=session['state'],
        redirect_uri=url_for('callback', _external=True)
    )

    # Exchange the authorization code for credentials
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials

    # Store credentials securely (use Secret Manager in production)
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes,
    }

    return redirect(url_for('query_data'))

@app.route('/query')
def query_data():
    """Use the OAuth credentials to query BigQuery."""
    creds_data = session.get('credentials')
    if not creds_data:
        return redirect(url_for('authorize'))

    credentials = Credentials(**creds_data)
    client = bigquery.Client(credentials=credentials, project='my-project')

    # Run a read-only query (our scope only allows reading)
    query = "SELECT COUNT(*) as total FROM `my_dataset.my_table`"
    results = client.query(query).result()

    return str(list(results))
```

## Incremental Authorization

Instead of requesting all scopes upfront, use incremental authorization to request additional scopes only when needed:

```python
# Start with basic scopes
BASIC_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
]

# Request additional scopes only when the user needs that feature
BIGQUERY_SCOPES = [
    'https://www.googleapis.com/auth/bigquery.readonly',
]

def request_bigquery_access():
    """Incrementally request BigQuery scope when the user first accesses reports."""
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=BASIC_SCOPES + BIGQUERY_SCOPES,
        redirect_uri=url_for('callback', _external=True)
    )

    authorization_url, state = flow.authorization_url(
        # This flag tells Google to add to existing scopes, not replace
        include_granted_scopes='true',
    )

    return redirect(authorization_url)
```

## Terraform Configuration for OAuth Clients

The historical Terraform resources `google_iap_brand` and `google_iap_client` managed IAP OAuth brands and clients only. They were deprecated with the IAP OAuth Admin APIs and no longer work after the March 2026 shutdown. Configure general Google API OAuth app branding, audience, data access, and OAuth clients in the Google Auth Platform console.

## Scope Reference for Common GCP Services

Here is a quick reference for choosing the right scope:

| Service | Read-Only Scope | Full Access Scope |
|---------|----------------|-------------------|
| Cloud Storage | `devstorage.read_only` | `devstorage.full_control` |
| BigQuery | `bigquery.readonly` | `bigquery` |
| Compute Engine | `compute.readonly` | `compute` |
| Cloud Logging | `logging.read` | `logging.admin` |
| Pub/Sub | `pubsub` (no read-only) | `pubsub` |

## Verification and Publishing

For external apps requesting sensitive or restricted scopes, Google may require a verification review:

```bash
# Prepare for verification by ensuring:
# 1. You have a privacy policy URL
# 2. You have a terms of service URL
# 3. You only request scopes you can justify
# 4. Your authorized domains are verified
```

**Sensitive scopes** (like `gmail.send`) require Google's sensitive scope verification unless an exception applies, but they don't require a third-party security assessment. **Restricted scopes** (like `gmail.metadata`, `gmail.modify`, or full Drive access) require restricted scope verification and can require a security assessment if your app stores or transmits restricted-scope data on servers. The fewer sensitive and restricted scopes you request, the faster and easier the verification process.

## Best Practices

**Audit scope usage regularly.** Review the scopes configured in Google Auth Platform, the scopes requested in your code, and your stored tokens, then remove any that are not needed.

**Use service accounts for server-to-server communication.** OAuth user consent is for end-user-facing applications. Backend services should use service account impersonation or Workload Identity.

**Store tokens securely.** Use Google Cloud Secret Manager for refresh tokens, not environment variables or config files.

**Implement token revocation.** Give users the ability to disconnect your application and delete stored refresh tokens. This builds trust and helps you respond cleanly when a user withdraws access.

Configuring OAuth with least privilege is not just a best practice - it is a fundamental security control that limits what can go wrong when tokens are compromised. Start narrow, use incremental authorization for additional features, and regularly audit what your application actually needs.
