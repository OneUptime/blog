# How to Authenticate Docker with ECR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, Docker, Authentication, Containers

Description: A complete guide to authenticating Docker with Amazon ECR, covering CLI authentication, credential helpers, CI/CD integration, and troubleshooting common auth errors.

---

Before you can push or pull container images from ECR, Docker needs to authenticate with the registry. ECR uses temporary authentication tokens that expire after 12 hours. Getting this right is the first hurdle everyone faces when working with ECR, and auth failures are one of the most common reasons deployments break.

Let's cover every authentication method, from the quick-and-dirty CLI approach to the set-it-and-forget-it credential helper.

## Method 1: AWS CLI (Most Common)

The standard approach uses the AWS CLI to get a login password and pipe it to `docker login`.

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

Breaking this down:
- `aws ecr get-login-password` returns a temporary auth token (valid for 12 hours)
- `--username AWS` is always "AWS" for ECR - it's not your IAM username
- `--password-stdin` reads the password from stdin instead of the command line (more secure)
- The registry URL is `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com`

You should see: `Login Succeeded`

This stores the credentials in `~/.docker/config.json`. After 12 hours, you'll need to re-authenticate.

## Method 2: ECR Credential Helper (Best for Development)

The Amazon ECR Docker Credential Helper automates authentication. Once installed, Docker automatically gets fresh tokens when it needs them. No more running `docker login` manually.

### Installation

```bash
# macOS
brew install docker-credential-helper-ecr

# Linux - download the binary
sudo apt-get install amazon-ecr-credential-helper

# Or install from source
go install github.com/awslabs/amazon-ecr-credential-helper/ecr-login/cli/docker-credential-ecr-login@latest
```

### Configuration

Edit your Docker config file to use the helper.

```bash
# Create or edit ~/.docker/config.json
```

```json
{
  "credHelpers": {
    "123456789.dkr.ecr.us-east-1.amazonaws.com": "ecr-login",
    "123456789.dkr.ecr.eu-west-1.amazonaws.com": "ecr-login"
  }
}
```

Or use it as the default credential store for all ECR registries.

```json
{
  "credsStore": "ecr-login"
}
```

Now you can push and pull without running `docker login` first. The credential helper handles authentication transparently using your AWS credentials (from environment variables, AWS profile, or EC2 instance role).

### Testing the Credential Helper

```bash
# Verify the credential helper is working
docker-credential-ecr-login list

# Try a pull
docker pull 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Method 3: Using AWS Profiles

If you work with multiple AWS accounts, specify which profile to use for authentication.

```bash
# Authenticate using a specific AWS profile
aws ecr get-login-password --region us-east-1 --profile production | \
  docker login --username AWS --password-stdin 444444444444.dkr.ecr.us-east-1.amazonaws.com
```

For the credential helper, set the profile via environment variable.

```bash
# Set the profile for the credential helper
export AWS_PROFILE=production
docker pull 444444444444.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Method 4: IAM Roles (EC2 / ECS / CodeBuild)

When running on AWS infrastructure (EC2, ECS, CodeBuild, Lambda), you don't need explicit credentials. The AWS SDK uses the attached IAM role automatically.

```bash
# On an EC2 instance with an IAM role, just run:
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# The CLI uses the instance's IAM role for authentication
```

For ECS tasks, the execution role handles ECR authentication automatically. You don't need to run `docker login` - ECS does it for you. The execution role just needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

## Method 5: OIDC Federation (GitHub Actions)

For CI/CD platforms that support OIDC, you can authenticate without storing long-lived credentials.

```yaml
# GitHub Actions with OIDC
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1

- name: Login to ECR
  id: ecr-login
  uses: aws-actions/amazon-ecr-login@v2
```

The `amazon-ecr-login` action handles the `get-login-password` and `docker login` steps for you.

## Required IAM Permissions

Regardless of the authentication method, the IAM principal needs specific ECR permissions.

For pulling images:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ],
      "Resource": "arn:aws:ecr:us-east-1:123456789:repository/my-app"
    }
  ]
}
```

For pushing images (add to the pull permissions):

```json
{
  "Effect": "Allow",
  "Action": [
    "ecr:PutImage",
    "ecr:InitiateLayerUpload",
    "ecr:UploadLayerPart",
    "ecr:CompleteLayerUpload"
  ],
  "Resource": "arn:aws:ecr:us-east-1:123456789:repository/my-app"
}
```

Note: `ecr:GetAuthorizationToken` must have `Resource: "*"` because it's not a per-repository action.

## Authenticating for Cross-Account Access

When pulling from a repository in a different account, you authenticate with the source account's registry.

```bash
# Authenticate with the source account's ECR (where the images live)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 111111111111.dkr.ecr.us-east-1.amazonaws.com

# Now pull from the source account
docker pull 111111111111.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.2.3
```

This requires both a repository policy in the source account and IAM permissions in your account. See our post on [ECR cross-account image sharing](https://oneuptime.com/blog/post/ecr-cross-account-image-sharing/view) for the full setup.

## Troubleshooting Authentication Issues

### "no basic auth credentials"

This means Docker doesn't have valid credentials for the registry. Re-run the login command.

```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

If using the credential helper, verify it's properly installed.

```bash
# Check if the credential helper binary exists
which docker-credential-ecr-login

# Test it directly
echo "123456789.dkr.ecr.us-east-1.amazonaws.com" | docker-credential-ecr-login get
```

### "denied: Your authorization token has expired"

The ECR token lasts 12 hours. Get a fresh one.

```bash
# Clear old credentials and re-authenticate
docker logout 123456789.dkr.ecr.us-east-1.amazonaws.com
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

### "User is not authorized to perform ecr:GetAuthorizationToken"

The IAM user or role doesn't have ECR permissions. Add the `ecr:GetAuthorizationToken` action to the IAM policy.

### "error getting credentials - err: exec: docker-credential-ecr-login: executable file not found"

The credential helper isn't installed or isn't in your PATH.

```bash
# Check PATH
echo $PATH

# Find the binary
find / -name "docker-credential-ecr-login" 2>/dev/null

# If installed via Go, add Go bin to PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

### Wrong region

ECR auth tokens are region-specific. Make sure the region in your `get-login-password` command matches the region of your ECR repository.

```bash
# This won't work if your repo is in eu-west-1
aws ecr get-login-password --region us-east-1 | docker login ...

# Use the correct region
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.eu-west-1.amazonaws.com
```

## Docker Config File Cleanup

If you authenticate with multiple registries, your `~/.docker/config.json` can get cluttered. Clean it up periodically.

```bash
# View current auth entries
cat ~/.docker/config.json | python3 -m json.tool

# Logout from all ECR registries
docker logout 123456789.dkr.ecr.us-east-1.amazonaws.com
docker logout 123456789.dkr.ecr.eu-west-1.amazonaws.com
```

## Quick Reference Script

Here's a handy script that handles authentication for any ECR registry.

```bash
#!/bin/bash
# ecr-login.sh - Quick ECR authentication
# Usage: ./ecr-login.sh [region] [account-id]

REGION=${1:-us-east-1}
ACCOUNT_ID=${2:-$(aws sts get-caller-identity --query Account --output text)}
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Authenticating with ECR: ${REGISTRY}"

aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

if [ $? -eq 0 ]; then
  echo "Successfully authenticated with ECR"
  echo "Registry: ${REGISTRY}"
  echo "Token valid for 12 hours"
else
  echo "Authentication failed!"
  echo "Check: AWS credentials, IAM permissions, region"
  exit 1
fi
```

Authentication is the gateway to everything else you do with ECR. For development, install the credential helper and never think about it again. For CI/CD, use OIDC federation or IAM roles. And for quick one-off tasks, the CLI command gets the job done. For the next step after authentication, see our post on [pushing Docker images to ECR from CI/CD](https://oneuptime.com/blog/post/push-docker-images-ecr-cicd/view).
