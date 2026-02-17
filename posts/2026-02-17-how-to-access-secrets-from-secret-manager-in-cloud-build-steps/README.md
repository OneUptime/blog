# How to Access Secrets from Secret Manager in Cloud Build Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Secret Manager, Secrets, CI/CD, Security

Description: Learn how to securely access secrets stored in Google Cloud Secret Manager from within your Cloud Build pipeline steps without exposing sensitive values.

---

Build pipelines need secrets - API keys, database passwords, service account credentials, npm tokens, and more. Hardcoding these values in your cloudbuild.yaml or storing them in environment variables on the trigger is insecure and makes rotation difficult. Google Cloud Secret Manager is the proper way to store and access secrets, and Cloud Build has built-in integration to make this straightforward. In this post, I will show you how to set it up and cover the patterns that work best in practice.

## Two Ways to Access Secrets in Cloud Build

Cloud Build provides two mechanisms for accessing Secret Manager secrets:

1. **availableSecrets** - Makes secrets available as environment variables in specific build steps
2. **volumes** - Mounts secrets as files in the build step's filesystem

The environment variable approach is more common and simpler for most use cases. The file-based approach is useful when a tool expects a credential file (like a service account JSON key).

## Method 1: Secrets as Environment Variables

### Step 1: Create the Secret

First, store your secret in Secret Manager:

```bash
# Create a new secret in Secret Manager
gcloud secrets create my-api-key \
  --replication-policy="automatic"

# Add a version with the secret value
echo -n "sk-abc123def456" | gcloud secrets versions add my-api-key --data-file=-
```

### Step 2: Grant Cloud Build Access

The Cloud Build service account needs the `secretmanager.secretAccessor` role on the secret:

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant access to the specific secret
gcloud secrets add-iam-policy-binding my-api-key \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Reference the Secret in cloudbuild.yaml

Use the `availableSecrets` block to make the secret available as an environment variable:

```yaml
# Access a secret as an environment variable in a build step
steps:
  - name: 'bash'
    entrypoint: 'bash'
    secretEnv: ['API_KEY']
    args:
      - '-c'
      - |
        # The secret value is available as an environment variable
        echo "Deploying with API key length: $${#API_KEY}"
        # Use the secret in your build commands
        curl -H "Authorization: Bearer $$API_KEY" https://api.example.com/deploy

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/my-api-key/versions/latest
      env: 'API_KEY'
```

Important details about this configuration:

- The `secretEnv` field on the step lists which secret environment variables this step needs
- The `availableSecrets` block maps Secret Manager secret versions to environment variable names
- Use `$$` to reference the environment variable in bash scripts (single `$` would be treated as a Cloud Build substitution)
- Secrets are only available in steps that explicitly list them in `secretEnv`

### Using Multiple Secrets

You can map multiple secrets in a single build:

```yaml
# Multiple secrets for different build steps
steps:
  # Step that needs database credentials
  - name: 'bash'
    id: 'run-migrations'
    secretEnv: ['DB_PASSWORD', 'DB_HOST']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run database migrations with the secret credentials
        DATABASE_URL="postgresql://admin:$$DB_PASSWORD@$$DB_HOST:5432/mydb"
        npm run migrate -- --url "$$DATABASE_URL"

  # Step that needs an npm token
  - name: 'node:20'
    id: 'install-private-packages'
    secretEnv: ['NPM_TOKEN']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Configure npm to use the private registry token
        echo "//registry.npmjs.org/:_authToken=$$NPM_TOKEN" > .npmrc
        npm ci

  # Step that needs a Docker Hub token
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-to-dockerhub'
    secretEnv: ['DOCKER_PASSWORD']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Log in to Docker Hub
        echo "$$DOCKER_PASSWORD" | docker login -u myuser --password-stdin
        docker push myuser/my-app:latest

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'
    - versionName: projects/$PROJECT_ID/secrets/db-host/versions/latest
      env: 'DB_HOST'
    - versionName: projects/$PROJECT_ID/secrets/npm-token/versions/latest
      env: 'NPM_TOKEN'
    - versionName: projects/$PROJECT_ID/secrets/docker-password/versions/latest
      env: 'DOCKER_PASSWORD'
```

## Method 2: Secrets as Files

Some tools expect credentials as files rather than environment variables. For these cases, you can write the secret to a file:

```yaml
# Write a service account key to a file for tools that need it
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    secretEnv: ['SA_KEY']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Write the service account key to a file
        echo "$$SA_KEY" > /workspace/sa-key.json
        # Activate the service account
        gcloud auth activate-service-account --key-file=/workspace/sa-key.json
        # Run your command that needs the credentials
        gcloud storage cp gs://private-bucket/data.csv /workspace/

  # Clean up the key file after use
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'rm -f /workspace/sa-key.json'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/sa-key/versions/latest
      env: 'SA_KEY'
```

Note: Using service account keys is generally discouraged. Prefer workload identity federation or the Cloud Build service account's built-in credentials when possible.

## Pinning Secret Versions

Using `versions/latest` always pulls the most recent version of the secret. This is convenient but can cause builds to break if someone updates a secret unexpectedly. For production builds, consider pinning to a specific version:

```yaml
# Pin to a specific secret version for stability
availableSecrets:
  secretManager:
    - versionName: projects/my-project/secrets/my-api-key/versions/3
      env: 'API_KEY'
```

When you rotate the secret, update the version number in your cloudbuild.yaml and commit the change. This way, secret rotation is tracked in version control alongside the code.

## Common Use Cases

### Private npm Registry Authentication

```yaml
# Install packages from a private npm registry
steps:
  - name: 'node:20'
    secretEnv: ['NPM_TOKEN']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Set up authentication for the private registry
        echo "//npm.pkg.github.com/:_authToken=$$NPM_TOKEN" >> .npmrc
        echo "@my-org:registry=https://npm.pkg.github.com" >> .npmrc
        npm ci
        # Clean up the token from the workspace
        rm .npmrc

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/github-npm-token/versions/latest
      env: 'NPM_TOKEN'
```

### Docker Hub or Private Registry Login

```yaml
# Log in to a private container registry
steps:
  - name: 'gcr.io/cloud-builders/docker'
    secretEnv: ['REGISTRY_PASSWORD']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Authenticate with the private registry
        echo "$$REGISTRY_PASSWORD" | docker login registry.example.com -u deploy-user --password-stdin
        docker pull registry.example.com/base-images/node:20

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/registry-password/versions/latest
      env: 'REGISTRY_PASSWORD'
```

### Slack or Webhook Notifications

```yaml
# Send a deployment notification to Slack
steps:
  - name: 'gcr.io/cloud-builders/curl'
    secretEnv: ['SLACK_WEBHOOK_URL']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Notify the team about the deployment
        curl -X POST -H 'Content-type: application/json' \
          --data "{\"text\":\"Deployed $SHORT_SHA to production\"}" \
          "$$SLACK_WEBHOOK_URL"

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/slack-webhook/versions/latest
      env: 'SLACK_WEBHOOK_URL'
```

### Signing Artifacts

```yaml
# Sign a container image with a private key
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']

  - name: 'bash'
    id: 'sign-image'
    secretEnv: ['COSIGN_KEY']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Write the signing key to a temporary file
        echo "$$COSIGN_KEY" > /tmp/cosign.key
        cosign sign --key /tmp/cosign.key gcr.io/$PROJECT_ID/my-app:$SHORT_SHA
        rm /tmp/cosign.key

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/cosign-private-key/versions/latest
      env: 'COSIGN_KEY'
```

## Security Best Practices

Never echo or log secret values. It is tempting to add debugging statements, but secret values logged to Cloud Build are visible in the build history:

```yaml
# BAD - Do not do this
- name: 'bash'
  secretEnv: ['API_KEY']
  args: ['-c', 'echo $$API_KEY']  # Secret exposed in logs

# GOOD - Verify without exposing
- name: 'bash'
  secretEnv: ['API_KEY']
  args: ['-c', 'echo "API key length: $${#API_KEY}"']
```

Limit which steps can access each secret using `secretEnv`. Only list a secret on the steps that actually need it. This follows the principle of least privilege.

Use separate secrets for different environments. Do not reuse a production database password for staging. Create environment-specific secrets and reference them using substitution variables:

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password-$_ENV/versions/latest
      env: 'DB_PASSWORD'
```

## Wrapping Up

Secret Manager integration in Cloud Build removes the need for insecure workarounds like storing secrets in trigger environment variables or checking them into repositories. The `availableSecrets` block is clean, declarative, and limits secret exposure to only the steps that need them. Set up your secrets once, grant the Cloud Build service account access, and reference them in your build steps. Rotate secrets in Secret Manager without changing your build configuration, and pin versions when you need stability. It is a small investment that significantly improves the security of your CI/CD pipeline.
