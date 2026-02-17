# How to Connect a GitLab Repository to Cloud Build Using Webhook Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, GitLab, Webhook Triggers, CI/CD, DevOps

Description: Learn how to connect your GitLab repository to Google Cloud Build using webhook triggers to automate builds from GitLab push and merge events.

---

While Cloud Build has native integration with GitHub and Cloud Source Repositories, connecting a GitLab repository requires a different approach. Webhook triggers let you bridge the gap - GitLab sends a webhook to Cloud Build whenever code changes happen, and Cloud Build kicks off a build in response. In this post, I will walk through how to set up this connection step by step.

## How Webhook Triggers Work

The flow is straightforward:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GL as GitLab
    participant CB as Cloud Build
    participant AR as Artifact Registry
    Dev->>GL: Push code
    GL->>CB: Webhook (POST)
    CB->>GL: Clone source
    CB->>CB: Run build steps
    CB->>AR: Push image
```

1. A developer pushes code to GitLab
2. GitLab sends a webhook notification to a Cloud Build endpoint
3. Cloud Build receives the webhook, clones the source code from GitLab, and runs the build
4. Build artifacts (Docker images, etc.) are pushed to the configured destination

## Prerequisites

Before starting, make sure you have:

- A GitLab repository (works with both GitLab.com and self-managed GitLab)
- A GCP project with Cloud Build API enabled
- The `gcloud` CLI installed and authenticated
- A Personal Access Token or Deploy Token from GitLab with read access to the repository

## Step 1: Create a Secret for the Webhook Authentication

Webhook triggers use a secret to verify that incoming requests are genuinely from GitLab. First, create a secret in Secret Manager:

```bash
# Generate a random secret string for webhook authentication
SECRET=$(openssl rand -base64 32)

# Store it in Secret Manager
gcloud secrets create gitlab-webhook-secret \
  --replication-policy="automatic"

echo -n "$SECRET" | gcloud secrets versions add gitlab-webhook-secret --data-file=-
```

Save this secret value - you will need it when configuring the webhook in GitLab.

## Step 2: Store GitLab Credentials in Secret Manager

Cloud Build needs credentials to clone your GitLab repository. Create a Personal Access Token in GitLab with `read_repository` scope, then store it in Secret Manager:

```bash
# Store the GitLab access token in Secret Manager
echo -n "your-gitlab-access-token" | gcloud secrets versions add gitlab-access-token --data-file=-
```

If the secret does not exist yet:

```bash
# Create the secret first, then add the value
gcloud secrets create gitlab-access-token \
  --replication-policy="automatic"

echo -n "your-gitlab-access-token" | gcloud secrets versions add gitlab-access-token --data-file=-
```

## Step 3: Grant Cloud Build Access to Secrets

The Cloud Build service account needs permission to read these secrets:

```bash
# Get the Cloud Build service account email
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant access to the webhook secret
gcloud secrets add-iam-policy-binding gitlab-webhook-secret \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to the GitLab token
gcloud secrets add-iam-policy-binding gitlab-access-token \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Create the Webhook Trigger

Now create the Cloud Build webhook trigger using gcloud:

```bash
# Create a webhook trigger for the GitLab repository
gcloud builds triggers create webhook \
  --name="gitlab-push-trigger" \
  --secret="projects/${PROJECT_ID}/secrets/gitlab-webhook-secret/versions/latest" \
  --substitutions="_BRANCH_NAME=\$(body.ref),_REPO_URL=\$(body.repository.git_http_url),_COMMIT_SHA=\$(body.after)" \
  --build-config="cloudbuild.yaml" \
  --repo-type="GITLAB" \
  --description="Triggers build on GitLab push events"
```

The `--substitutions` flag maps values from the GitLab webhook payload to Cloud Build substitution variables. GitLab sends a JSON body with details about the push event, and you can extract fields from it using the `$(body.field)` syntax.

After creating the trigger, gcloud will output a webhook URL that looks like:

```
https://cloudbuild.googleapis.com/v1/projects/PROJECT_ID/triggers/TRIGGER_NAME:webhook?key=API_KEY&secret=SECRET_VALUE
```

Copy this URL - you will configure it in GitLab next.

## Step 5: Configure the Webhook in GitLab

Go to your GitLab project, then navigate to Settings > Webhooks. Click "Add new webhook" and configure:

- **URL** - Paste the webhook URL from the previous step
- **Secret token** - Enter the same secret value you stored in Secret Manager
- **Trigger events** - Select "Push events" (and optionally "Merge request events" if you want PR builds)
- **SSL verification** - Keep enabled

Click "Add webhook" to save. GitLab will show the webhook in the list with a "Test" button. Click "Test" > "Push events" to send a test webhook and verify the connection.

## Step 6: Write the cloudbuild.yaml

Your cloudbuild.yaml needs to handle cloning the source from GitLab since webhook triggers do not automatically check out the source code like GitHub triggers do:

```yaml
# cloudbuild.yaml for GitLab webhook-triggered builds
steps:
  # Step 1: Clone the repository from GitLab
  - name: 'gcr.io/cloud-builders/git'
    secretEnv: ['GITLAB_TOKEN']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Clone the GitLab repository using the access token
        git clone https://oauth2:$$GITLAB_TOKEN@gitlab.com/my-group/my-project.git /workspace/source
        cd /workspace/source
        git checkout $_COMMIT_SHA

  # Step 2: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    dir: '/workspace/source'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:${_COMMIT_SHA:0:7}'
      - '.'

  # Step 3: Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:${_COMMIT_SHA:0:7}'

# Access the GitLab token from Secret Manager
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/gitlab-access-token/versions/latest
      env: 'GITLAB_TOKEN'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
```

A few things to note about this configuration:

- The `secretEnv` field makes the GitLab token available as an environment variable in the clone step
- The `dir` field on the build step sets the working directory to the cloned repository
- The `availableSecrets` section links the Secret Manager secret to the environment variable

## Handling Different GitLab Events

### Branch Filtering

The webhook trigger receives all push events. To filter by branch, add logic to your cloudbuild.yaml:

```yaml
# First step: Check if the branch matches our target
steps:
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Extract branch name from refs/heads/main format
        BRANCH=$(echo "$_BRANCH_NAME" | sed 's|refs/heads/||')
        if [ "$BRANCH" != "main" ]; then
          echo "Skipping build for branch: $BRANCH"
          exit 0
        fi
        echo "Building for branch: $BRANCH"
```

Alternatively, you can create separate triggers for different branches and filter using the webhook substitution values.

### Merge Request Triggers

For merge request events, the GitLab webhook payload has a different structure. Create a separate trigger with appropriate substitutions:

```bash
# Create a trigger specifically for GitLab merge request events
gcloud builds triggers create webhook \
  --name="gitlab-mr-trigger" \
  --secret="projects/${PROJECT_ID}/secrets/gitlab-webhook-secret/versions/latest" \
  --substitutions="_SOURCE_BRANCH=\$(body.object_attributes.source_branch),_TARGET_BRANCH=\$(body.object_attributes.target_branch),_MR_ID=\$(body.object_attributes.iid)" \
  --build-config="cloudbuild-mr.yaml" \
  --description="Runs tests on GitLab merge requests"
```

## Posting Build Status Back to GitLab

One limitation of webhook triggers is that Cloud Build does not automatically post build status back to GitLab (unlike GitHub integrations). You can work around this by adding a final step that uses the GitLab API:

```yaml
# Post build status back to GitLab
  - name: 'gcr.io/cloud-builders/curl'
    secretEnv: ['GITLAB_TOKEN']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Report the build status to GitLab's commit status API
        curl --request POST \
          --header "PRIVATE-TOKEN: $$GITLAB_TOKEN" \
          "https://gitlab.com/api/v4/projects/PROJECT_ID/statuses/$_COMMIT_SHA?state=success&name=cloud-build&target_url=https://console.cloud.google.com/cloud-build/builds/$BUILD_ID"
```

This posts a commit status to GitLab, which shows up as a green check or red X on the commit and merge request pages.

## Troubleshooting

**Webhook not triggering builds** - Check the webhook delivery logs in GitLab (Settings > Webhooks > Edit > Recent deliveries). Look for non-200 response codes. Common causes include an incorrect webhook URL or secret mismatch.

**Source clone failing** - Verify the GitLab access token has `read_repository` scope and has not expired. Test the token manually with a curl command.

**Substitution variables empty** - The `$(body.field)` syntax must match the GitLab webhook payload structure exactly. Use the GitLab webhook test feature to see the actual payload structure.

## Wrapping Up

Connecting GitLab to Cloud Build through webhooks takes a bit more setup than the native GitHub integration, but the end result is functionally equivalent. You get automatic builds on push events, the ability to filter by branch, and full access to the Cloud Build feature set. The main extra steps are managing the webhook secret, handling the git clone yourself, and optionally posting build status back to GitLab. Once configured, it works reliably and scales with your team.
