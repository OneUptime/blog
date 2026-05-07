# How to Store API Keys as Podman Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, API Key, Security

Description: Learn how to securely store and deliver API keys to Podman containers using secrets instead of environment variables.

---

> API keys leaked through environment variables, logs, or image layers can lead to unauthorized access and significant security breaches. Podman secrets keep them safe.

API keys for third-party services, payment processors, cloud providers, and internal APIs are high-value targets for attackers. Using Podman secrets helps deliver these keys to containers without storing them in image layers or source control, and file-mounted secrets avoid exposing the values as container environment variables.

---

## Storing an API Key as a Secret

```bash
# Create a secret from an API key value

printf '%s' "$STRIPE_API_KEY" | podman secret create stripe_api_key -

# Create secrets for multiple services
printf '%s' "$SENDGRID_API_KEY" | podman secret create sendgrid_key -
printf '%s' "$AWS_ACCESS_KEY_ID" | podman secret create aws_access_key -
printf '%s' "$AWS_SECRET_ACCESS_KEY" | podman secret create aws_secret_key -
```

## Using API Keys as File Mounts

```bash
# Mount API key as a file in the container
podman run -d \
  --name payment-service \
  --secret stripe_api_key \
  --secret sendgrid_key \
  payment-service:latest

# The application reads the keys from files:
# /run/secrets/stripe_api_key
# /run/secrets/sendgrid_key
```

## Using API Keys as Environment Variables

```bash
# Expose API keys as environment variables when the application requires it
podman run -d \
  --name my-api-service \
  --secret stripe_api_key,type=env,target=STRIPE_API_KEY \
  --secret sendgrid_key,type=env,target=SENDGRID_API_KEY \
  my-api-service:latest
```

## AWS Credentials as Secrets

```bash
# Store AWS credentials
printf '%s' "$AWS_ACCESS_KEY_ID" | podman secret create aws_access_key_id -
printf '%s' "$AWS_SECRET_ACCESS_KEY" | podman secret create aws_secret_access_key -

# Use as environment variables for AWS SDK
podman run -d \
  --name aws-app \
  --secret aws_access_key_id,type=env,target=AWS_ACCESS_KEY_ID \
  --secret aws_secret_access_key,type=env,target=AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION=us-east-1 \
  aws-app:latest
```

## JSON Credential Files

```bash
# Store a JSON API credential file (e.g., GCP service account)
podman secret create gcp_credentials ./service-account.json

# Mount it at the expected location
podman run -d \
  --name gcp-app \
  --secret gcp_credentials,target=/app/credentials/service-account.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account.json \
  gcp-app:latest
```

## Reading API Keys in Application Code

```bash
# Python: reading an API key from a secret file
# with open('/run/secrets/stripe_api_key') as f:
#     stripe.api_key = f.read().strip()

# Node.js: reading from a secret file
# const apiKey = fs.readFileSync('/run/secrets/stripe_api_key', 'utf8').trim();

# Go: reading from a secret file
# key, _ := os.ReadFile("/run/secrets/stripe_api_key")
# apiKey := strings.TrimSpace(string(key))
```

## CI/CD Pipeline Integration

```bash
#!/bin/bash
# Deploy script that creates secrets from CI/CD variables

# These are injected by the CI/CD system
printf '%s' "$STRIPE_KEY" | podman secret create stripe_api_key - 2>/dev/null || true
printf '%s' "$SENDGRID_KEY" | podman secret create sendgrid_key - 2>/dev/null || true

# Deploy the application
podman run -d \
  --name my-app \
  --secret stripe_api_key \
  --secret sendgrid_key \
  my-app:latest
```

## Summary

Store API keys as Podman secrets to keep them out of image layers and source control. Use file mounts for maximum security, or environment variables when your application requires them. Create secrets from files, stdin, or CI/CD variables instead of typing literal secret values into shell commands. For JSON credential files like GCP service accounts, store the entire file as a secret and mount it at the expected path. Always integrate secret creation into your CI/CD pipeline for automated, secure deployments.
