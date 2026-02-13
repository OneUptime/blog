# How to Use CodeBuild with GitHub and Bitbucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, GitHub, Bitbucket, CI/CD

Description: Learn how to connect AWS CodeBuild to GitHub and Bitbucket repositories for automated builds, including webhook configuration, status checks, pull request builds, and build badges.

---

CodeBuild isn't limited to CodeCommit. It works natively with GitHub, GitHub Enterprise, and Bitbucket, complete with webhooks for automatic builds, build status reporting on pull requests, and build badges. If your code lives on GitHub or Bitbucket but you want your CI/CD on AWS, CodeBuild is a natural fit.

This guide covers connecting CodeBuild to both GitHub and Bitbucket, setting up webhooks for automated triggers, and configuring build status updates that show up directly on your pull requests.

## Connecting CodeBuild to GitHub

There are two ways to connect: OAuth (personal access) and a CodeStar Connections connection (recommended for organizations).

### Method 1: CodeStar Connection (Recommended)

CodeStar Connections provides a managed OAuth connection that your whole team can share.

```bash
# Create a connection to GitHub
aws codestar-connections create-connection \
  --provider-type GitHub \
  --connection-name github-org-connection

# The connection starts in PENDING status
# You need to complete the handshake in the AWS Console:
# Go to Developer Tools > Settings > Connections > click on the connection > Update pending connection
# This opens GitHub OAuth flow
```

After completing the handshake in the console, verify the connection is active.

```bash
# Check connection status
aws codestar-connections get-connection \
  --connection-arn "arn:aws:codestar-connections:us-east-1:123456789012:connection/abc-123"
```

Now create a CodeBuild project using this connection.

```bash
# Create a CodeBuild project with GitHub source via CodeStar Connection
aws codebuild create-project \
  --name github-app-build \
  --source '{
    "type": "GITHUB",
    "location": "https://github.com/myorg/my-application.git",
    "gitCloneDepth": 1,
    "buildspec": "buildspec.yml",
    "auth": {
      "type": "CODECONNECTIONS",
      "resource": "arn:aws:codestar-connections:us-east-1:123456789012:connection/abc-123"
    },
    "reportBuildStatus": true
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM"
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
```

The `reportBuildStatus: true` flag is important - it makes CodeBuild report build status back to GitHub, so you see green checks or red X marks on your commits and pull requests.

### Method 2: OAuth Token

For personal projects or quick setups, you can use a GitHub personal access token.

```bash
# Import the GitHub token as a source credential
aws codebuild import-source-credentials \
  --server-type GITHUB \
  --auth-type PERSONAL_ACCESS_TOKEN \
  --token "ghp_your_github_token_here"

# Create the project
aws codebuild create-project \
  --name github-app-build \
  --source '{
    "type": "GITHUB",
    "location": "https://github.com/myorg/my-application.git",
    "gitCloneDepth": 1,
    "buildspec": "buildspec.yml",
    "reportBuildStatus": true
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM"
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
```

Your GitHub token needs these scopes: `repo` (for private repos) and `admin:repo_hook` (for webhooks).

## Setting Up Webhooks for Automatic Builds

Webhooks trigger CodeBuild automatically when events happen in your repository. You can filter by event type, branch, and file path.

```bash
# Create a webhook for push events to main branch
aws codebuild create-webhook \
  --project-name github-app-build \
  --build-type BUILD \
  --filter-groups '[
    [
      {
        "type": "EVENT",
        "pattern": "PUSH"
      },
      {
        "type": "HEAD_REF",
        "pattern": "^refs/heads/main$"
      }
    ]
  ]'
```

### Build on Pull Requests

To build on pull request events (which is what most teams want):

```bash
# Webhook for pull request events
aws codebuild create-webhook \
  --project-name github-app-build \
  --build-type BUILD \
  --filter-groups '[
    [
      {
        "type": "EVENT",
        "pattern": "PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED,PULL_REQUEST_REOPENED"
      }
    ],
    [
      {
        "type": "EVENT",
        "pattern": "PUSH"
      },
      {
        "type": "HEAD_REF",
        "pattern": "^refs/heads/(main|develop)$"
      }
    ]
  ]'
```

The filter groups are OR'd together, while filters within a group are AND'd. So this webhook triggers when:
- A pull request is created, updated, or reopened (any branch), OR
- A push happens to main or develop branches

### Advanced Webhook Filters

You can get quite granular with filters.

```bash
# Build only when specific files change
aws codebuild create-webhook \
  --project-name github-app-build \
  --build-type BUILD \
  --filter-groups '[
    [
      {
        "type": "EVENT",
        "pattern": "PUSH"
      },
      {
        "type": "HEAD_REF",
        "pattern": "^refs/heads/main$"
      },
      {
        "type": "FILE_PATH",
        "pattern": "^src/|^tests/|^package\\.json$"
      }
    ]
  ]'

# Exclude certain branches
aws codebuild create-webhook \
  --project-name github-app-build \
  --build-type BUILD \
  --filter-groups '[
    [
      {
        "type": "EVENT",
        "pattern": "PUSH"
      },
      {
        "type": "HEAD_REF",
        "pattern": "^refs/heads/(dependabot|renovate)/",
        "excludeMatchedPattern": true
      }
    ]
  ]'
```

## Connecting to Bitbucket

The process for Bitbucket is very similar.

```bash
# Create a CodeStar connection to Bitbucket
aws codestar-connections create-connection \
  --provider-type Bitbucket \
  --connection-name bitbucket-org-connection

# Complete the OAuth handshake in the AWS Console

# Create a CodeBuild project with Bitbucket source
aws codebuild create-project \
  --name bitbucket-app-build \
  --source '{
    "type": "BITBUCKET",
    "location": "https://bitbucket.org/myorg/my-application.git",
    "gitCloneDepth": 1,
    "buildspec": "buildspec.yml",
    "auth": {
      "type": "CODECONNECTIONS",
      "resource": "arn:aws:codestar-connections:us-east-1:123456789012:connection/def-456"
    },
    "reportBuildStatus": true
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM"
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"

# Set up webhooks
aws codebuild create-webhook \
  --project-name bitbucket-app-build \
  --build-type BUILD \
  --filter-groups '[
    [
      {"type": "EVENT", "pattern": "PUSH"},
      {"type": "HEAD_REF", "pattern": "^refs/heads/main$"}
    ],
    [
      {"type": "EVENT", "pattern": "PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED"}
    ]
  ]'
```

## Build Badges

Build badges show the current build status in your README. Enable them in your CodeBuild project.

```bash
# Enable build badge
aws codebuild update-project \
  --name github-app-build \
  --badge-enabled

# Get the badge URL
aws codebuild batch-get-projects \
  --names github-app-build \
  --query 'projects[0].badge.badgeRequestUrl'
```

Add the badge to your README.md.

```markdown
![Build Status](https://codebuild.us-east-1.amazonaws.com/badges?uuid=YOUR_BADGE_UUID&branch=main)
```

## Pull Request Builds with Status Checks

When `reportBuildStatus` is enabled and webhooks are configured for PR events, CodeBuild reports status back to GitHub or Bitbucket. You can make this a required check in GitHub.

On GitHub:
1. Go to repository Settings > Branches > Branch protection rules
2. Add a rule for `main`
3. Enable "Require status checks to pass before merging"
4. Select your CodeBuild project from the list

Now pull requests can't be merged until CodeBuild reports a successful build.

## Buildspec for PR Builds

You might want different behavior for PR builds versus main branch builds.

```yaml
# buildspec.yml with PR-specific logic
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm ci

  pre_build:
    commands:
      - npm run lint
      - npm run typecheck

  build:
    commands:
      # Always run unit tests
      - npm test -- --ci

      # Only run full e2e tests on main branch pushes, not PRs
      - |
        if [ "$CODEBUILD_WEBHOOK_EVENT" = "PUSH" ] && \
           echo "$CODEBUILD_WEBHOOK_HEAD_REF" | grep -q "refs/heads/main"; then
          echo "Running E2E tests for main branch..."
          npm run test:e2e
        else
          echo "Skipping E2E tests for PR build"
        fi

      # Build
      - npm run build

  post_build:
    commands:
      # Post PR comment with build info (if it's a PR build)
      - |
        if [ -n "$CODEBUILD_WEBHOOK_TRIGGER" ] && echo "$CODEBUILD_WEBHOOK_TRIGGER" | grep -q "pr/"; then
          PR_NUMBER=$(echo $CODEBUILD_WEBHOOK_TRIGGER | sed 's/pr\///')
          echo "PR Build #$PR_NUMBER completed"
        fi

cache:
  paths:
    - "node_modules/**/*"
```

## Working with Multiple Source Providers

You can have CodeBuild pull from multiple sources in a single build. This is useful when your infrastructure code is in one repo and your application is in another.

```bash
aws codebuild create-project \
  --name multi-source-build \
  --source '{
    "type": "GITHUB",
    "location": "https://github.com/myorg/my-application.git",
    "buildspec": "buildspec.yml"
  }' \
  --secondary-sources '[
    {
      "type": "GITHUB",
      "location": "https://github.com/myorg/shared-config.git",
      "sourceIdentifier": "shared_config"
    }
  ]' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM"
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
```

In your buildspec, secondary sources are available in `$CODEBUILD_SRC_DIR_<sourceIdentifier>`.

```yaml
phases:
  build:
    commands:
      - echo "Primary source: $CODEBUILD_SRC_DIR"
      - echo "Shared config: $CODEBUILD_SRC_DIR_shared_config"
      - ls $CODEBUILD_SRC_DIR_shared_config/
```

## Troubleshooting

Common issues when connecting CodeBuild to external Git providers:

- **Webhook not triggering**: Check that the webhook was actually created in GitHub/Bitbucket (Settings > Webhooks). If it's missing, delete and recreate it via CodeBuild.
- **Build status not reporting**: Make sure `reportBuildStatus` is `true` and your token has the right scopes.
- **Permission denied on clone**: Verify your GitHub token hasn't expired and has `repo` scope.
- **Rate limiting**: GitHub has API rate limits. If you're running many builds, use a GitHub App token instead of a personal access token.

For end-to-end CI/CD pipeline monitoring, check out how to set up [infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) that covers your entire build and deployment chain.

Using CodeBuild with GitHub or Bitbucket gives you the best of both worlds: your code stays on the platform your team already knows and loves, while your CI runs on AWS infrastructure close to your deployment targets. The webhook integration means builds start automatically, and status reporting closes the feedback loop right on your pull requests.
