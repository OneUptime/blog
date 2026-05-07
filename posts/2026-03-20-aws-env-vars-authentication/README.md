# How to Authenticate with AWS Using Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Authentication, Environment Variable, CLI, Security, DevOps

Description: Learn how to configure AWS SDK and CLI authentication using environment variables for local development and CI/CD pipelines.

---

Environment variables are the simplest way to supply AWS credentials without modifying configuration files. They work across all AWS SDKs, the AWS CLI, OpenTofu, and any tool that uses the AWS SDKs.

---

## Required Environment Variables

```bash
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
```

---

## Optional Session Token (for Temporary Credentials)

```bash
export AWS_SESSION_TOKEN=AQoDYXdzEJr...
```

Temporary credentials from STS or IAM role assumption require `AWS_SESSION_TOKEN`.

---

## Verify Authentication

```bash
aws sts get-caller-identity
# {

#   "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#   "Account": "123456789012",
#   "Arn": "arn:aws:iam::123456789012:user/myuser"
# }
```

---

## Use in a Shell Script

```bash
#!/bin/bash
export AWS_ACCESS_KEY_ID="${CI_AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${CI_AWS_SECRET_ACCESS_KEY}"
export AWS_REGION="us-east-1"
export AWS_DEFAULT_REGION="us-east-1"

aws s3 ls s3://my-bucket
```

---

## Use in Docker

```dockerfile
ENV AWS_REGION="us-east-1"
ENV AWS_DEFAULT_REGION="us-east-1"
```

Or pass at runtime:

```bash
docker run -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... -e AWS_REGION=us-east-1 -e AWS_DEFAULT_REGION=us-east-1 myimage
```

---

## Credential Precedence

AWS SDKs and the AWS CLI do not all use the same complete credential chain, but environment variables are checked before shared credentials and config files. Explicit CLI parameters or code-level settings can still override them, and the exact order of role-based providers such as EKS web identity, ECS task roles, and EC2 instance profiles varies by SDK and tool.

---

## Summary

Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to authenticate with AWS, then set a Region. For broad AWS SDK and CLI compatibility, set `AWS_REGION` and `AWS_DEFAULT_REGION`. Add `AWS_SESSION_TOKEN` for temporary credentials. Environment variable credentials take precedence over shared config file credentials, making them well-suited for CI/CD pipelines where secrets are injected as environment variables.
