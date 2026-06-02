# How to Set Up Amplify Pull Request Previews

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Pull Requests, CI/CD, Code Review, DevOps

Description: Step-by-step guide to enabling pull request previews in AWS Amplify so reviewers can see live changes before merging

---

Pull request previews are one of those features that, once you have them, you wonder how your team ever lived without them. Instead of pulling a branch locally and running it to review changes, your reviewers get a live URL with the exact state of the PR. AWS Amplify makes this straightforward to set up, and in this guide we will go through the full configuration.

## What Are Pull Request Previews?

When a developer opens a pull request against your main branch, Amplify automatically builds and deploys that PR to a unique, temporary URL. The reviewer clicks the link, sees the changes live, and can approve or request changes without touching their local machine.

The preview URL looks something like:

```text
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
    GH->>Amp: Repository event: PR opened
    Amp->>Amp: Build & Deploy Preview
    Amp->>GH: Post preview URL as comment
    Rev->>Amp: Visit preview URL
    Rev->>GH: Approve PR
    Dev->>GH: Merge PR
    GH->>Amp: Repository event: PR closed
    Amp->>Amp: Tear down preview
```

## Prerequisites

Before enabling PR previews, make sure you have:

- An Amplify app connected to a GitHub, GitLab, or Bitbucket repository
- At least one branch deployed (typically `main`)
- Repository admin permissions to authorize the repository integration

PR previews currently work best with GitHub. For GitHub repositories, Amplify uses the Amplify GitHub App and can surface the preview URL directly in the pull request.

## Step 1: Enable Pull Request Previews

In the Amplify console:

1. Navigate to your app
2. Go to "Hosting" then "Previews"
3. Click "Enable previews"
4. Select the branch that PRs will target (usually `main`)
5. Amplify will install a GitHub App on your repository if it has not already

That is the core setup. For GitHub repositories, Amplify uses the GitHub App authorization to react whenever a PR is opened, updated, or closed.

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
    baseDirectory: .next
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
2. Add variables for the preview branches or for the backend environment used by previews

```text
# Preview-specific environment variables
API_URL=https://dev-api.example.com
DATABASE_NAME=myapp_preview
NEXT_PUBLIC_ENVIRONMENT=preview
```

This ensures no PR preview accidentally writes to your production database or calls your production API. Do not store secrets such as database passwords in environment variables; use Amplify Secrets for Gen 2 apps or environment secrets in AWS Systems Manager Parameter Store for Gen 1 apps.

## Step 4: Add Access Controls

PR previews are publicly accessible by default. For private projects, you will want to restrict access:

1. Go to "Hosting" then "Access control"
2. Under "Pull request previews," set access to "Restricted"
3. Configure a username and password

Everyone who needs to review PRs will need these credentials. For more granular reviewer access, implement authentication and authorization in your application.

## Step 5: Configure GitHub Integration

For GitHub repositories, Amplify posts the preview URL on your GitHub PR. Amplify does not provide a built-in setting to customize that bot comment, but you can add your own GitHub check or workflow alongside it:

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

**Right-size the build environment**: In the Amplify console under "Build settings," you can choose an appropriate build instance size or configure a custom build image if your app does not need all the tools in the default image.

## Step 8: Preview Notifications

Set up Slack or email notifications for preview builds so reviewers know when a preview is ready:

```bash
# Create a Lambda function that forwards Amplify events to Slack
aws lambda create-function \
  --function-name amplify-preview-notifier \
  --runtime nodejs24.x \
  --handler index.handler \
  --role arn:aws:iam::123456789:role/lambda-role \
  --zip-file fileb://notifier.zip
```

A simpler approach is to rely on the GitHub PR comment that Amplify posts automatically. Most teams find this sufficient.

## Debugging PR Preview Issues

**Preview not building**: Check the Amplify troubleshooting guidance for web previews. Common causes include hitting the branches-per-app quota or using a public GitHub repository with an Amplify app that requires an IAM service role.

**Preview shows old content**: Review your app's `Cache-Control` headers and browser cache behavior. Amplify lets you tune CDN cache duration with custom headers, but its managed CloudFront distribution is not something you normally invalidate from preview build commands.

**Preview URL returns 404**: The build might have failed silently. Check the Amplify console for build logs. Common causes include missing environment variables or incompatible Node.js versions.

**GitHub check stuck in "pending"**: This usually means Amplify did not receive or process the repository event. Check the Amplify build logs and verify that the Amplify GitHub App is installed and authorized for the repository.

## Cost Management

PR previews cost money for every build minute and, for SSR apps, for Lambda invocations while the preview is live. Keep costs down by:

- Setting a build timeout so broken builds do not run indefinitely
- Enabling auto-deletion when PRs are closed
- Limiting previews to PRs targeting specific branches (not every branch)
- Using faster, less thorough builds for previews

## Integration with Branch Deployments

PR previews complement [branch-based deployments](https://oneuptime.com/blog/post/2026-02-12-configure-amplify-branch-based-deployments/view). Use branch deployments for long-lived environments (staging, QA) and PR previews for short-lived review environments. Together, they give you complete coverage of your Git workflow.

## Wrapping Up

Pull request previews in Amplify close the gap between writing code and seeing it live. Reviewers get instant visual feedback, QA can test before merge, and your team catches issues earlier in the development cycle. The setup takes about ten minutes, and the productivity gains are immediate. If you are already using Amplify for hosting, turning on PR previews is one of the highest-value configuration changes you can make.
