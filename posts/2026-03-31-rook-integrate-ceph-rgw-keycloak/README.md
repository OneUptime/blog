# How to Integrate Ceph RGW with Keycloak

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Keycloak, OIDC, Authentication, Federation, Object Storage

Description: Integrate Ceph RGW with Keycloak as an OpenID Connect provider to enable federated authentication and OIDC-based token exchange for S3 access.

---

Ceph RGW supports AssumeRoleWithWebIdentity, which allows users authenticated by an external OpenID Connect (OIDC) provider like Keycloak to obtain temporary S3 credentials. This enables SSO-based access to object storage.

## Prerequisites

Before configuring OIDC, enable STS support in your RGW by setting the following in your Ceph config:

```ini
rgw_s3_auth_use_sts = true
rgw_sts_key = <16-hex-character-key>
```

Generate the STS key with:

```bash
openssl rand -hex 8
```

The key must be exactly 16 hex characters. If it is shorter or longer, STS requests will fail.

## Architecture Overview

The flow works as follows:
1. User authenticates with Keycloak and receives a JWT access token
2. Application calls RGW's `AssumeRoleWithWebIdentity` with the JWT
3. RGW validates the token against Keycloak's JWKS endpoint
4. RGW returns temporary S3 credentials scoped to an IAM role

## Step 1 - Configure Keycloak

Create a client in Keycloak for RGW:

- Client ID: `rgw-client`
- Client Protocol: `openid-connect`
- Access Type: `confidential`
- Add a mapper to include a custom claim, e.g., `s3-role`, mapping to a role name

Obtain the JWKS URI from Keycloak:
```yaml
http://keycloak.example.com/auth/realms/myrealm/.well-known/openid-configuration
```

## Step 2 - Register the OIDC Provider in RGW

First, create an RGW user with OIDC provider management capabilities:

```bash
radosgw-admin user create --uid="oidc-admin" --display-name="OIDC Admin"
radosgw-admin caps add --uid="oidc-admin" --caps="oidc-provider=*"
```

Configure the AWS CLI with this user's credentials, then register the OIDC provider:

```bash
aws --endpoint http://your-rgw-host:7480 iam create-open-id-connect-provider \
  --url http://keycloak.example.com/auth/realms/myrealm \
  --client-id-list rgw-client \
  --thumbprint-list AABBCCDDEEFF00112233445566778899AABBCCDD
```

The thumbprint is the SHA-1 fingerprint of the Keycloak server's TLS certificate, as a 40-character hex string without colons.

List registered providers:

```bash
aws --endpoint http://your-rgw-host:7480 iam list-open-id-connect-providers
```

## Step 3 - Create an RGW Role with Keycloak Trust

```bash
radosgw-admin role create \
  --role-name KeycloakS3Role \
  --path "/" \
  --assume-role-policy-doc '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Federated": "arn:aws:iam:::oidc-provider/keycloak.example.com/auth/realms/myrealm"},
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "keycloak.example.com/auth/realms/myrealm:sub": "user-subject-id"
          }
        }
      }
    ]
  }'
```

Attach a policy to the role:

```bash
radosgw-admin role-policy put \
  --role-name KeycloakS3Role \
  --policy-name S3FullAccess \
  --policy-doc '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:*","Resource":"*"}]}'
```

## Step 4 - Exchange JWT for S3 Credentials

```bash
JWT=$(curl -s -X POST \
  http://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/token \
  -d "client_id=rgw-client&client_secret=mysecret&grant_type=password&username=alice&password=alicepass" \
  | jq -r '.access_token')

aws sts assume-role-with-web-identity \
  --role-arn "arn:aws:iam:::role/KeycloakS3Role" \
  --role-session-name "alice-session" \
  --web-identity-token "$JWT" \
  --endpoint-url http://your-rgw-host:7480
```

## Summary

Integrating Ceph RGW with Keycloak enables federated OIDC authentication for S3 access. Register Keycloak as an OIDC provider in RGW, create roles with appropriate trust conditions, and use AssumeRoleWithWebIdentity to exchange Keycloak JWTs for temporary S3 credentials. This eliminates the need to distribute long-lived RGW access keys to users.
