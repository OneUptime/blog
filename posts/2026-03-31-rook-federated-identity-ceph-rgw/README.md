# How to Set Up Federated Identity with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Federation, OIDC

Description: Learn how to configure federated identity for Ceph RGW, enabling users from external identity providers to access S3 storage without local user accounts.

---

## Overview

Federated identity in Ceph RGW lets users from external identity providers (IdP) such as Keycloak, Okta, or AWS Cognito access S3 resources without creating local RGW accounts. The federation is based on OIDC and the AWS STS `AssumeRoleWithWebIdentity` API, which maps external JWT claims to RGW IAM roles.

## Step 1 - Enable STS and IAM in RGW

```bash
# Enable required features
ceph config set client.rgw.my-store rgw_s3_auth_use_sts true
ceph config set client.rgw.my-store rgw_sts_key "$(openssl rand -hex 16)"

# Create an IAM admin user
radosgw-admin user create \
  --uid=iam-admin \
  --display-name="IAM Admin" \
  --caps="roles=*;oidc-provider=*;user-policy=*"
```

## Step 2 - Register an OIDC Provider

Each external IdP needs to be registered as an OIDC provider in RGW:

```bash
# Get the OIDC thumbprint for your IdP
# For Okta:
OKTA_DOMAIN="dev-12345.okta.com"
THUMBPRINT=$(echo | openssl s_client -connect ${OKTA_DOMAIN}:443 \
  -servername ${OKTA_DOMAIN} 2>/dev/null | \
  openssl x509 -fingerprint -noout -sha1 | \
  awk -F= '{print $2}' | tr -d ':' | tr '[:upper:]' '[:lower:]')

# Register Okta as an OIDC provider
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam create-open-id-connect-provider \
  --url "https://${OKTA_DOMAIN}/oauth2/default" \
  --client-id-list "my-app-client-id" \
  --thumbprint-list "${THUMBPRINT}"

# List registered OIDC providers
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam list-open-id-connect-providers
```

## Step 3 - Create Federated IAM Roles

```bash
# Create a trust policy referencing the OIDC provider
cat > federated-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam:::oidc-provider/dev-12345.okta.com/oauth2/default"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "dev-12345.okta.com/oauth2/default:aud": "my-app-client-id"
        },
        "StringLike": {
          "dev-12345.okta.com/oauth2/default:sub": "*"
        }
      }
    }
  ]
}
EOF

# Create the role
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam create-role \
  --role-name federated-s3-user \
  --assume-role-policy-document file://federated-trust-policy.json

# Attach S3 permissions
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam put-role-policy \
  --role-name federated-s3-user \
  --policy-name S3Access \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Action":["s3:GetObject","s3:PutObject","s3:ListBucket"],
      "Resource":["arn:aws:s3:::user-data/*","arn:aws:s3:::user-data"]
    }]
  }'
```

## Step 4 - Implement the Federation Flow in an Application

```python
import requests
import boto3

class FederatedS3Client:
    def __init__(self, idp_token_url, client_id, client_secret, rgw_endpoint, role_arn):
        self.idp_token_url = idp_token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.rgw_endpoint = rgw_endpoint
        self.role_arn = role_arn

    def get_idp_token(self, username, password):
        resp = requests.post(self.idp_token_url, data={
            "grant_type": "password",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "username": username,
            "password": password,
            "scope": "openid"
        })
        return resp.json()["access_token"]

    def get_s3_client(self, jwt_token):
        sts = boto3.client("sts",
            endpoint_url=self.rgw_endpoint,
            aws_access_key_id="", aws_secret_access_key="")
        creds = sts.assume_role_with_web_identity(
            RoleArn=self.role_arn,
            RoleSessionName="federated-session",
            WebIdentityToken=jwt_token,
            DurationSeconds=3600
        )["Credentials"]
        return boto3.client("s3",
            endpoint_url=self.rgw_endpoint,
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"])
```

## Step 5 - Map JWT Claims to Roles

```bash
# Restrict role assumption to users with a specific group claim
cat > group-restricted-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam:::oidc-provider/dev-12345.okta.com/oauth2/default"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "dev-12345.okta.com/oauth2/default:aud": "my-app-client-id",
          "dev-12345.okta.com/oauth2/default:groups": "storage-users"
        }
      }
    }
  ]
}
EOF
```

## Step 6 - Test and Validate

```bash
# Verify the OIDC provider configuration
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "arn:aws:iam:::oidc-provider/dev-12345.okta.com/oauth2/default"

# Check RGW logs for federation activity
kubectl -n rook-ceph logs -l app=rook-ceph-rgw \
  | grep -i "web_identity\|oidc\|federat"
```

## Summary

Federated identity in Ceph RGW maps external JWT tokens from OIDC providers to IAM roles, granting temporary S3 access without requiring local user accounts. Registering OIDC providers, creating role trust policies with claim conditions, and using `AssumeRoleWithWebIdentity` forms the complete federation flow. JWT claim conditions like group membership enable role-based access control aligned with your IdP's group structure.
