# How to Set Up Cloud Build Triggers for Automatic Builds on GitHub Push Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, GitHub, CI/CD, Build Triggers, Automation

Description: Step-by-step instructions for configuring Cloud Build triggers that automatically build your application when code is pushed to GitHub.

---

Manually submitting builds every time you push code gets old fast. Cloud Build triggers automate this by watching your GitHub repository for push events and kicking off builds automatically. In this post, I will walk through the full setup process, from connecting GitHub to Cloud Build to configuring triggers that respond to exactly the events you care about.

## Connecting GitHub to Cloud Build

Before you can create triggers, you need to connect your GitHub repository to Cloud Build. There are two ways to do this:

1. **Cloud Build GitHub App** - The recommended approach. Installs a GitHub App that manages the connection.
2. **GitHub (mirrored)** - Mirrors your repo to Cloud Source Repositories, then triggers from there. This adds latency and is generally not recommended for new setups.

### Installing the Cloud Build GitHub App

Navigate to the Cloud Build section in the GCP Console. Click "Triggers" in the left sidebar, then click "Connect Repository."

Select "GitHub (Cloud Build GitHub App)" as the source. Click "Authenticate" to sign into your GitHub account. You will be redirected to GitHub to authorize the Cloud Build app.

After authorization, you can choose which repositories to grant access to:

- **All repositories** - The Cloud Build app can access all current and future repos in your GitHub account or organization
- **Select repositories** - Only grant access to specific repos

For most teams, selecting specific repositories is the safer choice. You can always add more repositories later.

After selecting repositories, click "Connect" to complete the setup. Your GitHub repository is now linked to Cloud Build.

## Creating Your First Trigger

With the repository connected, click "Create Trigger" on the Triggers page. Here are the key settings:

### Basic Configuration

```yaml
# Trigger configuration
Name: build-on-push-to-main
Description: Builds and pushes Docker image when code is pushed to main
Event: Push to a branch
```

Choose a descriptive name. The event type determines when the trigger fires:

- **Push to a branch** - Fires when commits are pushed to a matching branch
- **Push new tag** - Fires when a new tag is created
- **Pull request** - Fires when a PR is opened or updated

### Source Configuration

Select the GitHub repository you connected earlier. Then configure the branch pattern:

```yaml
# Branch filter configuration
Branch: ^main$
```

The branch field accepts regular expressions. `^main$` matches exactly the `main` branch. Here are some common patterns:

```
# Match only the main branch
^main$

# Match any branch starting with "release/"
^release/.*

# Match all branches (default)
.*

# Match main or develop branches
^(main|develop)$
```

### Build Configuration

You have three options for specifying what the trigger should build:

1. **Cloud Build configuration file** - Use a cloudbuild.yaml from your repository (recommended)
2. **Dockerfile** - Build a Docker image directly without a cloudbuild.yaml
3. **Buildpacks** - Use Google Cloud Buildpacks to detect and build your app

For the Cloud Build configuration file option, specify the path to your cloudbuild.yaml:

```yaml
# Build configuration
Type: Cloud Build configuration file
Location: Repository
Cloud Build configuration file location: /cloudbuild.yaml
```

If your cloudbuild.yaml lives in a subdirectory (e.g., for a monorepo), specify the full path:

```yaml
Cloud Build configuration file location: /services/my-app/cloudbuild.yaml
```

## Configuring the Trigger with the gcloud CLI

If you prefer the command line, you can create triggers using gcloud:

```bash
# Create a Cloud Build trigger for GitHub push events on the main branch
gcloud builds triggers create github \
  --name="build-on-push-to-main" \
  --repo-name="my-app" \
  --repo-owner="my-github-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Builds on push to main"
```

This creates the same trigger as the UI configuration above. The gcloud approach is useful for scripting trigger creation across multiple repositories.

## A Complete Example: GitHub Push to Docker Image

Let's put together a full example. Your repository has this structure:

```
my-app/
  Dockerfile
  cloudbuild.yaml
  src/
    app.js
    package.json
```

The Dockerfile builds a Node.js application:

```dockerfile
# Production Dockerfile for the Node.js application
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/

EXPOSE 8080
CMD ["node", "src/app.js"]
```

The cloudbuild.yaml builds and pushes the image:

```yaml
# Build configuration triggered on push to main
steps:
  # Build the Docker image with both commit SHA and latest tags
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'

options:
  machineType: 'E2_HIGHCPU_8'
```

With the trigger configured to watch the `main` branch, every push to main will automatically build the Docker image and push it to Artifact Registry.

## Setting Up Triggers for Pull Requests

Pull request triggers are useful for validating code before it gets merged. Create a separate trigger with the event type set to "Pull Request":

```bash
# Create a trigger that runs on pull requests targeting main
gcloud builds triggers create github \
  --name="pr-check" \
  --repo-name="my-app" \
  --repo-owner="my-github-org" \
  --pull-request-pattern="^main$" \
  --build-config="cloudbuild-pr.yaml" \
  --comment-control="COMMENTS_ENABLED" \
  --description="Runs tests on PRs targeting main"
```

The `--comment-control` flag determines whether the trigger responds to `/gcbrun` comments on PRs. Options are:

- `COMMENTS_DISABLED` - Always run on PR events
- `COMMENTS_ENABLED` - Only run when a repo collaborator comments `/gcbrun`
- `COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY` - Auto-run for org members, require comment for external contributors

For your PR build configuration, you typically want to run tests but skip the image push:

```yaml
# PR validation build - runs tests without pushing images
steps:
  # Install dependencies
  - name: 'node:20'
    args: ['npm', 'ci']

  # Run linting
  - name: 'node:20'
    args: ['npm', 'run', 'lint']

  # Run tests
  - name: 'node:20'
    args: ['npm', 'test']

timeout: 600s
```

## Tag-Based Triggers for Releases

For release workflows, create a trigger that fires when a Git tag is pushed:

```bash
# Create a trigger for semantic version tags
gcloud builds triggers create github \
  --name="release-build" \
  --repo-name="my-app" \
  --repo-owner="my-github-org" \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config="cloudbuild-release.yaml" \
  --description="Builds release images on version tags"
```

The tag pattern `^v[0-9]+\.[0-9]+\.[0-9]+$` matches semantic version tags like `v1.2.3`. In your release build config, use the `$TAG_NAME` substitution:

```yaml
# Release build that tags the image with the version number
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$TAG_NAME'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$TAG_NAME'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
```

## Adding Substitution Variables to Triggers

Triggers can pass custom substitution variables to the build. This is useful for shared cloudbuild.yaml files across multiple services:

```bash
# Create a trigger with custom substitution variables
gcloud builds triggers create github \
  --name="build-api-service" \
  --repo-name="my-monorepo" \
  --repo-owner="my-github-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_SERVICE_NAME=api,_DEPLOY_ENV=production"
```

In the cloudbuild.yaml, reference these with `$_SERVICE_NAME` and `$_DEPLOY_ENV`.

## Verifying Your Trigger Works

After creating a trigger, push a commit to the matching branch and watch the build start:

```bash
# Make a change, commit, and push to trigger the build
git add .
git commit -m "Test Cloud Build trigger"
git push origin main
```

Navigate to the Cloud Build history page in the GCP Console. You should see a new build starting within a few seconds. The build page shows real-time logs and the status of each step.

If the build does not start, check that the trigger is enabled, the branch pattern matches, and the Cloud Build GitHub App has access to the repository.

## Wrapping Up

Cloud Build triggers turn your manual build process into an automated CI pipeline with minimal configuration. The combination of GitHub integration and the flexible trigger system covers most workflows - push-to-build for main, test-on-PR, and tag-for-release. Start with a single trigger on your main branch, verify it works, and then add PR and tag triggers as your workflow requires. The setup takes about 15 minutes and saves you from ever having to remember to run a build manually again.
