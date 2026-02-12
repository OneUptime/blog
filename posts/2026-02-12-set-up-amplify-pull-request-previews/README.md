# How to Set Up Amplify Pull Request Previews

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Pull Requests, CI/CD, Code Review, DevOps

Description: Step-by-step guide to enabling pull request previews in AWS Amplify so reviewers can see live changes before merging

---

Pull request previews are one of those features that, once you have them, you wonder how your team ever lived without them. Instead of pulling a branch locally and running it to review changes, your reviewers get a live URL with the exact state of the PR. AWS Amplify makes this straightforward to set up, and in this guide we will go through the full configuration.

## What Are Pull Request Previews?

When a developer opens a pull request against your main branch, Amplify automatically builds and deploys that PR to a unique, temporary URL. The reviewer clicks the link, sees the changes live, and can approve or request changes without touching their local machine.

The preview URL looks something like:

```
https://pr-42.d1234abcd.amplifyapp.com
```

When the PR is closed or merged, the preview environment is automatically torn down.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant Amp as AWS Amplify
    participant Rev as Reviewer

    Dev->>GH: Open Pull Request
    GH->>Amp: Webhook: PR opened
    Amp->>Amp: Build & Deploy Preview
    Amp->>GH: Post preview URL as comment
    Rev->>Amp: Visit preview URL
    Rev->>GH: Approve PR
    Dev->>GH: Merge PR
    GH->>Amp: Webhook: PR closed
    Amp->>Amp: Tear down preview
```

## Prerequisites

Before enabling PR previews, make sure you have:

- An Amplify app connected to a GitHub, GitLab, or Bitbucket repository
- At least one branch deployed (typically `main`)
- Repository admin permissions to configure webhooks

PR previews currently work best with GitHub. GitLab and Bitbucket support is available but has some limitations around webhook configurations.

## Step 1: Enable Pull Request Previews

In the Amplify console:

1. Navigate to your app
2. Go to "Hosting" then "Previews"
3. Click "Enable previews"
4. Select the branch that PRs will target (usually `main`)
5. Amplify will install a GitHub App on your repository if it has not already

That is the core setup. Amplify installs a webhook on your repository that fires whenever a PR is opened, updated, or closed.

## Step 2: Configure Preview Build Settings

By default, PR previews use the same build settings as the target branch. But you might want different settings for previews. For example, you might skip expensive optimization steps to get faster preview builds:

```yaml
# amplify.yml - Conditional build for PR previews
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        # Skip heavy optimizations for PR previews
        - if [ "$AWS_PULL_REQUEST_ID" != "" ]; then
            NEXT_PUBLIC_ENV=preview npm run build;
          else
            npm run build;
          fi
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

The `$AWS_PULL_REQUEST_ID` environment variable is automatically set by Amplify during PR preview builds. It is empty for regular branch builds.

## Step 3: Set Environment Variables for Previews

PR previews should typically connect to development or staging backends, not production. Set preview-specific environment variables in the Amplify console:

1. Go to "Hosting" then "Environment variables"
2. Add variables with the branch scope set to "Previews"

```
# Preview-specific environment variables
API_URL=https://dev-api.example.com
DATABASE_URL=postgresql://user:pass@dev-db:5432/myapp
NEXT_PUBLIC_ENVIRONMENT=preview
```

This ensures no PR preview accidentally writes to your production database or calls your production API.

## Step 4: Add Access Controls

PR previews are publicly accessible by default. For private projects, you will want to restrict access:

1. Go to "Hosting" then "Access control"
2. Under "Pull request previews," set access to "Restricted"
3. Configure a username and password

Everyone who needs to review PRs will need these credentials. Alternatively, you can use AWS IAM for more granular access control.

## Step 5: Configure GitHub Integration

Amplify posts the preview URL as a comment on your GitHub PR. To customize what appears in the comment, you can set up a custom GitHub check:

```bash
# The Amplify GitHub App automatically creates:
# 1. A deployment status on the PR
# 2. A comment with the preview URL
# 3. A check that shows build progress
```

You can also configure branch protection rules in GitHub to require the Amplify build check to pass before merging:

1. In GitHub, go to Settings then Branches
2. Edit the branch protection rule for `main`
3. Under "Require status checks to pass," add "AWS Amplify Console Web Preview"

This prevents merging PRs that have broken builds.

## Step 6: Handle Backend Resources in Previews

If your Amplify app has backend resources, you need to decide whether PR previews get their own backend or share one:

**Shared backend (recommended for most teams)**:

```bash
# All PR previews share the 'dev' backend environment
# This saves costs and keeps things simple
# Configure this in the Amplify console under Previews
```

**Isolated backends (for complex apps)**:

```bash
# Each PR preview creates its own backend
# Useful when testing database schema changes
# WARNING: This significantly increases costs and build times
```

For most teams, sharing a development backend across previews is the right choice. Only use isolated backends when PRs frequently include backend schema changes that would conflict with each other.

## Step 7: Speed Up Preview Builds

Preview builds should be fast so reviewers do not have to wait. Here are strategies to reduce build times:

**Enable dependency caching**:

```yaml
# amplify.yml - Cache configuration
cache:
  paths:
    - node_modules/**/*
    - .next/cache/**/*
    - .cache/**/*
```

**Skip unnecessary steps**:

```yaml
# Skip Lighthouse audits, image optimization, etc. for previews
build:
  commands:
    - if [ "$AWS_PULL_REQUEST_ID" != "" ]; then
        SKIP_LIGHTHOUSE=true npm run build:fast;
      else
        npm run build;
      fi
```

**Use a smaller build image**: In the Amplify console under "Build settings," you can select a smaller build image for previews if your app does not need all the tools in the default image.

## Step 8: Preview Notifications

Set up Slack or email notifications for preview builds so reviewers know when a preview is ready:

```bash
# Create a Lambda function that forwards Amplify events to Slack
aws lambda create-function \
  --function-name amplify-preview-notifier \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::123456789:role/lambda-role \
  --zip-file fileb://notifier.zip
```

A simpler approach is to rely on the GitHub PR comment that Amplify posts automatically. Most teams find this sufficient.

## Debugging PR Preview Issues

**Preview not building**: Check that the webhook is correctly installed. In GitHub, go to Settings then Webhooks and verify the Amplify webhook is listed and showing successful deliveries.

**Preview shows old content**: Amplify caches aggressively. In your build commands, add a cache-busting step:

```bash
# Clear Amplify's CDN cache after deploying a preview
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"
```

**Preview URL returns 404**: The build might have failed silently. Check the Amplify console for build logs. Common causes include missing environment variables or incompatible Node.js versions.

**GitHub check stuck in "pending"**: This usually means the webhook delivery failed. Re-deliver the webhook from GitHub's webhook settings page.

## Cost Management

PR previews cost money for every build minute and, for SSR apps, for Lambda invocations while the preview is live. Keep costs down by:

- Setting a build timeout so broken builds do not run indefinitely
- Enabling auto-deletion when PRs are closed
- Limiting previews to PRs targeting specific branches (not every branch)
- Using faster, less thorough builds for previews

## Integration with Branch Deployments

PR previews complement [branch-based deployments](https://oneuptime.com/blog/post/configure-amplify-branch-based-deployments/view). Use branch deployments for long-lived environments (staging, QA) and PR previews for short-lived review environments. Together, they give you complete coverage of your Git workflow.

## Wrapping Up

Pull request previews in Amplify close the gap between writing code and seeing it live. Reviewers get instant visual feedback, QA can test before merge, and your team catches issues earlier in the development cycle. The setup takes about ten minutes, and the productivity gains are immediate. If you are already using Amplify for hosting, turning on PR previews is one of the highest-value configuration changes you can make.
