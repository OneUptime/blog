# How to Fix 'Unable to Locate Credentials' in AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, Troubleshooting, IAM, Credentials

Description: Diagnose and fix the 'Unable to locate credentials' error in AWS CLI by checking credential configuration, environment variables, IAM roles, and common misconfigurations.

---

You run an AWS CLI command and get hit with this:

```
Unable to locate credentials. You can configure credentials by running "aws configure".
```

It's one of the most common AWS errors, and it means the CLI can't find any credentials to authenticate your request. The fix depends on how you're running the CLI - local machine, EC2, Lambda, Docker container, or CI/CD pipeline. Let's work through each scenario.

## How AWS CLI Finds Credentials

Before fixing the problem, it helps to understand the credential chain. The AWS CLI checks for credentials in this order:

1. **Command line options** - `--profile` flag
2. **Environment variables** - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
3. **Shared credentials file** - `~/.aws/credentials`
4. **Shared config file** - `~/.aws/config`
5. **Container credentials** - ECS task role (if running in a container)
6. **Instance profile** - EC2 instance IAM role
7. **SSO credentials** - AWS SSO (if configured)

The CLI stops at the first source that provides credentials. If none of these have credentials, you get the error.

## Fix 1: Run aws configure

The simplest fix for local development is to configure credentials directly.

```bash
# Set up credentials interactively
aws configure

# It will prompt for:
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: us-east-1
# Default output format: json
```

This creates two files:

`~/.aws/credentials`:
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

`~/.aws/config`:
```ini
[default]
region = us-east-1
output = json
```

## Fix 2: Check Environment Variables

If you've set credentials via environment variables, make sure they're actually set correctly.

```bash
# Check if the variables are set
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_DEFAULT_REGION

# If they're empty, set them
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
```

Common gotchas with environment variables:
- They're set in one terminal session but not another
- They were set with `export` in a subshell that's since exited
- A script set them, but you're running the CLI in a different context
- There's a typo in the variable name

Also check for conflicting environment variables.

```bash
# These can interfere with credential resolution
echo $AWS_PROFILE
echo $AWS_SHARED_CREDENTIALS_FILE
echo $AWS_CONFIG_FILE
```

If `AWS_PROFILE` is set to a profile that doesn't exist in your credentials file, you'll get this error.

## Fix 3: Check the Credentials File

Make sure the credentials file exists and is properly formatted.

```bash
# Check if the file exists
ls -la ~/.aws/credentials

# View its contents
cat ~/.aws/credentials
```

Common issues with the credentials file:

**Wrong file permissions:**

```bash
# The credentials file should not be world-readable
chmod 600 ~/.aws/credentials
```

**Wrong format:**

```ini
# Correct format
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Wrong - missing section header
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Wrong - extra spaces around equals
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
```

**Using a named profile but not specifying it:**

```ini
# If your credentials are under a named profile
[myprofile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

You need to specify the profile when running commands.

```bash
# Use the --profile flag
aws s3 ls --profile myprofile

# Or set the environment variable
export AWS_PROFILE=myprofile
```

## Fix 4: EC2 Instance Without an IAM Role

If you're running the CLI on an EC2 instance and get this error, the instance probably doesn't have an IAM role attached.

```bash
# Check if instance metadata is available (indicates IAM role)
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/

# If this returns nothing or an error, no IAM role is attached
```

To fix this, attach an IAM role to the instance.

```bash
# Create an instance profile and attach a role
aws iam create-instance-profile --instance-profile-name MyProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name MyProfile \
  --role-name MyEC2Role

# Attach to the running instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=MyProfile
```

If you've recently attached a role, it can take a few minutes for the instance metadata to update.

## Fix 5: Lambda Function Missing IAM Role

Lambda functions get credentials from their execution role automatically. If you're seeing this error in Lambda, something unusual is happening:

- The function doesn't have an execution role (unlikely - it can't be created without one)
- You're explicitly creating a client with `None` credentials
- You're overriding environment variables in the Lambda configuration

Check your Lambda function code.

```python
# This will use the Lambda execution role automatically
import boto3
s3 = boto3.client('s3')  # Correct

# Don't do this - it clears the automatic credentials
s3 = boto3.client('s3',
    aws_access_key_id=None,
    aws_secret_access_key=None
)
```

## Fix 6: Docker Containers and ECS

In Docker containers, credentials need to be explicitly provided.

```bash
# Option 1: Pass environment variables
docker run -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY myimage

# Option 2: Mount the credentials file
docker run -v ~/.aws:/root/.aws:ro myimage

# Option 3: Use ECS task roles (preferred in production)
# No code changes needed - the SDK picks up credentials automatically
```

For ECS, make sure your task definition has a task role ARN.

```json
{
  "family": "my-task",
  "taskRoleArn": "arn:aws:iam::123456789:role/my-task-role",
  "containerDefinitions": [...]
}
```

## Fix 7: SSO Session Expired

If you're using AWS SSO, your session might have expired.

```bash
# Log in again
aws sso login --profile my-sso-profile

# Verify it worked
aws sts get-caller-identity --profile my-sso-profile
```

## Debugging the Issue

When you're stuck, use the debug flag to see exactly where the CLI is looking for credentials.

```bash
# Run any command with --debug
aws s3 ls --debug 2>&1 | grep -i "credentials\|looking\|provider"
```

This shows you the entire credential resolution chain and where it's failing.

Another useful diagnostic command.

```bash
# This tells you which identity the CLI is using (or fails if no credentials)
aws sts get-caller-identity
```

If `get-caller-identity` works, the issue isn't credentials - it's permissions. Check [fixing IAM authorization errors](https://oneuptime.com/blog/post/2026-02-12-fix-you-are-not-authorized-to-perform-this-operation-iam-errors/view) instead.

## Summary

The "Unable to locate credentials" error almost always comes down to one of these issues: credentials aren't configured, they're configured in the wrong location, a profile name is misspelled, or the environment (EC2, Lambda, ECS) is missing an IAM role. Start with `aws sts get-caller-identity` to check if any credentials are being picked up, then work through the credential chain systematically. Nine times out of ten, the fix takes less than a minute once you know where to look.
