# How to Build Vault AWS Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Vault, Security, AWS, DynamicSecrets

Description: Generate short-lived AWS credentials on demand using HashiCorp Vault's AWS secrets engine for secure, auditable cloud access.

---

Static AWS credentials are a security liability. They sit in config files, get committed to repositories, and live forever until someone remembers to rotate them. HashiCorp Vault's AWS secrets engine solves this by generating dynamic, short-lived credentials on demand.

## How Vault AWS Credentials Work

Vault acts as a broker between your applications and AWS IAM. Instead of distributing long-lived access keys, Vault generates temporary credentials with automatic expiration.

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Server
    participant AWS as AWS IAM/STS

    App->>Vault: Request AWS credentials
    Vault->>Vault: Authenticate and authorize
    Vault->>AWS: Create IAM user or assume role
    AWS-->>Vault: Return credentials
    Vault-->>App: Return time-limited credentials
    Note over App: Use credentials for AWS API calls
    App->>AWS: Make API calls with credentials
    Note over Vault: Lease expires
    Vault->>AWS: Revoke credentials
```

## Prerequisites

Before configuring the AWS secrets engine, you need:

- A running Vault server (version 1.0+)
- AWS IAM user with permissions to create other IAM users or assume roles
- Vault CLI installed and authenticated

```bash
# Verify Vault is accessible
vault status

# Authenticate to Vault (example using token)
export VAULT_ADDR='https://vault.example.com:8200'
vault login
```

## Enable the AWS Secrets Engine

The AWS secrets engine is not enabled by default. Enable it at a specific path.

```bash
# Enable AWS secrets engine at the default 'aws' path
vault secrets enable aws

# Or enable at a custom path for multiple AWS accounts
vault secrets enable -path=aws-production aws
vault secrets enable -path=aws-staging aws
```

## Configure Root Credentials

Vault needs AWS credentials to manage IAM resources. These are the "root" credentials Vault uses to create dynamic credentials for your applications.

### Option 1: Static IAM User Credentials

Create an IAM user for Vault with appropriate permissions.

```bash
# Configure Vault with IAM user credentials
vault write aws/config/root \
    access_key=AKIAIOSFODNN7EXAMPLE \
    secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
    region=us-east-1
```

The IAM user needs these permissions for creating IAM users:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateUser",
                "iam:DeleteUser",
                "iam:CreateAccessKey",
                "iam:DeleteAccessKey",
                "iam:AttachUserPolicy",
                "iam:DetachUserPolicy",
                "iam:ListAttachedUserPolicies",
                "iam:ListAccessKeys",
                "iam:PutUserPolicy",
                "iam:DeleteUserPolicy",
                "iam:ListUserPolicies"
            ],
            "Resource": "arn:aws:iam::123456789012:user/vault-*"
        }
    ]
}
```

For STS assume role functionality, add:

```json
{
    "Effect": "Allow",
    "Action": [
        "sts:AssumeRole"
    ],
    "Resource": "arn:aws:iam::*:role/vault-*"
}
```

### Option 2: IAM Instance Profile (Recommended for EC2/EKS)

If Vault runs on EC2 or EKS, use the instance profile instead of static credentials.

```bash
# Configure without explicit credentials (uses instance profile)
vault write aws/config/root \
    region=us-east-1
```

This approach eliminates the need to store any AWS credentials in Vault itself.

## Credential Types

Vault supports three types of AWS credentials, each suited for different use cases.

```mermaid
flowchart LR
    subgraph Types["Credential Types"]
        A[IAM User] --> A1[Long-lived users]
        A1 --> A2[Vault manages lifecycle]

        B[Assumed Role] --> B1[STS credentials]
        B1 --> B2[Cross-account access]

        C[Federation Token] --> C1[STS credentials]
        C1 --> C2[Same-account only]
    end
```

### Type 1: IAM User Credentials

Vault creates a real IAM user in AWS and generates access keys.

```bash
# Create a role that generates IAM user credentials
vault write aws/roles/my-app-role \
    credential_type=iam_user \
    policy_document=-<<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::my-app-bucket/*"
        }
    ]
}
EOF
```

Or reference existing IAM policies:

```bash
# Use existing managed policies
vault write aws/roles/readonly-role \
    credential_type=iam_user \
    policy_arns=arn:aws:iam::aws:policy/ReadOnlyAccess
```

Generate credentials:

```bash
# Request credentials from the role
vault read aws/creds/my-app-role
```

Output:

```
Key                Value
---                -----
lease_id           aws/creds/my-app-role/abcd1234
lease_duration     768h
lease_renewable    true
access_key         AKIAIOSFODNN7EXAMPLE
secret_key         wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
security_token     <nil>
```

### Type 2: Assumed Role Credentials (STS)

Vault assumes an IAM role and returns temporary STS credentials. This is the recommended approach for most use cases.

First, create an IAM role in AWS with a trust policy allowing Vault to assume it:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::123456789012:user/vault-user"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

Configure the Vault role:

```bash
# Create a role that assumes an AWS role
vault write aws/roles/deploy-role \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/deploy-role \
    default_sts_ttl=1h \
    max_sts_ttl=4h
```

Generate credentials:

```bash
# Request STS credentials
vault read aws/creds/deploy-role
```

Output includes a session token:

```
Key                Value
---                -----
lease_id           aws/creds/deploy-role/xyz789
lease_duration     1h
lease_renewable    false
access_key         ASIAIOSFODNN7EXAMPLE
secret_key         wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
security_token     FwoGZXIvYXdzEBY...
```

### Type 3: Federation Token

Federation tokens are simpler but have limitations. They cannot call IAM or STS APIs and only work within the same account.

```bash
# Create a federation token role
vault write aws/roles/read-only \
    credential_type=federation_token \
    policy_document=-<<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "s3:List*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
```

## Cross-Account Access with STS

A common pattern is accessing resources in multiple AWS accounts from a single Vault instance.

```mermaid
flowchart TB
    subgraph Central["Central Account (111111111111)"]
        Vault[Vault Server]
        VaultUser[Vault IAM User]
    end

    subgraph Prod["Production Account (222222222222)"]
        ProdRole[Production Role]
        ProdResources[EC2, S3, RDS]
    end

    subgraph Dev["Development Account (333333333333)"]
        DevRole[Development Role]
        DevResources[EC2, S3, RDS]
    end

    Vault --> VaultUser
    VaultUser -->|AssumeRole| ProdRole
    VaultUser -->|AssumeRole| DevRole
    ProdRole --> ProdResources
    DevRole --> DevResources
```

### Configure Trust Relationships

In each target account, create a role with a trust policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::111111111111:user/vault-user"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": "vault-cross-account"
                }
            }
        }
    ]
}
```

### Configure Vault Roles for Each Account

```bash
# Production account role
vault write aws/roles/prod-admin \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::222222222222:role/vault-admin \
    external_id=vault-cross-account \
    default_sts_ttl=1h \
    max_sts_ttl=4h

# Development account role
vault write aws/roles/dev-admin \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::333333333333:role/vault-admin \
    external_id=vault-cross-account \
    default_sts_ttl=2h \
    max_sts_ttl=8h
```

## Lease Management and Rotation

Vault tracks every generated credential with a lease. Understanding leases is critical for credential lifecycle management.

### View Active Leases

```bash
# List all leases for AWS secrets engine
vault list sys/leases/lookup/aws/creds/my-app-role

# Get details about a specific lease
vault write sys/leases/lookup \
    lease_id=aws/creds/my-app-role/abcd1234
```

### Renew a Lease

Extend the TTL of credentials before they expire (only works with IAM user credentials).

```bash
# Renew a lease for another hour
vault lease renew -increment=1h aws/creds/my-app-role/abcd1234
```

### Revoke Credentials

Immediately invalidate credentials when they are no longer needed.

```bash
# Revoke a specific lease
vault lease revoke aws/creds/my-app-role/abcd1234

# Revoke all credentials for a role
vault lease revoke -prefix aws/creds/my-app-role

# Revoke all AWS credentials
vault lease revoke -prefix aws/creds
```

### Configure Default Lease Duration

Set appropriate TTLs based on your security requirements.

```bash
# Configure lease settings for IAM user roles
vault write aws/config/lease \
    lease=30m \
    lease_max=1h
```

For STS credentials, set TTL at the role level:

```bash
vault write aws/roles/short-lived-role \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/app-role \
    default_sts_ttl=15m \
    max_sts_ttl=1h
```

## Practical Application Examples

### Example 1: Kubernetes Application with Vault Agent

Use Vault Agent to automatically inject AWS credentials into a Kubernetes pod.

```yaml
# Deployment with Vault Agent sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-app"
        # Inject AWS credentials as environment file
        vault.hashicorp.com/agent-inject-secret-aws: "aws/creds/my-app-role"
        vault.hashicorp.com/agent-inject-template-aws: |
          {{- with secret "aws/creds/my-app-role" -}}
          export AWS_ACCESS_KEY_ID="{{ .Data.access_key }}"
          export AWS_SECRET_ACCESS_KEY="{{ .Data.secret_key }}"
          {{ if .Data.security_token }}
          export AWS_SESSION_TOKEN="{{ .Data.security_token }}"
          {{ end }}
          {{- end -}}
    spec:
      serviceAccountName: my-app
      containers:
        - name: app
          image: my-app:latest
          command: ["/bin/sh", "-c"]
          args:
            - source /vault/secrets/aws && ./my-app
```

### Example 2: CI/CD Pipeline Script

Generate credentials for a deployment pipeline.

```bash
#!/bin/bash
# deploy.sh - Generate AWS credentials and deploy

set -e

# Authenticate to Vault using CI/CD token
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="$CI_VAULT_TOKEN"

# Get AWS credentials from Vault
echo "Fetching AWS credentials from Vault..."
CREDS=$(vault read -format=json aws/creds/deploy-role)

# Export credentials as environment variables
export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.data.access_key')
export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.data.secret_key')
export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.data.security_token')

# Store lease ID for cleanup
LEASE_ID=$(echo $CREDS | jq -r '.lease_id')

# Cleanup function to revoke credentials
cleanup() {
    echo "Revoking AWS credentials..."
    vault lease revoke "$LEASE_ID" || true
}
trap cleanup EXIT

# Run deployment
echo "Deploying to AWS..."
aws s3 sync ./dist s3://my-deployment-bucket/
aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"

echo "Deployment complete!"
```

### Example 3: Python Application

Fetch credentials programmatically using the Vault Python client.

```python
#!/usr/bin/env python3
"""
Fetch dynamic AWS credentials from Vault.
"""

import hvac
import boto3
import os

def get_vault_client():
    """Initialize Vault client with authentication."""
    client = hvac.Client(
        url=os.environ.get('VAULT_ADDR', 'https://vault.example.com:8200')
    )

    # Authenticate using AppRole (recommended for applications)
    role_id = os.environ['VAULT_ROLE_ID']
    secret_id = os.environ['VAULT_SECRET_ID']

    client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )

    return client

def get_aws_credentials(vault_client, role_name):
    """Fetch AWS credentials from Vault AWS secrets engine."""
    # Read credentials from Vault
    response = vault_client.secrets.aws.generate_credentials(
        name=role_name
    )

    return {
        'access_key': response['data']['access_key'],
        'secret_key': response['data']['secret_key'],
        'session_token': response['data'].get('security_token'),
        'lease_id': response['lease_id'],
        'lease_duration': response['lease_duration']
    }

def create_boto3_session(credentials):
    """Create a boto3 session with Vault-provided credentials."""
    return boto3.Session(
        aws_access_key_id=credentials['access_key'],
        aws_secret_access_key=credentials['secret_key'],
        aws_session_token=credentials['session_token']
    )

def main():
    # Initialize Vault client
    vault = get_vault_client()

    # Get dynamic AWS credentials
    creds = get_aws_credentials(vault, 's3-read-role')
    print(f"Credentials valid for {creds['lease_duration']} seconds")

    # Use credentials with boto3
    session = create_boto3_session(creds)
    s3 = session.client('s3')

    # List buckets
    response = s3.list_buckets()
    for bucket in response['Buckets']:
        print(f"Bucket: {bucket['Name']}")

    # Revoke credentials when done
    vault.sys.revoke_lease(creds['lease_id'])
    print("Credentials revoked")

if __name__ == '__main__':
    main()
```

### Example 4: Terraform with Vault Provider

Use Vault-generated credentials in Terraform.

```hcl
# Configure Vault provider
provider "vault" {
  address = "https://vault.example.com:8200"
}

# Fetch AWS credentials from Vault
data "vault_aws_access_credentials" "creds" {
  backend = "aws"
  role    = "terraform-role"
  type    = "sts"
}

# Configure AWS provider with dynamic credentials
provider "aws" {
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.creds.access_key
  secret_key = data.vault_aws_access_credentials.creds.secret_key
  token      = data.vault_aws_access_credentials.creds.security_token
}

# Now use AWS resources as normal
resource "aws_s3_bucket" "example" {
  bucket = "my-terraform-bucket"
}
```

## Security Best Practices

### 1. Use Assumed Role Over IAM User

STS credentials (assumed_role) are preferred because:
- Shorter default TTL
- Cannot be renewed (forces regular rotation)
- No persistent IAM user to manage
- Works with cross-account access

### 2. Apply Least Privilege Policies

```bash
# Bad: Overly permissive
vault write aws/roles/bad-role \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/AdminRole

# Good: Specific permissions
vault write aws/roles/good-role \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/S3ReadOnlyRole
```

### 3. Set Short TTLs

```bash
# Set aggressive TTLs
vault write aws/roles/short-lived \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/app-role \
    default_sts_ttl=15m \
    max_sts_ttl=30m
```

### 4. Enable Audit Logging

```bash
# Enable file audit log
vault audit enable file file_path=/var/log/vault/audit.log

# Every credential request is logged
# {
#   "type": "request",
#   "auth": { "policies": ["app-policy"] },
#   "request": {
#     "path": "aws/creds/my-role",
#     "operation": "read"
#   }
# }
```

### 5. Use Vault Policies for Authorization

```hcl
# policy: aws-app-policy.hcl
# Allow reading only specific AWS roles
path "aws/creds/app-s3-role" {
  capabilities = ["read"]
}

path "aws/creds/app-dynamo-role" {
  capabilities = ["read"]
}

# Deny access to admin roles
path "aws/creds/admin-*" {
  capabilities = ["deny"]
}
```

Apply the policy:

```bash
vault policy write aws-app aws-app-policy.hcl
```

## Troubleshooting

### Credentials Not Working

Check if the credentials were created properly:

```bash
# Test the credentials immediately after generation
vault read aws/creds/my-role

# Export and test with AWS CLI
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

aws sts get-caller-identity
```

### Permission Denied Errors

Verify the Vault root credentials have sufficient permissions:

```bash
# Check the configured root credentials (shows access key only)
vault read aws/config/root

# Test by generating credentials manually
vault read aws/creds/test-role
```

### STS Token Errors

Ensure your role configuration matches the AWS IAM role:

```bash
# Verify the role configuration
vault read aws/roles/my-role

# Common issues:
# - External ID mismatch
# - Role ARN typo
# - Trust policy not configured
```

---

Dynamic AWS credentials eliminate the risk of long-lived access keys. Vault generates credentials on demand, enforces TTLs, and provides a complete audit trail. Start with assumed_role credentials for new applications and migrate existing workloads away from static keys.
