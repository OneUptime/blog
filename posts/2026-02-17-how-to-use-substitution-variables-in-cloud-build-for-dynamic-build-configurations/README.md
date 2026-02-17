# How to Use Substitution Variables in Cloud Build for Dynamic Build Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Substitution Variables, CI/CD, Build Configuration, DevOps

Description: Learn how to use built-in and custom substitution variables in Cloud Build to create flexible, reusable build configurations across environments.

---

Hardcoding values in your cloudbuild.yaml works fine until you need the same build configuration for different environments, services, or projects. Substitution variables let you parameterize your builds so that a single cloudbuild.yaml can serve multiple purposes. In this post, I will cover both the built-in variables that Cloud Build provides automatically and the custom variables you define yourself.

## Built-In Substitution Variables

Cloud Build provides several variables automatically for every build. You do not need to declare them - just reference them in your cloudbuild.yaml:

```yaml
# Built-in variables available in every Cloud Build run
$PROJECT_ID         # Your GCP project ID (e.g., "my-project-123")
$PROJECT_NUMBER     # Your GCP project number (e.g., "123456789")
$BUILD_ID           # Unique build ID (e.g., "abc-123-def-456")
$LOCATION           # Build region (e.g., "us-central1")
```

When triggered from a source repository, you also get:

```yaml
# Variables available when triggered from a repo
$COMMIT_SHA     # Full commit hash (e.g., "a1b2c3d4e5f6...")
$SHORT_SHA      # First 7 characters of commit hash (e.g., "a1b2c3d")
$BRANCH_NAME    # Branch that triggered the build (e.g., "main")
$TAG_NAME       # Tag name if triggered by a tag push
$REPO_NAME      # Repository name
$REPO_FULL_NAME # Full repository path (e.g., "owner/repo")
$REVISION_ID    # Same as COMMIT_SHA
$TRIGGER_NAME   # Name of the trigger that started the build
```

### Using Built-In Variables

You can reference these variables anywhere in your cloudbuild.yaml:

```yaml
# Using built-in variables to tag images and set build args
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'APP_VERSION=$SHORT_SHA'
      - '--build-arg'
      - 'BUILD_ID=$BUILD_ID'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$BRANCH_NAME'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$BRANCH_NAME'
```

This produces images tagged with both the commit SHA and the branch name, making it easy to identify which commit produced which image.

## Custom Substitution Variables

Custom substitution variables start with an underscore and are defined either in the trigger configuration or at build submission time. They let you parameterize builds for different environments, services, or configurations.

### Defining Custom Variables in Triggers

When creating a Cloud Build trigger, you can set default substitution values:

```bash
# Create a trigger with custom substitution variables
gcloud builds triggers create github \
  --name="deploy-staging" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_DEPLOY_ENV=staging,_CLUSTER_NAME=staging-cluster,_REGION=us-central1"
```

### Using Custom Variables in cloudbuild.yaml

Reference custom variables the same way as built-in ones:

```yaml
# cloudbuild.yaml using custom substitution variables
steps:
  # Build with environment-specific settings
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'DEPLOY_ENV=$_DEPLOY_ENV'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

  # Deploy to the correct environment
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'my-app-$_DEPLOY_ENV'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--region'
      - '$_REGION'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

# Declare substitutions with default values
substitutions:
  _DEPLOY_ENV: 'development'
  _CLUSTER_NAME: 'dev-cluster'
  _REGION: 'us-central1'
```

The `substitutions` block at the bottom defines default values. If the trigger or manual submission does not specify a value, the default is used.

### Passing Variables at Build Submission

When submitting builds manually, override substitution values with the `--substitutions` flag:

```bash
# Submit a build with custom substitution values
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_DEPLOY_ENV=production,_REGION=us-east1" \
  .
```

This lets you use the same cloudbuild.yaml for different deployments just by changing the variables.

## Practical Patterns

### Multi-Environment Deployments

Create one cloudbuild.yaml and multiple triggers with different substitution values:

```bash
# Staging trigger - fires on develop branch
gcloud builds triggers create github \
  --name="deploy-staging" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENV=staging,_MIN_INSTANCES=1,_MAX_INSTANCES=5"

# Production trigger - fires on main branch
gcloud builds triggers create github \
  --name="deploy-production" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENV=production,_MIN_INSTANCES=3,_MAX_INSTANCES=100"
```

The cloudbuild.yaml handles both:

```yaml
# Single cloudbuild.yaml for all environments
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NODE_ENV=$_ENV'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'my-app-$_ENV'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--region'
      - 'us-central1'
      - '--min-instances'
      - '$_MIN_INSTANCES'
      - '--max-instances'
      - '$_MAX_INSTANCES'

substitutions:
  _ENV: 'development'
  _MIN_INSTANCES: '0'
  _MAX_INSTANCES: '10'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
```

### Monorepo Service Selection

In a monorepo, use substitution variables to select which service to build:

```yaml
# Build a specific service from a monorepo
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'services/$_SERVICE_NAME/Dockerfile'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$_SERVICE_NAME:$SHORT_SHA'
      - 'services/$_SERVICE_NAME'

substitutions:
  _SERVICE_NAME: 'api'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/$_SERVICE_NAME:$SHORT_SHA'
```

Create a trigger per service:

```bash
# API service trigger
gcloud builds triggers create github \
  --name="build-api" \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_SERVICE_NAME=api" \
  --included-files="services/api/**"

# Web service trigger
gcloud builds triggers create github \
  --name="build-web" \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_SERVICE_NAME=web" \
  --included-files="services/web/**"
```

The `--included-files` flag ensures each trigger only fires when the relevant service's code changes.

### Dynamic Image Tags

Use substitutions to create informative image tags:

```yaml
# Create a descriptive image tag using substitution variables
steps:
  - name: 'bash'
    id: 'generate-tag'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Build a composite tag with environment, branch, and commit info
        echo "Building: $_ENV-$BRANCH_NAME-$SHORT_SHA"

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$_ENV-$SHORT_SHA'
      - '.'

substitutions:
  _ENV: 'dev'
```

## Using Variables in Script Blocks

When using substitution variables inside bash script blocks, they behave like string replacements - Cloud Build substitutes the values before the script runs:

```yaml
# Using substitution variables in bash scripts
steps:
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Cloud Build replaces $_ENV before this script executes
        echo "Deploying to environment: $_ENV"
        echo "Using image tag: $SHORT_SHA"

        if [ "$_ENV" = "production" ]; then
          echo "Running production deployment checks"
        fi
```

Be careful with the dollar sign in scripts. `$_ENV` gets replaced by Cloud Build, but `$HOME` or `$PATH` are shell variables. If you need a literal dollar sign that should not be substituted, use `$$`:

```yaml
# Escaping dollar signs to avoid Cloud Build substitution
steps:
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # $$HOME is a shell variable, not a Cloud Build substitution
        echo "Home directory: $$HOME"
        # $_ENV is a Cloud Build substitution
        echo "Environment: $_ENV"
```

## Validation and Debugging

Cloud Build validates substitution variable names at submission time. Custom variables must start with an underscore and use only uppercase letters, numbers, and underscores.

To see which substitution values were used for a specific build:

```bash
# View build details including substitution values
gcloud builds describe BUILD_ID --format="yaml(substitutions)"
```

If a substitution is not defined and has no default, Cloud Build leaves the variable reference as a literal string in the output. This can cause confusing errors, so always define defaults in the `substitutions` block.

## Wrapping Up

Substitution variables are what make a cloudbuild.yaml reusable across environments, services, and teams. The built-in variables handle the common needs like commit SHA and project ID, while custom variables let you parameterize anything else. The pattern of one cloudbuild.yaml with multiple triggers using different substitution values is a clean way to manage multi-environment deployments without duplicating build configurations. Start by replacing hardcoded project names and environment references with variables, and you will immediately see the benefits of a more flexible build setup.
