# How to Use CircleCI with AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, AWS, CI/CD, DevOps, Cloud

Description: Learn how to integrate CircleCI with AWS using IAM roles, OIDC, and secure environment variables for deployments.

---

CircleCI can deploy to AWS securely using OIDC, which avoids long-lived AWS keys. This guide shows the recommended approach.

## Step 1: Create an IAM Role for CircleCI

Create an IAM role with a trust policy that allows CircleCI OIDC tokens.

## Step 2: Configure OIDC in CircleCI

Set environment variables in CircleCI:

- `AWS_ROLE_ARN`
- `AWS_REGION`

## Step 3: Use AWS CLI in a Job

```yaml
version: 2.1

jobs:
  deploy:
    docker:
      - image: cimg/aws:2023.12
    steps:
      - checkout
      - run: aws sts get-caller-identity
      - run: aws s3 ls
```

## Step 4: Deploy

Use the AWS CLI or Terraform to deploy infrastructure or application artifacts.

## Best Practices

- Use least-privilege IAM roles
- Avoid long-lived access keys
- Restrict deployments to protected branches

## Conclusion

CircleCI with AWS is straightforward and secure when you use OIDC. It removes key management overhead and keeps deployments safer.
