# How to Set Up SSO for Ceph RGW S3 Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, SSO, Authentication

Description: Learn how to set up Single Sign-On for Ceph RGW S3 access using an OIDC provider, enabling users to authenticate with corporate credentials.

---

## Overview

Single Sign-On (SSO) for Ceph RGW allows users and applications to access S3 storage using their existing corporate identity, without managing separate S3 credentials. The implementation combines RGW's STS `AssumeRoleWithWebIdentity` endpoint with an OIDC provider such as Keycloak, Okta, or Azure AD.

## Step 1 - Configure Your OIDC Provider

Register Ceph RGW as a client in your OIDC provider. Example for Keycloak:

```bash
# Create a confidential client in Keycloak
curl -X POST "https://keycloak.example.com/auth/admin/realms/myrealm/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "ceph-s3-sso",
    "protocol": "openid-connect",
    "enabled": true,
    "publicClient": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "redirectUris": ["http://localhost:8080/callback"],
    "webOrigins": ["*"]
  }'
```

## Step 2 - Enable STS in RGW

```bash
# Configure STS on the RGW instance
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set \
  client.rgw.my-store rgw_s3_auth_use_sts true
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set \
  client.rgw.my-store rgw_sts_key "$(openssl rand -hex 16)"

# Create IAM admin user
radosgw-admin user create \
  --uid=iam-admin \
  --display-name="IAM Admin" \
  --caps="roles=*;oidc-provider=*;user-policy=*"
```

## Step 3 - Register the OIDC Provider and Create Roles

```bash
# Register Keycloak as an OIDC provider
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam create-open-id-connect-provider \
  --url "https://keycloak.example.com/auth/realms/myrealm" \
  --client-id-list "ceph-s3-sso" \
  --thumbprint-list "$(openssl s_client -connect keycloak.example.com:443 </dev/null 2>/dev/null | openssl x509 -fingerprint -sha1 -noout | cut -d= -f2 | tr -d ':' | tr A-Z a-z)"

# Create an SSO role for authenticated users
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam create-role \
  --role-name sso-s3-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{
        "Federated":"arn:aws:iam:::oidc-provider/keycloak.example.com/auth/realms/myrealm"
      },
      "Action":"sts:AssumeRoleWithWebIdentity",
      "Condition":{
        "StringEquals":{
          "keycloak.example.com/auth/realms/myrealm:aud":"ceph-s3-sso"
        }
      }
    }]
  }'

# Attach S3 access policy
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam put-role-policy \
  --role-name sso-s3-role \
  --policy-name s3-access \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:*","Resource":"*"}]}'
```

## Step 4 - Build a Web-Based SSO Login Flow

```python
from flask import Flask, redirect, request, session
import requests
import boto3
import urllib.parse

app = Flask(__name__)
app.secret_key = "flask-secret"

KEYCLOAK_URL = "https://keycloak.example.com/auth/realms/myrealm"
CLIENT_ID = "ceph-s3-sso"
CLIENT_SECRET = "your-client-secret"
RGW_URL = "http://rgw.example.com:7480"
ROLE_ARN = "arn:aws:iam:::role/sso-s3-role"

@app.route("/login")
def login():
    auth_url = (
        f"{KEYCLOAK_URL}/protocol/openid-connect/auth"
        f"?client_id={CLIENT_ID}&response_type=code"
        f"&redirect_uri=http://localhost:5000/callback"
        f"&scope=openid"
    )
    return redirect(auth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    token_resp = requests.post(f"{KEYCLOAK_URL}/protocol/openid-connect/token", data={
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": "http://localhost:5000/callback"
    })
    jwt_token = token_resp.json()["id_token"]

    sts = boto3.client("sts", endpoint_url=RGW_URL,
        aws_access_key_id="", aws_secret_access_key="")
    creds = sts.assume_role_with_web_identity(
        RoleArn=ROLE_ARN,
        RoleSessionName="sso-session",
        WebIdentityToken=jwt_token
    )["Credentials"]

    session["s3_creds"] = {
        "AccessKeyId": creds["AccessKeyId"],
        "SecretAccessKey": creds["SecretAccessKey"],
        "SessionToken": creds["SessionToken"]
    }
    return redirect("/buckets")
```

## Step 5 - Configure the Ceph Dashboard for SSO

For the Ceph Dashboard SSO, use SAML:

```bash
# Enable SSO on the Ceph dashboard
ceph dashboard sso setup saml2 \
  https://dashboard.example.com \
  "https://keycloak.example.com/auth/realms/myrealm/protocol/saml/descriptor" \
  username
ceph dashboard sso enable saml2
```

## Step 6 - Test the SSO Flow

```bash
# Verify OIDC provider is registered
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam list-open-id-connect-providers

# Test token exchange manually
JWT=$(curl -s -X POST "${KEYCLOAK_URL}/protocol/openid-connect/token" \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials&scope=openid" \
  | jq -r '.access_token')

aws --endpoint-url http://rgw.example.com:7480 \
  sts assume-role-with-web-identity \
  --role-arn "${ROLE_ARN}" \
  --role-session-name test \
  --web-identity-token "${JWT}"
```

## Summary

SSO for Ceph RGW S3 access combines OIDC identity federation with RGW's STS `AssumeRoleWithWebIdentity` endpoint. Users authenticate with their corporate IdP, receive a JWT, and exchange it for temporary S3 credentials scoped to an IAM role. This eliminates the need to distribute long-lived S3 access keys and integrates Ceph storage into your organization's existing identity management system.
