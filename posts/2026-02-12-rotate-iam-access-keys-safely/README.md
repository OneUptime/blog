# How to Rotate IAM Access Keys Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security

Description: A practical guide to rotating IAM access keys without downtime, including automation scripts, detection of stale keys, and migration strategies.

---

IAM access keys are one of the most common attack vectors in AWS. They get committed to Git repos, shared in Slack messages, and left unrotated for years. Rotating them regularly limits the damage if a key gets compromised. But rotating access keys incorrectly can bring down your applications. Here's how to do it safely.

## Why Rotate Access Keys?

Long-lived credentials are a risk. The longer a key exists, the higher the chance it's been exposed somewhere - a developer's laptop, a CI/CD log, an old configuration file. Rotating keys limits the window of exposure.

Most security frameworks require key rotation every 90 days. AWS CIS Benchmark explicitly checks for this.

## The Safe Rotation Process

The key insight is that IAM users can have two active access keys simultaneously. This lets you create a new key, update your applications, verify everything works, and then delete the old key - all with zero downtime.

```mermaid
flowchart TD
    A[Create new access key] --> B[Update applications with new key]
    B --> C[Verify new key works]
    C --> D[Deactivate old key]
    D --> E[Wait and monitor]
    E --> F{Any issues?}
    F -->|Yes| G[Reactivate old key, investigate]
    F -->|No| H[Delete old key]
```

## Step 1: Check Current Keys

First, see what keys a user currently has:

```bash
# List access keys for a specific IAM user
aws iam list-access-keys --user-name deploy-bot
```

Output will show the key IDs, status, and creation dates:

```json
{
  "AccessKeyMetadata": [
    {
      "UserName": "deploy-bot",
      "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "Status": "Active",
      "CreateDate": "2025-06-15T10:00:00Z"
    }
  ]
}
```

## Step 2: Create a New Key

```bash
# Create a second access key for the user
aws iam create-access-key --user-name deploy-bot
```

This returns the new access key ID and secret. Save the secret immediately - you won't be able to retrieve it again.

```json
{
  "AccessKey": {
    "UserName": "deploy-bot",
    "AccessKeyId": "AKIAI44QH8DHBEXAMPLE",
    "Status": "Active",
    "SecretAccessKey": "je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY",
    "CreateDate": "2026-02-12T10:00:00Z"
  }
}
```

## Step 3: Update Your Applications

This is the part that requires care. Every system using the old key needs to be updated. Common places where access keys live:

- **Environment variables** in EC2 instances, ECS tasks, Lambda functions
- **AWS credentials files** (~/.aws/credentials)
- **CI/CD secrets** (GitHub Actions, GitLab CI, Jenkins)
- **Application configuration** (config files, parameter store, secrets manager)

For applications that read from AWS Secrets Manager, you can update the secret:

```bash
# Update the access key stored in Secrets Manager
aws secretsmanager update-secret \
  --secret-id prod/deploy-bot/aws-credentials \
  --secret-string '{
    "aws_access_key_id": "AKIAI44QH8DHBEXAMPLE",
    "aws_secret_access_key": "je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY"
  }'
```

## Step 4: Verify the New Key Works

Test the new credentials before touching the old key:

```bash
# Test the new credentials by making an API call
AWS_ACCESS_KEY_ID=AKIAI44QH8DHBEXAMPLE \
AWS_SECRET_ACCESS_KEY=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY \
aws sts get-caller-identity
```

Check your application logs for any authentication errors. Give it at least a few hours - some batch jobs might only run periodically.

## Step 5: Deactivate (Don't Delete) the Old Key

Deactivating is reversible. Deleting is not. Start with deactivation:

```bash
# Deactivate the old key (reversible, unlike deletion)
aws iam update-access-key \
  --user-name deploy-bot \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --status Inactive
```

## Step 6: Monitor and Wait

Leave the old key inactive for at least 7-14 days. Monitor for any access denied errors. If something breaks, you can reactivate instantly:

```bash
# Reactivate the old key if something breaks
aws iam update-access-key \
  --user-name deploy-bot \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --status Active
```

## Step 7: Delete the Old Key

Once you're confident nothing depends on the old key:

```bash
# Permanently delete the old access key
aws iam delete-access-key \
  --user-name deploy-bot \
  --access-key-id AKIAIOSFODNN7EXAMPLE
```

## Finding Stale Keys

Here's a script that identifies access keys older than 90 days across all users:

```python
import boto3
from datetime import datetime, timezone

# Find all IAM access keys older than the specified threshold
iam = boto3.client("iam")
max_age_days = 90

users = iam.list_users()["Users"]
stale_keys = []

for user in users:
    username = user["UserName"]
    keys = iam.list_access_keys(UserName=username)["AccessKeyMetadata"]

    for key in keys:
        if key["Status"] != "Active":
            continue

        age = (datetime.now(timezone.utc) - key["CreateDate"]).days

        if age > max_age_days:
            # Check when the key was last used
            last_used_info = iam.get_access_key_last_used(
                AccessKeyId=key["AccessKeyId"]
            )
            last_used = last_used_info["AccessKeyLastUsed"].get(
                "LastUsedDate", "Never"
            )

            stale_keys.append({
                "user": username,
                "key_id": key["AccessKeyId"],
                "age_days": age,
                "last_used": last_used
            })

print(f"\nFound {len(stale_keys)} stale access keys (>{max_age_days} days old):\n")
print(f"{'User':<25} {'Key ID':<22} {'Age':<10} {'Last Used'}")
print("-" * 80)

for key in sorted(stale_keys, key=lambda x: x["age_days"], reverse=True):
    print(f"{key['user']:<25} {key['key_id']:<22} {key['age_days']}d     {key['last_used']}")
```

## Automated Key Rotation with Lambda

For organizations with many service accounts, automate the rotation process:

```python
import boto3
import json
from datetime import datetime, timezone

def lambda_handler(event, context):
    """
    Automated access key rotation.
    Creates new key, stores in Secrets Manager, deactivates old key.
    A separate scheduled run deletes keys inactive for 14+ days.
    """
    iam = boto3.client("iam")
    secrets = boto3.client("secretsmanager")
    sns = boto3.client("sns")

    max_age_days = 85  # rotate 5 days before the 90-day limit
    notification_topic = "arn:aws:sns:us-east-1:123456789012:key-rotation-alerts"

    users = iam.list_users()["Users"]

    for user in users:
        username = user["UserName"]

        # Check user tags to find the linked secret
        tags = iam.list_user_tags(UserName=username)["Tags"]
        secret_name = next(
            (t["Value"] for t in tags if t["Key"] == "credentials-secret"),
            None
        )

        if not secret_name:
            continue  # skip users without managed secrets

        keys = iam.list_access_keys(UserName=username)["AccessKeyMetadata"]
        active_keys = [k for k in keys if k["Status"] == "Active"]

        for key in active_keys:
            age = (datetime.now(timezone.utc) - key["CreateDate"]).days

            if age < max_age_days:
                continue

            if len(active_keys) >= 2:
                print(f"User {username} already has 2 keys. Skipping.")
                continue

            # Create new key
            new_key = iam.create_access_key(UserName=username)["AccessKey"]

            # Store new key in Secrets Manager
            secrets.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps({
                    "aws_access_key_id": new_key["AccessKeyId"],
                    "aws_secret_access_key": new_key["SecretAccessKey"]
                })
            )

            # Deactivate old key
            iam.update_access_key(
                UserName=username,
                AccessKeyId=key["AccessKeyId"],
                Status="Inactive"
            )

            # Send notification
            sns.publish(
                TopicArn=notification_topic,
                Subject=f"Access Key Rotated: {username}",
                Message=f"Old key {key['AccessKeyId']} deactivated.\n"
                       f"New key {new_key['AccessKeyId']} created and "
                       f"stored in {secret_name}."
            )

            print(f"Rotated key for {username}")
```

## AWS Config Rule for Key Age

Set up a Config rule to flag keys older than 90 days:

```bash
# Create a Config rule that checks access key age
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "access-keys-rotated",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ACCESS_KEYS_ROTATED"
    },
    "InputParameters": "{\"maxAccessKeyAge\":\"90\"}"
  }'
```

## Better Alternative: Stop Using Access Keys

The best access key rotation strategy is eliminating access keys entirely. For most use cases, there's a better option:

- **EC2 instances**: Use instance profiles with IAM roles
- **ECS tasks**: Use task roles
- **Lambda functions**: Use execution roles
- **EKS pods**: Use IRSA (IAM Roles for Service Accounts)
- **CI/CD**: Use OIDC federation (GitHub Actions, GitLab CI both support this)
- **Human users**: Use [IAM Identity Center](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-iam-identity-center-sso/view)

Temporary credentials from IAM roles automatically rotate and expire. No manual rotation needed.

## Key Rotation Checklist

When rotating keys, go through this checklist:

1. Identify all systems using the key (check CloudTrail for `AccessKeyId`)
2. Create new key
3. Update all systems
4. Verify each system works with the new key
5. Deactivate (not delete) old key
6. Wait 14 days
7. Check CloudTrail for any failed auth with the old key ID
8. Delete old key

Taking shortcuts here leads to outages. Follow the process, every time.
