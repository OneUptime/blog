# How to Configure OpenID Connect Provider for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OIDC, Authentication, Security, Federation, Object Storage

Description: Configure OpenID Connect (OIDC) identity providers in Ceph RGW to enable federated authentication and token-based S3 access for external users.

---

Ceph RGW supports registering OpenID Connect (OIDC) providers so that JWTs issued by those providers can be used with `AssumeRoleWithWebIdentity` to get temporary S3 credentials. This enables integration with Google, GitHub, Auth0, Keycloak, and any standards-compliant OIDC IdP.

## Prerequisites

You need the OIDC provider's:
- Issuer URL (found in the `.well-known/openid-configuration` document)
- Client ID used when issuing tokens
- TLS certificate thumbprint (SHA-1 fingerprint of the signing certificate)

## Getting the Certificate Thumbprint

```bash
# Fetch the JWKS URI from the discovery document
DISCOVERY=$(curl -s https://accounts.google.com/.well-known/openid-configuration)
JWKS_URI=$(echo $DISCOVERY | jq -r '.jwks_uri')

# Extract the thumbprint from the TLS certificate
openssl s_client -connect $(echo $JWKS_URI | sed 's|https://||' | cut -d/ -f1):443 \
  -showcerts </dev/null 2>/dev/null \
  | openssl x509 -fingerprint -sha1 -noout \
  | sed 's/SHA1 Fingerprint=//' \
  | tr -d ':'
```

## Registering an OIDC Provider

OIDC providers in Ceph RGW are managed through the IAM-compatible REST API. Use the AWS CLI pointed at your RGW endpoint:

```bash
aws iam create-open-id-connect-provider \
  --url https://accounts.google.com \
  --client-id-list 123456789-abcdefg.apps.googleusercontent.com \
  --thumbprint-list 9BE1290E8F8B7FE8EF5E048E43CF04B4E3B5B4E3 \
  --endpoint-url http://your-rgw-host:7480
```

For Okta:

```bash
aws iam create-open-id-connect-provider \
  --url https://dev-12345.okta.com/oauth2/default \
  --client-id-list 0oabc1234EXAMPLEID \
  --thumbprint-list AABBCCDDEEFF00112233445566778899AABBCCDD \
  --endpoint-url http://your-rgw-host:7480
```

## Listing and Getting Providers

```bash
# List all registered OIDC providers
aws iam list-open-id-connect-providers \
  --endpoint-url http://your-rgw-host:7480

# Get details for a specific provider
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam:::oidc-provider/accounts.google.com \
  --endpoint-url http://your-rgw-host:7480
```

## Creating a Role Trusting the OIDC Provider

```bash
radosgw-admin role create \
  --role-name GoogleS3Role \
  --path "/" \
  --assume-role-policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam:::oidc-provider/accounts.google.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "accounts.google.com:aud": "123456789-abcdefg.apps.googleusercontent.com"
          }
        }
      }
    ]
  }'
```

## Exchanging a JWT for S3 Credentials

```bash
# Obtain JWT from the OIDC provider (provider-specific)
JWT="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

aws sts assume-role-with-web-identity \
  --role-arn "arn:aws:iam:::role/GoogleS3Role" \
  --role-session-name "user-session" \
  --web-identity-token "$JWT" \
  --endpoint-url http://your-rgw-host:7480
```

## Deleting an OIDC Provider

```bash
aws iam delete-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam:::oidc-provider/accounts.google.com \
  --endpoint-url http://your-rgw-host:7480
```

## Summary

Registering OIDC providers in Ceph RGW enables federated access using any standards-compliant identity provider. Register providers with their issuer URL, client ID, and certificate thumbprint, then create roles with trust conditions that validate specific JWT claims. This eliminates the need to provision RGW-specific credentials for external users.
