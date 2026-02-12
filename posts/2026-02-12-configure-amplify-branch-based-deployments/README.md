# How to Configure Amplify Branch-Based Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, CI/CD, Git, Branch Deployments, DevOps

Description: A practical guide to configuring branch-based deployments in AWS Amplify for isolated testing environments per branch

---

One of the most useful features in AWS Amplify is branch-based deployments. Every branch in your Git repository can get its own fully isolated environment with its own URL, backend resources, and environment variables. This means your team can test features in production-like settings before merging to main, without stepping on each other's work.

This guide covers how to set up, configure, and manage branch-based deployments in Amplify, including pattern-based auto-detection, per-branch environment variables, and backend isolation.

## How Branch-Based Deployments Work

When you connect a Git repository to Amplify, you initially choose one branch to deploy. But Amplify can watch for additional branches and automatically create new deployments when they appear. Each branch deployment gets:

- A unique URL like `https://branch-name.d1234abcd.amplifyapp.com`
- Its own build pipeline
- Optionally, its own backend resources (databases, APIs, auth)
- Independent environment variables

```mermaid
graph TD
    A[Git Repository] --> B[main branch]
    A --> C[develop branch]
    A --> D[feature/login branch]
    B --> E[Production: main.d123.amplifyapp.com]
    C --> F[Staging: develop.d123.amplifyapp.com]
    D --> G[Preview: feature-login.d123.amplifyapp.com]
    E --> H[Production Backend]
    C --> I[Staging Backend]
    D --> J[Preview Backend]
```

## Step 1: Enable Branch Auto-Detection

In the Amplify console, navigate to your app and select "Hosting" then "Branch settings." You will see options for managing connected branches.

To enable automatic branch detection:

1. Click "Add branch" and select "Branch autodetection"
2. Set a pattern to match branches you want deployed automatically
3. Common patterns include:
   - `*` to deploy every branch
   - `feature/*` to deploy only feature branches
   - `release/*` to deploy release candidates

You can also exclude patterns. For example, deploy everything except `dependabot/*` branches to avoid wasting build minutes on automated dependency updates.

## Step 2: Configure Branch Patterns in amplify.yml

Your `amplify.yml` file can include branch-specific build commands. This is useful when different branches need different build configurations:

```yaml
# amplify.yml - Branch-specific build configuration
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        # Use different build commands per branch
        - if [ "$AWS_BRANCH" = "main" ]; then
            npm run build:production;
          elif [ "$AWS_BRANCH" = "develop" ]; then
            npm run build:staging;
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

The `$AWS_BRANCH` environment variable is automatically set by Amplify and contains the name of the branch being built.

## Step 3: Set Per-Branch Environment Variables

Different branches often need different environment variables. Your production branch connects to a production database, while feature branches should use a development database.

In the Amplify console, go to "Hosting" then "Environment variables." You can set variables at two levels:

**App-level variables** apply to all branches:

```
# These apply to every branch
NEXT_PUBLIC_APP_NAME=MyApp
NODE_ENV=production
```

**Branch-level overrides** apply only to a specific branch:

```
# Override for the 'develop' branch
API_URL=https://staging-api.example.com
DATABASE_URL=postgresql://user:pass@staging-db:5432/myapp

# Override for the 'main' branch
API_URL=https://api.example.com
DATABASE_URL=postgresql://user:pass@production-db:5432/myapp
```

Branch-level variables take precedence over app-level variables with the same name.

## Step 4: Configure Backend Environment Isolation

If you are using Amplify backend resources (Auth, API, Storage), each branch can have its own isolated backend. This prevents feature branches from corrupting production data.

```bash
# Create a new backend environment for a branch
amplify env add

# When prompted, name it after your branch
# ? Enter a name for the environment: staging

# Push the backend resources to create them in AWS
amplify push
```

In the Amplify console, you can map branches to backend environments:

| Branch | Backend Environment |
|--------|-------------------|
| main | production |
| develop | staging |
| feature/* | dev |

This mapping means all feature branches share a single `dev` backend, while `main` and `develop` each get their own isolated resources.

## Step 5: Set Up Branch Access Controls

Not every branch deployment should be publicly accessible. Amplify lets you add password protection to specific branches:

1. In the Amplify console, go to "Hosting" then "Access control"
2. Select the branch you want to protect
3. Choose "Restricted - password required"
4. Set a username and password

This is especially useful for staging environments that should only be visible to your team and QA testers.

```
# Access control configuration
main: Publicly accessible
develop: Restricted (username: team, password: *****)
feature/*: Restricted (username: dev, password: *****)
```

## Step 6: Configure Notifications for Branch Deployments

Stay informed about deployment status by setting up notifications. Amplify can send notifications through Amazon SNS:

```bash
# Create an SNS topic for build notifications
aws sns create-topic --name amplify-build-notifications

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:amplify-build-notifications \
  --protocol email \
  --notification-endpoint team@example.com
```

Then in the Amplify console, go to "Notifications" and connect the SNS topic to build events. You can receive alerts for:

- Build started
- Build succeeded
- Build failed

## Step 7: Manage Branch Lifecycle

Branches come and go, and you do not want stale deployments sitting around consuming resources. Amplify offers a few ways to handle this:

**Auto-deletion**: When you enable branch auto-detection, you can also enable auto-deletion. This means when a branch is deleted from your Git repository, Amplify automatically tears down the associated deployment and backend resources.

**Manual cleanup**: In the Amplify console, you can disconnect individual branches. This removes the deployment but does not delete the Git branch.

**TTL (Time to Live)**: For preview deployments, you can set a TTL so environments are automatically deleted after a certain period, even if the branch still exists.

## Workflow Example

Here is a typical workflow using branch-based deployments:

1. Developer creates `feature/user-profile` branch
2. Amplify auto-detects the branch and starts building
3. Build completes, developer gets URL: `feature-user-profile.d123.amplifyapp.com`
4. Developer shares the URL with the team for review
5. QA tests the feature in isolation
6. Feature is merged to `develop`, triggering a staging build
7. After staging validation, `develop` is merged to `main`
8. Production deploys automatically
9. `feature/user-profile` branch is deleted, Amplify cleans up

## Custom Domains Per Branch

You can assign custom subdomains to specific branches. In the Amplify console under "Domain management":

```
main -> www.example.com
develop -> staging.example.com
feature/* -> *.preview.example.com
```

This gives your staging and preview environments clean, memorable URLs.

## Debugging Branch Deployments

When a branch deployment fails, check these common issues:

**Missing environment variables**: A branch might be missing variables that are set on other branches. Use the Amplify console to compare variable configurations between branches.

**Build command differences**: If your `amplify.yml` uses branch-conditional logic, make sure the conditions match your actual branch names.

**Backend resource conflicts**: If multiple branches share a backend environment, concurrent deployments can cause CloudFormation conflicts. Stagger your pushes or give each branch its own backend.

For more on handling build issues, see our guide on [troubleshooting Amplify build failures](https://oneuptime.com/blog/post/troubleshoot-amplify-build-failures/view).

## Cost Considerations

Each branch deployment adds to your Amplify costs. Build minutes are charged per minute, and each SSR deployment incurs Lambda and CloudFront costs. To keep costs under control:

- Limit auto-detection to branches with specific prefixes (like `feature/*` or `release/*`)
- Enable auto-deletion so unused environments are cleaned up
- Set TTLs on preview environments
- Use shared backend environments for non-production branches

## Wrapping Up

Branch-based deployments in Amplify give your team a powerful workflow for testing and reviewing changes in isolated environments. With auto-detection, per-branch variables, backend isolation, and access controls, you can build a CI/CD pipeline that mirrors your Git branching strategy exactly. Combined with pull request previews, this creates a tight feedback loop between code changes and visible results.
