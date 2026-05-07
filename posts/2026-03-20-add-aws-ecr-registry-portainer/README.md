# How to Add AWS ECR as a Registry in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AWS ECR, Container Registry, AWS, DevOps

Description: Learn how to connect Amazon Elastic Container Registry (ECR) to Portainer so you can pull private images from AWS.

## Overview

AWS Elastic Container Registry (ECR) is a fully managed container registry. ECR uses short-lived authorization tokens (valid 12 hours), but Portainer supports AWS ECR as a native registry type and refreshes those tokens automatically after you configure the registry with your AWS access key, secret access key, and region.

## Getting ECR Credentials

If you want to verify access from the command line, you can retrieve an ECR authentication token with the AWS CLI:

```bash
# Get an ECR login token (valid for 12 hours)

aws ecr get-login-password --region us-east-1

# This outputs a token you use as a password with username "AWS"
```

## Adding ECR in Portainer

1. Go to **Registries** and click **Add registry**.
2. Select **AWS ECR** as the registry type.
3. Enter:
   - **Name**: A name for the registry in Portainer
   - **Registry URL**: Your ECR registry URL (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com`)
   - **Authentication**: Enable this option if your registry requires authentication
   - **AWS Access Key**: Your AWS access key ID
   - **AWS Secret Access Key**: Your AWS secret access key
   - **Region**: Your AWS region (e.g., `us-east-1`)
4. Portainer will handle token refresh automatically.

## Manual Token Rotation

When you use Portainer's native AWS ECR registry integration, manual token rotation is not required. Portainer refreshes ECR authorization tokens automatically.

## Setting Up an IAM Policy for ECR Access

For pull-only access, ensure your AWS credentials have the necessary ECR permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchCheckLayerAvailability"
      ],
      "Resource": "*"
    }
  ]
}
```

## Testing ECR Access

```bash
# Authenticate Docker CLI with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Pull an image from ECR to verify access
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Conclusion

Portainer can connect to AWS ECR as a native registry type and handle ECR token refresh automatically when you configure the registry with your AWS access key, secret access key, and region.
