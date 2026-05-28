# How to Integrate Bitbucket Cloud Repositories with Google Cloud Build Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Bitbucket, CI/CD, Build Triggers, DevOps

Description: A complete guide to integrating Bitbucket Cloud repositories with Google Cloud Build triggers using the native connection or webhook approach.

---

If your team uses Bitbucket Cloud for source control but wants to build on Google Cloud Build, you are in luck - Cloud Build supports Bitbucket Cloud as a connected repository source. In this post, I will cover both the native Bitbucket connection method and the webhook-based approach, so you can pick whichever fits your setup best.

## Two Ways to Connect Bitbucket

Cloud Build offers two paths for Bitbucket integration:

1. **Connected Repositories (2nd Gen)** - Uses the Cloud Build Repositories API to connect Bitbucket directly. This is the newer, recommended approach.
2. **Webhook Triggers** - Similar to the GitLab webhook approach, where Bitbucket sends a POST request to Cloud Build on push events.

The connected repository approach is simpler and provides a better experience, so I will cover that first.

## Method 1: Connected Repositories

### Step 1: Create a Bitbucket Connection

First, you need to create a connection to Bitbucket Cloud in Cloud Build:

```bash
# Create a connection to Bitbucket Cloud

gcloud builds connections create bitbucket-cloud my-bitbucket-connection \
  --region=us-central1 \
  --authorizer-token-secret-version="projects/my-project/secrets/bitbucket-token/versions/latest" \
  --read-authorizer-token-secret-version="projects/my-project/secrets/bitbucket-read-token/versions/latest" \
  --webhook-secret-secret-version="projects/my-project/secrets/bitbucket-connection-webhook-secret/versions/latest" \
  --workspace="my-bitbucket-workspace"
```

Before running this, you need to store your Bitbucket Cloud access tokens and webhook secret in Secret Manager. Create an admin access token in Bitbucket with these permissions:

- Repositories: Read and Admin
- Webhooks: Read and Write
- Pull requests: Read

Create a second read access token with this permission:

- Repositories: Read

Then store it:

```bash
# Create a secret for the Bitbucket admin access token
gcloud secrets create bitbucket-token \
  --replication-policy="automatic"

echo -n "your-admin-access-token" | gcloud secrets versions add bitbucket-token --data-file=-

# Create a secret for the read-only access token
gcloud secrets create bitbucket-read-token \
  --replication-policy="automatic"

echo -n "your-read-only-access-token" | gcloud secrets versions add bitbucket-read-token --data-file=-

# Create a webhook secret for the connection
gcloud secrets create bitbucket-connection-webhook-secret \
  --replication-policy="automatic"

WEBHOOK_SECRET=$(openssl rand -base64 32)
echo -n "$WEBHOOK_SECRET" | gcloud secrets versions add bitbucket-connection-webhook-secret --data-file=-
```

### Step 2: Link a Repository

After creating the connection, link your specific repository:

```bash
# Link a Bitbucket repository to Cloud Build
gcloud builds repositories create my-app-repo \
  --remote-uri="https://bitbucket.org/my-workspace/my-app.git" \
  --connection=my-bitbucket-connection \
  --region=us-central1
```

### Step 3: Create a Trigger

Now create a trigger that uses the connected repository:

```bash
# Create a trigger using the connected Bitbucket repository
gcloud builds triggers create bitbucket-cloud \
  --name="build-on-push" \
  --repository="projects/my-project/locations/us-central1/connections/my-bitbucket-connection/repositories/my-app-repo" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region=us-central1
```

With this setup, any push to the `main` branch in your Bitbucket repository will automatically trigger a Cloud Build run.

### Setting Up Through the Console

If you prefer the UI approach, go to Cloud Build > Triggers in the GCP Console. Click "Create Trigger" and select "Bitbucket Cloud (Cloud Build Repositories - 2nd gen)" as the source.

The console will guide you through:
1. Creating or selecting a connection
2. Authorizing with Bitbucket
3. Selecting the repository
4. Configuring the trigger event and branch pattern
5. Pointing to your cloudbuild.yaml

## Method 2: Webhook Triggers

If you cannot use the connected repository approach or you need custom payload handling, webhook triggers are the alternative.

### Step 1: Create the Webhook Secret

```bash
# Create a secret for webhook verification
gcloud secrets create bitbucket-webhook-secret \
  --replication-policy="automatic"

SECRET=$(openssl rand -base64 32)
echo -n "$SECRET" | gcloud secrets versions add bitbucket-webhook-secret --data-file=-
```

### Step 2: Create the Webhook Trigger

```bash
# Create a webhook trigger with Bitbucket payload mappings
gcloud builds triggers create webhook \
  --name="bitbucket-webhook-trigger" \
  --secret="projects/${PROJECT_ID}/secrets/bitbucket-webhook-secret/versions/latest" \
  --substitutions='_BRANCH=$(body.push.changes[0].new.name),_COMMIT=$(body.push.changes[0].new.target.hash),_SHORT_COMMIT=${_COMMIT:0:7},_REPO_SLUG=$(body.repository.full_name)' \
  --inline-config="cloudbuild.yaml" \
  --region=us-central1 \
  --description="Triggers on Bitbucket push events"
```

Note the webhook URL that gcloud outputs.

### Step 3: Configure the Webhook in Bitbucket

Go to your Bitbucket repository settings > Webhooks > Add webhook:

- **Title** - Cloud Build Trigger
- **URL** - The webhook URL from the previous step
- **Triggers** - Repository push, Pull Request created, Pull Request updated

### Step 4: Handle Source Checkout in cloudbuild.yaml

Since webhook triggers do not auto-checkout source code, you need to clone the repository:

```yaml
# cloudbuild.yaml for Bitbucket webhook triggers
steps:
  # Clone the repository using Bitbucket credentials
  - name: 'gcr.io/cloud-builders/git'
    secretEnv: ['BITBUCKET_TOKEN']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Clone the Bitbucket repository
        git clone https://your-username:$$BITBUCKET_TOKEN@bitbucket.org/$_REPO_SLUG.git /workspace/source
        cd /workspace/source
        git checkout $_COMMIT

  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    dir: '/workspace/source'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$_SHORT_COMMIT'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$_SHORT_COMMIT'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/bitbucket-token/versions/latest
      env: 'BITBUCKET_TOKEN'
```

## Writing Your Build Configuration

Whether you use the connected repository or webhook approach, the cloudbuild.yaml follows the same structure. Here is a more complete example that includes testing:

```yaml
# Full build pipeline for a Bitbucket-hosted application
steps:
  # Run tests first
  - name: 'node:20'
    id: 'install-dependencies'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'run-tests'
    args: ['npm', 'test']

  # Build the production image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-image'
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

Note: The `$SHORT_SHA` substitution is automatically available when using connected repositories. For webhook triggers, you need to extract the commit from the webhook payload and define your own short commit substitution, as shown in the webhook trigger example above.

## Pull Request Builds

For pull request builds with connected repositories, create a second trigger:

```bash
# Create a pull request trigger for Bitbucket
gcloud builds triggers create bitbucket-cloud \
  --name="pr-check" \
  --repository="projects/my-project/locations/us-central1/connections/my-bitbucket-connection/repositories/my-app-repo" \
  --pull-request-pattern="^main$" \
  --build-config="cloudbuild-pr.yaml" \
  --region=us-central1 \
  --comment-control="COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
```

The PR build configuration typically runs tests without pushing images:

```yaml
# PR validation - run tests only
steps:
  - name: 'node:20'
    args: ['npm', 'ci']

  - name: 'node:20'
    args: ['npm', 'run', 'lint']

  - name: 'node:20'
    args: ['npm', 'test']

timeout: 600s
```

Cloud Build posts the build status back to the Bitbucket pull request when using connected repositories, so reviewers can see whether the build passed or failed directly in Bitbucket.

## Bitbucket Pipelines vs Cloud Build

If you are already using Bitbucket Pipelines, you might wonder why you would switch to Cloud Build. Here are a few reasons:

- **GCP-managed machine types** - Cloud Build default pools offer high-CPU machine types such as `e2-highcpu-32`, and private pools give you more control over build infrastructure
- **Longer timeouts** - Cloud Build allows builds up to 24 hours; Bitbucket Pipelines steps can be configured up to 12 hours
- **GCP integration** - Native access to Secret Manager, Artifact Registry, and other GCP services without extra configuration
- **Private pools** - Run builds in your own VPC for accessing private resources
- **Pricing** - Cloud Build offers 2,500 free build-minutes per month for eligible `e2-standard-2` default-pool builds; cost can be lower for heavy usage

That said, if Bitbucket Pipelines meets your needs and you do not need deep GCP integration, there is no need to switch just for the sake of it.

## Troubleshooting Common Issues

**Connection authorization fails** - Make sure the Bitbucket access tokens have the correct permissions. The most common missing permissions are Repositories: Admin and Webhooks: Read and Write.

**Trigger does not fire** - Verify the branch pattern matches. Bitbucket branch names are case-sensitive. Check the Cloud Build trigger logs in the GCP Console for any received but rejected events.

**Build fails with permission denied** - The Cloud Build service account needs access to Secret Manager secrets and Artifact Registry repositories. Grant the appropriate IAM roles.

**Webhook delivery fails** - Check the Bitbucket webhook history (Repository settings > Webhooks > View requests) for response codes and error messages.

## Wrapping Up

Integrating Bitbucket Cloud with Cloud Build gives you the best of both worlds - familiar source control in Bitbucket with powerful build infrastructure on GCP. The connected repository approach is cleaner and handles source checkout and status reporting automatically. Webhook triggers offer more flexibility if you need custom payload handling. Either way, the setup takes about 20 minutes and you get automated CI/CD running on Google's infrastructure.
