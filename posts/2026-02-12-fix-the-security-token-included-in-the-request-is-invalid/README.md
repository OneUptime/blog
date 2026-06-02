# How to Fix 'The security token included in the request is invalid'

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Troubleshooting, Credential

Description: Resolve the 'security token included in the request is invalid' error in AWS by identifying expired tokens, misconfigured credentials, and region mismatches.

---

This error is frustrating because it tells you almost nothing about what's actually wrong. You've got credentials configured, but AWS is rejecting the security token. The cause could be expired temporary credentials, a deleted access key, a copy-paste error, or something more subtle.

Let's go through each possible cause and fix it.

## What This Error Means

The full error usually looks like this:

```text
An error occurred (InvalidClientTokenId) when calling the [Operation] operation:
The security token included in the request is invalid.
```

Or sometimes:

```text
An error occurred (UnrecognizedClientException) when calling the [Operation] operation:
The security token included in the request is invalid.
```

It means AWS received your request but couldn't validate the credentials. This is different from "Unable to locate credentials" - in this case, credentials were found but they're not valid.

## Cause 1: Expired Temporary Credentials

If you're using temporary credentials (from STS, SSO, or assume-role), they expire. AssumeRole credentials last 1 hour by default and can last up to 12 hours depending on the role configuration. GetSessionToken credentials can last up to 36 hours for IAM users, but only up to 1 hour when requested with root account credentials.

Check if your credentials are temporary.

```bash
# If AWS_SESSION_TOKEN is set, you're using temporary credentials

echo $AWS_SESSION_TOKEN

# Check who the CLI thinks you are
aws sts get-caller-identity
```

To fix this, refresh your credentials.

```bash
# For SSO
aws sso login --profile your-profile

# For assumed roles, re-assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/your-role \
  --role-session-name my-session

# For MFA-based sessions
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/your-device \
  --token-code 123456
```

See also our dedicated guide on [fixing ExpiredTokenException errors](https://oneuptime.com/blog/post/2026-02-12-fix-an-error-occurred-expiredtokenexception-in-aws/view).

## Cause 2: Deleted or Deactivated Access Key

Someone (maybe you, maybe an admin) deleted or deactivated the access key you're using.

```bash
# Check the status of your access keys
aws iam list-access-keys --user-name your-username

# Look for Status: "Inactive" or check if the key ID matches what you're using
```

If the key was deactivated, either reactivate it or create a new one.

```bash
# Reactivate (if you have permission)
aws iam update-access-key \
  --user-name your-username \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --status Active

# Or create a new key
aws iam create-access-key --user-name your-username
```

Then update your local credentials.

```bash
aws configure
```

## Cause 3: Copy-Paste Errors

This is more common than you'd think. When copying access keys, it's easy to accidentally include:
- Leading or trailing whitespace
- Missing characters (the key got truncated)
- Extra characters (like a newline)
- Mixing up the access key ID and secret access key

Verify your credentials file doesn't have hidden characters.

```bash
# Check for whitespace issues
cat -A ~/.aws/credentials
```

The output should show `$` at the end of each line (which is normal). Watch for extra `^I` (tabs) or `^M` (carriage returns) characters.

```bash
# If you see issues, recreate the credentials file
aws configure
```

## Cause 4: Wrong Region for the Service

Some services are region-specific, and using the wrong region can cause authentication or endpoint errors. STS in particular can be tricky if you're mixing global and regional endpoints or working with opt-in Regions.

```bash
# Check your configured region
aws configure get region

# Try explicitly setting the region
aws s3 ls --region us-east-1
```

AWS recommends using regional STS endpoints when possible. Session tokens from regional STS endpoints are valid in all AWS Regions. Tokens from the global STS endpoint can be limited to Regions enabled by default, depending on your account's global endpoint token compatibility setting.

```python
import boto3

# Use the regional STS endpoint for the Region your application is configured for
sts = boto3.client('sts', region_name='us-west-2')
```

## Cause 5: Conflicting Credential Sources

If you have credentials in multiple places, they can conflict. For example, expired temporary credentials in environment variables can override valid credentials in your credentials file.

```bash
# Check all credential sources
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:+[SET]}"
echo "AWS_SESSION_TOKEN: ${AWS_SESSION_TOKEN:+[SET]}"
echo "AWS_PROFILE: $AWS_PROFILE"

# Clear environment variables to test
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

# Now try the command again
aws sts get-caller-identity
```

If it works after clearing the environment variables, the problem was stale values there.

## Cause 6: Clock Skew

AWS validates that requests are made within 5 minutes of the server's clock. If your system clock is off by more than that, credential validation fails.

```bash
# Check your system time
date -u

# Compare with a reliable time source
# If there's more than a few minutes difference, sync your clock

# On Linux
sudo ntpdate pool.ntp.org
# or
sudo timedatectl set-ntp true

# On macOS
sudo sntp -sS pool.ntp.org
```

This is especially common in virtual machines and Docker containers that have been suspended and resumed.

## Cause 7: Using Root Credentials or Root-Based Sessions

If you're using root account credentials, switch to an IAM user or role. Root access keys are strongly discouraged, and temporary credentials created from root account credentials have root permissions. Those root-based GetSessionToken credentials are limited to 1 hour and can't call most STS operations.

```bash
# Check if you're using root credentials
aws sts get-caller-identity

# If the ARN shows "root", switch to an IAM user or role
# Root: arn:aws:iam::123456789012:root
# IAM user: arn:aws:iam::123456789012:user/username
```

## Cause 8: AWS SDK Credential Caching

Some AWS SDKs cache credentials. If a credential was valid when cached but has since been rotated or revoked, the cached version will fail.

```python
# In Python, create a fresh session so Boto3 re-runs credential resolution
import boto3

session = boto3.Session()
credentials = session.get_credentials()

# Or create a fresh session
session = boto3.Session(
    aws_access_key_id='NEW_KEY',
    aws_secret_access_key='NEW_SECRET',
    aws_session_token='NEW_SESSION_TOKEN'  # Include this for temporary credentials
)
```

## Debugging Steps

If none of the above fixes work, here's a systematic debugging approach.

```bash
# Step 1: See exactly which credentials the CLI is using
aws sts get-caller-identity --debug 2>&1 | head -50

# Step 2: Check the credentials being sent
aws sts get-caller-identity --debug 2>&1 | grep "AccessKeyId"

# Step 3: Verify the key is still active in IAM
aws iam list-access-keys --user-name YOUR_USERNAME

# Step 4: Test with explicit credentials
AWS_ACCESS_KEY_ID="YOUR_KEY" AWS_SECRET_ACCESS_KEY="YOUR_SECRET" \
  aws sts get-caller-identity
```

## Summary

The "security token is invalid" error is a catch-all for credential problems. Work through the causes systematically: check for expiration, verify the key still exists and is active, look for copy-paste errors, clear conflicting environment variables, and check your system clock. The `--debug` flag and `sts get-caller-identity` are your best friends for diagnosing this issue. Most of the time, it's expired temporary credentials or a key that was rotated without updating the local configuration.
