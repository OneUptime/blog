# How to Use AWS STS Temporary Credentials in Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, STS, Security

Description: Learn how to use AWS Security Token Service to generate and manage temporary credentials in your applications for improved security and access control.

---

Long-lived access keys are one of the biggest security risks in AWS. They sit in config files, environment variables, and CI/CD pipelines indefinitely. If they leak, an attacker has access until someone notices and revokes them. AWS Security Token Service (STS) solves this by issuing temporary credentials that automatically expire - typically after an hour or so.

This guide shows you how to use STS in your applications, from basic assume-role patterns to advanced federation scenarios.

## What STS Does

STS issues temporary security credentials consisting of three parts:

1. **Access Key ID** (starts with "ASIA" instead of "AKIA" for permanent keys)
2. **Secret Access Key**
3. **Session Token** (this is the extra piece that makes them temporary)

These credentials work exactly like regular access keys but expire automatically. No rotation needed, no cleanup required.

## Common STS Operations

STS provides several operations, each for a different use case:

| Operation | Use Case |
|-----------|----------|
| `AssumeRole` | Cross-account access, service-to-service auth |
| `AssumeRoleWithSAML` | Federated access via SAML IdP |
| `AssumeRoleWithWebIdentity` | Federation via web identity (Google, Facebook, Cognito) |
| `GetSessionToken` | Add MFA to existing IAM user credentials |
| `GetFederationToken` | Custom federated access for non-AWS users |
| `GetCallerIdentity` | Check who you are (debugging) |

## AssumeRole: The Most Common Pattern

`AssumeRole` is what you'll use most. Your application assumes an IAM role and gets temporary credentials scoped to that role's permissions.

### Setting Up the Role

First, create a role with a trust policy that allows your application to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/MyAppRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-123"
        }
      }
    }
  ]
}
```

The `ExternalId` is a shared secret that prevents the "confused deputy" problem. Always use it for cross-account roles.

### Using AssumeRole in Python

```python
import boto3

def get_assumed_credentials(role_arn, session_name, external_id=None):
    """
    Assume an IAM role and return temporary credentials.
    """
    sts = boto3.client("sts")

    params = {
        "RoleArn": role_arn,
        "RoleSessionName": session_name,
        "DurationSeconds": 3600  # 1 hour (max 12 hours for user-assumed roles)
    }

    if external_id:
        params["ExternalId"] = external_id

    response = sts.assume_role(**params)

    return response["Credentials"]


def create_client_with_role(service, role_arn, session_name):
    """
    Create a boto3 client using assumed role credentials.
    """
    creds = get_assumed_credentials(role_arn, session_name)

    return boto3.client(
        service,
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"]
    )


# Example: Access S3 in another account using assumed role
s3 = create_client_with_role(
    "s3",
    "arn:aws:iam::987654321098:role/S3ReadRole",
    "my-app-session"
)

buckets = s3.list_buckets()
for bucket in buckets["Buckets"]:
    print(bucket["Name"])
```

### Using AssumeRole in Node.js

```javascript
const { STSClient, AssumeRoleCommand } = require("@aws-sdk/client-sts");
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

async function getAssumedCredentials(roleArn, sessionName) {
  // Create STS client and assume the role
  const sts = new STSClient({ region: "us-east-1" });

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    DurationSeconds: 3600,
  });

  const response = await sts.send(command);
  return response.Credentials;
}

async function main() {
  const creds = await getAssumedCredentials(
    "arn:aws:iam::987654321098:role/S3ReadRole",
    "my-app-session"
  );

  // Create S3 client with temporary credentials
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
    },
  });

  const buckets = await s3.send(new ListBucketsCommand({}));
  console.log(buckets.Buckets.map((b) => b.Name));
}

main();
```

### Using AssumeRole in Go

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials/stscreds"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/sts"
)

func main() {
    // Load default config
    cfg, err := config.LoadDefaultConfig(context.TODO(),
        config.WithRegion("us-east-1"),
    )
    if err != nil {
        log.Fatal(err)
    }

    // Create STS client and assume role
    stsClient := sts.NewFromConfig(cfg)
    roleArn := "arn:aws:iam::987654321098:role/S3ReadRole"

    provider := stscreds.NewAssumeRoleProvider(stsClient, roleArn, func(o *stscreds.AssumeRoleOptions) {
        o.RoleSessionName = "my-app-session"
    })

    cfg.Credentials = provider

    // Use the assumed-role credentials for S3
    s3Client := s3.NewFromConfig(cfg)
    output, err := s3Client.ListBuckets(context.TODO(), &s3.ListBucketsInput{})
    if err != nil {
        log.Fatal(err)
    }

    for _, bucket := range output.Buckets {
        fmt.Println(*bucket.Name)
    }
}
```

## Credential Refresh

Temporary credentials expire. Your application needs to handle renewal. The AWS SDKs handle this automatically when you use credential providers:

```python
import boto3
from botocore.credentials import RefreshableCredentials, DeferredRefreshableCredentials

# The simplest approach: use the SDK's built-in role assumption
# boto3 automatically refreshes credentials when they're about to expire
session = boto3.Session()
sts = session.client("sts")

# This creates a session that auto-refreshes
assumed_role = sts.assume_role(
    RoleArn="arn:aws:iam::987654321098:role/MyRole",
    RoleSessionName="auto-refresh"
)

# Better approach: use a credential provider in your AWS config
# ~/.aws/config:
# [profile cross-account]
# role_arn = arn:aws:iam::987654321098:role/MyRole
# source_profile = default

# Then simply:
session = boto3.Session(profile_name="cross-account")
s3 = session.client("s3")  # credentials auto-refresh
```

## GetSessionToken: Adding MFA to CLI Sessions

When you need MFA-authenticated temporary credentials:

```bash
# Get temporary credentials with MFA
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/my-device \
  --token-code 123456 \
  --duration-seconds 43200

# Use the returned credentials
export AWS_ACCESS_KEY_ID="ASIAEXAMPLE"
export AWS_SECRET_ACCESS_KEY="secretexample"
export AWS_SESSION_TOKEN="tokenexample"
```

Check our guide on [enforcing MFA for IAM users](https://oneuptime.com/blog/post/enable-enforce-mfa-iam-users/view) for the policy side of this.

## AssumeRoleWithWebIdentity: For EKS and Mobile Apps

This is used when your application authenticates with a web identity provider (like Cognito, Google, or GitHub):

```python
import boto3

# Common in EKS pods using IRSA (IAM Roles for Service Accounts)
# The web identity token is injected by the EKS pod identity webhook
sts = boto3.client("sts")

with open("/var/run/secrets/eks.amazonaws.com/serviceaccount/token") as f:
    web_identity_token = f.read()

response = sts.assume_role_with_web_identity(
    RoleArn="arn:aws:iam::123456789012:role/EKSPodRole",
    RoleSessionName="eks-pod",
    WebIdentityToken=web_identity_token,
    DurationSeconds=3600
)

# In practice, the EKS SDK handles this automatically
# Just configure the service account annotation:
# eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/EKSPodRole
```

## GetCallerIdentity: Debugging

When you're not sure which credentials your application is using:

```bash
# Check who you currently are
aws sts get-caller-identity
```

This returns:

```json
{
  "UserId": "AROA3XFRBF23XFEXAMPLE:my-session",
  "Account": "123456789012",
  "Arn": "arn:aws:sts::123456789012:assumed-role/MyRole/my-session"
}
```

Use this in your application startup to verify credentials:

```python
import boto3

# Verify credentials at application startup
def verify_identity():
    sts = boto3.client("sts")
    identity = sts.get_caller_identity()
    print(f"Running as: {identity['Arn']}")
    print(f"Account: {identity['Account']}")
    return identity

verify_identity()
```

## Best Practices

1. **Prefer roles over access keys** - Use EC2 instance profiles, ECS task roles, Lambda execution roles
2. **Keep session durations short** - 1 hour is the default and usually sufficient
3. **Use ExternalId for cross-account roles** - Prevents confused deputy attacks
4. **Log role assumption** - CloudTrail records all `AssumeRole` calls
5. **Scope role permissions tightly** - Temporary doesn't mean unlimited
6. **Handle credential expiration gracefully** - Use SDK credential providers that auto-refresh

STS is the backbone of secure AWS authentication. Every time you use an EC2 instance profile, an ECS task role, or sign in through SSO, STS is generating those temporary credentials behind the scenes. Understanding how it works gives you the tools to build more secure applications.
