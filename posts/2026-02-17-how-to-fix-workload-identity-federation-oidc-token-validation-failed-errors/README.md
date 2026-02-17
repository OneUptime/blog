# How to Fix Workload Identity Federation OIDC Token Validation Failed Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Workload Identity Federation, OIDC, Security, IAM

Description: Troubleshoot and resolve OIDC token validation failures in Google Cloud Workload Identity Federation when connecting external identity providers.

---

Workload Identity Federation lets external workloads (running on AWS, Azure, GitHub Actions, or any OIDC-compliant provider) access Google Cloud resources without using service account keys. It works by exchanging an external token for a short-lived Google Cloud token. When the OIDC token validation fails, you get cryptic error messages that can be hard to trace back to the root cause. This post walks through the most common reasons and how to fix each one.

## How Workload Identity Federation Works

The flow goes like this:

1. Your external workload gets a token from its identity provider (GitHub Actions, AWS STS, etc.)
2. The workload sends this token to Google's Security Token Service (STS)
3. STS validates the token against the workload identity pool provider configuration
4. If validation passes, STS returns a federated token
5. The workload uses the federated token to impersonate a service account
6. The service account's permissions determine what the workload can do

The "OIDC token validation failed" error happens at step 3. Something about the token does not match what the pool provider expects.

## Step 1: Check the Issuer URI

The most common cause is a mismatch between the issuer in the token and the issuer configured in the workload identity pool provider.

```bash
# Check the provider configuration
gcloud iam workload-identity-pools providers describe your-provider \
    --workload-identity-pool=your-pool \
    --location=global \
    --format="json(oidc, attributeMapping, attributeCondition)"
```

The `oidc.issuerUri` field must exactly match the `iss` claim in the token. Even a trailing slash difference will cause validation to fail.

To check what is in your token, decode it (OIDC tokens are JWTs):

```bash
# Decode a JWT token to inspect its claims (base64 decode the payload)
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Compare the `iss` field in the decoded token with the `issuerUri` in your provider configuration. They must match exactly.

For common providers, the issuer URIs are:
- GitHub Actions: `https://token.actions.githubusercontent.com`
- GitLab: `https://gitlab.com` or your self-hosted GitLab URL
- AWS: Not OIDC-based (uses AWS STS)

## Step 2: Check the Audience

The `aud` (audience) claim in the token must match what the provider expects. By default, the workload identity pool provider expects the audience to be:

```
https://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
```

If your identity provider sets a different audience, you need to configure allowed audiences in the provider:

```bash
# Update the provider to accept a custom audience
gcloud iam workload-identity-pools providers update-oidc your-provider \
    --workload-identity-pool=your-pool \
    --location=global \
    --allowed-audiences="https://your-custom-audience.example.com"
```

For GitHub Actions, you set the audience when requesting the token:

```yaml
# GitHub Actions workflow - requesting an OIDC token with the correct audience
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: google-github-actions/auth@v2
        with:
          # This sets the correct audience automatically
          workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/my-pool/providers/my-provider
          service_account: my-sa@my-project.iam.gserviceaccount.com
```

## Step 3: Check the Attribute Mapping

Attribute mappings translate claims from the external token to Google Cloud attributes. If a mapped claim does not exist in the token, the validation fails.

```bash
# Check the attribute mapping configuration
gcloud iam workload-identity-pools providers describe your-provider \
    --workload-identity-pool=your-pool \
    --location=global \
    --format="json(attributeMapping)"
```

A typical mapping for GitHub Actions looks like:

```json
{
    "google.subject": "assertion.sub",
    "attribute.repository": "assertion.repository",
    "attribute.actor": "assertion.actor",
    "attribute.ref": "assertion.ref"
}
```

Every claim referenced in the mapping (the `assertion.xxx` values) must exist in the external token. If you reference `assertion.repository` but the token does not have a `repository` claim, validation fails.

Decode your token and verify that all mapped claims are present.

## Step 4: Check the Attribute Condition

Attribute conditions are CEL (Common Expression Language) expressions that must evaluate to true for the token to be accepted. If the condition evaluates to false, the token is rejected.

```bash
# Check the attribute condition
gcloud iam workload-identity-pools providers describe your-provider \
    --workload-identity-pool=your-pool \
    --location=global \
    --format="value(attributeCondition)"
```

A common condition for GitHub Actions:

```
assertion.repository_owner == 'your-github-org'
```

If your workflow runs from a fork or a different org, this condition fails. Make sure the claims in your token match what the condition expects.

You can test CEL expressions locally before applying them:

```bash
# Update the attribute condition
gcloud iam workload-identity-pools providers update-oidc your-provider \
    --workload-identity-pool=your-pool \
    --location=global \
    --attribute-condition="assertion.repository_owner == 'your-github-org' && assertion.ref == 'refs/heads/main'"
```

## Step 5: Check Token Expiry

OIDC tokens have a limited lifetime. If the token expires before STS can validate it, you get a validation error. This can happen if:

- There is significant clock skew between the token issuer and Google's servers
- The token was cached and reused after expiration
- The token has a very short lifetime and network latency causes it to expire in transit

Check the `exp` and `iat` claims in your token:

```bash
# Decode and check token timestamps
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -c "
import sys, json, datetime
data = json.load(sys.stdin)
iat = datetime.datetime.fromtimestamp(data.get('iat', 0))
exp = datetime.datetime.fromtimestamp(data.get('exp', 0))
print(f'Issued at: {iat}')
print(f'Expires at: {exp}')
print(f'Lifetime: {exp - iat}')
"
```

Make sure you request a fresh token for each authentication attempt rather than caching tokens.

## Step 6: Verify the JWKS Endpoint

STS validates the token's signature using the JSON Web Key Set (JWKS) published by the identity provider. If the JWKS endpoint is unreachable or returns unexpected keys, validation fails.

The JWKS endpoint is derived from the issuer URI by appending `/.well-known/openid-configuration` and reading the `jwks_uri` field from the response.

```bash
# Check the OIDC discovery document
curl -s "https://token.actions.githubusercontent.com/.well-known/openid-configuration" | python3 -m json.tool

# Check the JWKS endpoint
curl -s "https://token.actions.githubusercontent.com/.well-known/jwks" | python3 -m json.tool
```

If you are using a self-hosted identity provider, make sure the JWKS endpoint is publicly accessible from Google's infrastructure.

## Step 7: Check Service Account Impersonation

Even after the STS token exchange succeeds, you still need to impersonate a service account. The workload identity pool must be granted the `roles/iam.workloadIdentityUser` role on the target service account:

```bash
# Grant the workload identity pool principal the ability to impersonate the SA
gcloud iam service-accounts add-iam-policy-binding \
    your-sa@your-project.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/your-pool/attribute.repository/your-org/your-repo"
```

The `member` format is important. For GitHub Actions, the typical patterns are:
- `principalSet://...attribute.repository/org/repo` - any workflow in a repo
- `principal://...subject/repo:org/repo:ref:refs/heads/main` - specific branch

## Step 8: Enable Audit Logging

If you are still stuck, enable audit logging to see the exact validation error:

```bash
# Check audit logs for STS token exchange failures
gcloud logging read 'resource.type="audited_resource" AND protoPayload.serviceName="sts.googleapis.com" AND severity>=ERROR' \
    --project=your-project \
    --limit=10 \
    --format="json(protoPayload.status, protoPayload.authenticationInfo)"
```

The audit log entry contains the specific reason the token validation failed, which is much more detailed than the error message returned to the caller.

## Monitoring Identity Federation

Set up monitoring with [OneUptime](https://oneuptime.com) to track token exchange success and failure rates. This helps you catch configuration drift or provider-side changes that break your authentication pipeline before they block deployments.

Workload Identity Federation is the right way to authenticate external workloads to Google Cloud - it eliminates the need for long-lived service account keys. Getting the OIDC configuration right takes some care, but once it is working, it is much more secure than the alternatives.
