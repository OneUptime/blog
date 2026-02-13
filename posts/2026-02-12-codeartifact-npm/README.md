# How to Use CodeArtifact with npm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeArtifact, npm, Node.js, DevOps

Description: Configure npm to use AWS CodeArtifact as a private registry for publishing and installing packages, including authentication, scopes, and CI/CD setup.

---

Setting up npm with AWS CodeArtifact lets you host private packages alongside cached public ones, all behind IAM-controlled access. No more sharing npm tokens across the team or worrying about a random package disappearing from the public registry mid-build.

This guide covers everything from initial configuration to publishing packages and setting up CI/CD builds.

## Prerequisites

You'll need:

- An AWS CodeArtifact domain and repository (see our guide on [setting up CodeArtifact](https://oneuptime.com/blog/post/2026-02-12-aws-codeartifact-package-management/view))
- AWS CLI installed and configured
- Node.js and npm installed

## Quick Setup with the Login Command

The fastest way to configure npm is with the `aws codeartifact login` command:

```bash
# Configure npm to use your CodeArtifact repository
aws codeartifact login \
  --tool npm \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012
```

This automatically:
- Gets an authorization token
- Sets the registry URL in your npm config
- Configures the auth token
- The token is valid for 12 hours by default

Verify the configuration:

```bash
# Check that npm is pointing to CodeArtifact
npm config get registry
# Should output something like:
# https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/
```

## Manual Configuration

If you need more control or want to configure things manually:

```bash
# Get the repository endpoint
REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format npm \
  --query repositoryEndpoint \
  --output text)

# Get the auth token
AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Configure npm
npm config set registry "$REPO_URL"
npm config set //${REPO_URL#https://}:_authToken="$AUTH_TOKEN"
npm config set //${REPO_URL#https://}:always-auth=true
```

## Using Scoped Packages

A better approach for most teams is to only route your private packages through CodeArtifact and let public packages go directly to npmjs.org. You do this with scoped packages.

```bash
# Only route @myorg scoped packages through CodeArtifact
aws codeartifact login \
  --tool npm \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012 \
  --namespace @myorg
```

This means:
- `npm install @myorg/my-internal-lib` fetches from CodeArtifact
- `npm install express` fetches from the public npm registry

To set this up manually:

```bash
# Set scope-specific registry
npm config set @myorg:registry "$REPO_URL"
npm config set //${REPO_URL#https://}:_authToken="$AUTH_TOKEN"
```

## Using .npmrc File

For team-wide configuration, use a project-level `.npmrc` file. This goes in your project root alongside `package.json`:

```ini
# .npmrc - Project-level npm configuration
# Route all packages through CodeArtifact (which proxies public npm)
registry=https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/
//my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/:always-auth=true
```

Don't put the auth token in `.npmrc` - that's a secret. Instead, set it via environment variable:

```ini
# .npmrc with environment variable for the auth token
registry=https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/
//my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/:_authToken=${CODEARTIFACT_AUTH_TOKEN}
//my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/:always-auth=true
```

Then set the token before running npm:

```bash
# Set the token from CodeArtifact
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Now npm commands will work
npm install
```

## Publishing Packages

Publishing private packages to CodeArtifact works just like publishing to npm:

```bash
# Log in to CodeArtifact first
aws codeartifact login \
  --tool npm \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012

# Publish your package
npm publish
```

Make sure your `package.json` is set up correctly:

```json
{
  "name": "@myorg/shared-utils",
  "version": "1.2.0",
  "description": "Shared utility functions",
  "main": "dist/index.js",
  "publishConfig": {
    "registry": "https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-packages/"
  }
}
```

The `publishConfig.registry` ensures the package always publishes to CodeArtifact, even if the developer's global npm config points elsewhere.

## CI/CD Setup with CodeBuild

Here's a CodeBuild buildspec that authenticates with CodeArtifact:

```yaml
# buildspec.yml - Install and build with CodeArtifact
version: 0.2

phases:
  pre_build:
    commands:
      # Authenticate npm with CodeArtifact
      - aws codeartifact login --tool npm --repository my-packages --domain my-org --domain-owner 123456789012
      - echo "npm configured for CodeArtifact"
  install:
    commands:
      - npm ci
  build:
    commands:
      - npm test
      - npm run build
```

For publishing from CI:

```yaml
# buildspec-publish.yml - Publish package to CodeArtifact
version: 0.2

phases:
  pre_build:
    commands:
      - aws codeartifact login --tool npm --repository my-packages --domain my-org --domain-owner 123456789012
  install:
    commands:
      - npm ci
  build:
    commands:
      - npm test
      - npm run build
  post_build:
    commands:
      # Only publish if tests pass
      - npm publish
```

The CodeBuild service role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codeartifact:GetAuthorizationToken",
        "codeartifact:GetRepositoryEndpoint",
        "codeartifact:ReadFromRepository",
        "codeartifact:PublishPackageVersion",
        "codeartifact:PutPackageMetadata"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetServiceBearerToken",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "sts:AWSServiceName": "codeartifact.amazonaws.com"
        }
      }
    }
  ]
}
```

## Token Refresh Script

Since tokens expire after 12 hours, you might want a script that refreshes them automatically:

```bash
#!/bin/bash
# refresh-codeartifact-token.sh - Refresh the CodeArtifact auth token
# Run this as a cron job or before each build

DOMAIN="my-org"
DOMAIN_OWNER="123456789012"

echo "Refreshing CodeArtifact token..."
aws codeartifact login \
  --tool npm \
  --repository my-packages \
  --domain $DOMAIN \
  --domain-owner $DOMAIN_OWNER

echo "Token refreshed at $(date)"
```

Add it to crontab for development machines:

```bash
# Refresh every 11 hours
0 */11 * * * /path/to/refresh-codeartifact-token.sh >> /var/log/codeartifact-refresh.log 2>&1
```

## Troubleshooting

**"401 Unauthorized" on npm install:**
Your auth token has expired. Run `aws codeartifact login` again.

**"404 Not Found" for a public package:**
Make sure your repository has an upstream connection to the public npm registry. Check with:
```bash
aws codeartifact list-repositories-in-domain \
  --domain my-org \
  --query 'repositories[*].{Name:name,Upstreams:upstreams}'
```

**"403 Forbidden" on publish:**
Your IAM role or user doesn't have `codeartifact:PublishPackageVersion` permission.

**Slow installs:**
The first time a public package is fetched, it goes through the proxy. Subsequent installs are cached and fast. If things are consistently slow, check that your CodeArtifact repository is in the same region as your build infrastructure.

For monitoring your package publishing pipeline and catching failed builds early, [OneUptime](https://oneuptime.com) can alert you when npm installs fail or when build times spike.
