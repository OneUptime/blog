# How to Fix ECR 'no basic auth credentials' Docker Push Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, Docker, CI/CD, Debugging

Description: Resolve the ECR no basic auth credentials error when pushing Docker images, covering authentication, token expiry, credential helpers, and CI/CD pipeline fixes.

---

You've built your Docker image and you're ready to push it to ECR. You run `docker push` and get hit with: `no basic auth credentials`. The Docker daemon is telling you it doesn't have valid authentication tokens for the ECR registry. This is the single most common ECR error and it's almost always an authentication issue.

## The Quick Fix

The fastest way to fix this is to log in to ECR:

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Replace `123456789012` with your AWS account ID and `us-east-1` with your region.

If this works, you should see "Login Succeeded" and your push will work. But if it doesn't work, or if you keep running into this issue, read on.

## Understanding ECR Authentication

ECR uses temporary authentication tokens. When you call `get-login-password`, AWS returns a token that's valid for 12 hours. Docker stores this token in its config file (usually `~/.docker/config.json`).

After 12 hours, the token expires and you need to log in again. This is the number one reason people see this error intermittently - their token expired.

```bash
# Check when you last logged in
# Look at the modification time of the Docker config
ls -la ~/.docker/config.json

# View the stored credentials (don't share these)
cat ~/.docker/config.json
```

## Common Mistakes

### Wrong Registry URL

The registry URL must match exactly. A common mistake is to include a repository name in the login URL:

```bash
# Wrong - don't include the repository name in the login URL
aws ecr get-login-password | docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app

# Correct - just the registry URL
aws ecr get-login-password | docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com
```

### Wrong Region

The login must be for the same region as your ECR repository:

```bash
# Check which region your repository is in
aws ecr describe-repositories --repository-names my-app \
    --query 'repositories[0].repositoryUri'

# Make sure the login region matches
aws ecr get-login-password --region us-west-2 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-west-2.amazonaws.com
```

### Tagging the Image Incorrectly

Docker push requires the image to be tagged with the full ECR repository URI:

```bash
# Build and tag correctly
docker build -t my-app .

# Tag with the full ECR URI
docker tag my-app:latest \
    123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

# Now push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

If you try to push `my-app:latest` without the full URI, Docker tries to push to Docker Hub and fails.

## Using the ECR Credential Helper

Instead of manually logging in every 12 hours, use the Amazon ECR Docker Credential Helper. It automatically refreshes tokens:

```bash
# Install the credential helper
# On macOS
brew install docker-credential-helper-ecr

# On Amazon Linux / RHEL
sudo yum install amazon-ecr-credential-helper

# On Ubuntu/Debian
sudo apt-get install amazon-ecr-credential-helper
```

Configure Docker to use it by editing `~/.docker/config.json`:

```json
{
    "credHelpers": {
        "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login",
        "public.ecr.aws": "ecr-login"
    }
}
```

Now Docker automatically fetches fresh credentials every time you push or pull. No more manual `docker login`.

## CI/CD Pipeline Fixes

In CI/CD pipelines, the authentication issue is especially common because pipelines run in fresh environments where there's no stored credential.

### GitHub Actions

```yaml
# GitHub Actions workflow
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:${{ github.sha }} .
          docker push $ECR_REGISTRY/my-app:${{ github.sha }}
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        AWS_ACCOUNT_ID = '123456789012'
        AWS_REGION = 'us-east-1'
        ECR_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-app"
    }
    stages {
        stage('Login to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin \
                    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                '''
            }
        }
        stage('Build and Push') {
            steps {
                sh '''
                    docker build -t ${ECR_REPO}:${BUILD_NUMBER} .
                    docker push ${ECR_REPO}:${BUILD_NUMBER}
                '''
            }
        }
    }
}
```

## IAM Permission Issues

The IAM user or role running `get-login-password` needs the `ecr:GetAuthorizationToken` permission. For pushing, you need additional permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload"
            ],
            "Resource": "arn:aws:ecr:us-east-1:123456789012:repository/my-app"
        }
    ]
}
```

Test if your credentials work:

```bash
# Verify AWS credentials are valid
aws sts get-caller-identity

# Verify ECR access specifically
aws ecr get-authorization-token --query 'authorizationData[0].proxyEndpoint'
```

## Repository Policy Issues

ECR repositories can have resource-based policies that restrict who can push. If you're getting access denied even with valid credentials:

```bash
# Check the repository policy
aws ecr get-repository-policy --repository-name my-app
```

Make sure your IAM identity is allowed by the policy.

## Docker Desktop and Credential Store Conflicts

On macOS, Docker Desktop sometimes stores credentials in the macOS Keychain through `docker-credential-osxkeychain`. This can conflict with ECR credentials:

```bash
# Check what credential store Docker is using
cat ~/.docker/config.json | python3 -m json.tool
```

If you see `"credsStore": "osxkeychain"`, ECR credentials might be stored and retrieved differently. Switch to using `credHelpers` for ECR specifically rather than the global credential store.

For monitoring your CI/CD pipelines and catching push failures early, check out [setting up alerts](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to notify your team when builds or deployments fail.

## Summary

The "no basic auth credentials" error means Docker doesn't have valid ECR authentication tokens. Run `aws ecr get-login-password` piped into `docker login`, make sure the region and account ID match, and tag your image with the full ECR URI. For long-term convenience, use the ECR credential helper. In CI/CD pipelines, always add an explicit login step before pushing.
