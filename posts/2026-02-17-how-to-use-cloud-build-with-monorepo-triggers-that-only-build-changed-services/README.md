# How to Use Cloud Build with Monorepo Triggers That Only Build Changed Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Monorepo, CI/CD, Triggers, DevOps, Microservices

Description: Configure Google Cloud Build triggers to detect which services changed in a monorepo and only build and deploy those specific services.

---

Monorepos are great for keeping related services together, but they create a challenge for CI/CD: you do not want to rebuild and redeploy every service when someone changes a single file in one service. Cloud Build has built-in support for path-based triggers that solve exactly this problem.

I have worked with monorepos that had 20+ services in a single repository, and without proper trigger configuration, every push would kick off builds for all of them. That is a waste of time and compute. Here is how to set it up properly.

## The Monorepo Structure

Let us say your repository looks like this:

```
my-monorepo/
  services/
    api/
      Dockerfile
      cloudbuild.yaml
      src/
    web/
      Dockerfile
      cloudbuild.yaml
      src/
    worker/
      Dockerfile
      cloudbuild.yaml
      src/
  shared/
    lib/
      utils.js
  infrastructure/
    terraform/
```

Each service has its own Dockerfile and cloudbuild.yaml. The `shared/` directory contains code used by multiple services.

## Creating Path-Based Triggers

Cloud Build triggers support an `includedFiles` filter that tells the trigger to only fire when specific file paths are changed. Here is how to create a trigger for the API service:

```bash
# Create a trigger that only fires when files in services/api/ change
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="services/api/cloudbuild.yaml" \
  --included-files="services/api/**" \
  --description="Build and deploy API service"
```

Now create one for the web service:

```bash
# Trigger for the web service
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="services/web/cloudbuild.yaml" \
  --included-files="services/web/**" \
  --description="Build and deploy Web service"
```

And one for the worker:

```bash
# Trigger for the worker service
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="services/worker/cloudbuild.yaml" \
  --included-files="services/worker/**" \
  --description="Build and deploy Worker service"
```

When you push a commit that only changes files in `services/api/`, only the API trigger fires. The web and worker triggers stay quiet.

## Handling Shared Code Changes

The tricky part is shared code. If someone changes `shared/lib/utils.js` and multiple services depend on it, you need all affected services to rebuild.

You handle this by including the shared paths in each trigger:

```bash
# API trigger - also fires on shared code changes
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="services/api/cloudbuild.yaml" \
  --included-files="services/api/**,shared/**" \
  --description="Build API service (also on shared changes)"
```

```bash
# Web trigger - also fires on shared code changes
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="services/web/cloudbuild.yaml" \
  --included-files="services/web/**,shared/**" \
  --description="Build Web service (also on shared changes)"
```

Now when shared code changes, all services that depend on it get rebuilt. When only the API service changes, only the API gets rebuilt.

## Using Excluded Files

Sometimes it is easier to specify what should not trigger a build. The `ignoredFiles` filter lets you do that:

```bash
# Build everything except when only docs or config files change
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --ignored-files="docs/**,*.md,*.txt,.gitignore" \
  --description="Build all services (ignore docs changes)"
```

You can combine `includedFiles` and `ignoredFiles`, but keep in mind that `includedFiles` is evaluated first. If a file matches both, it is still included.

## Per-Service Cloud Build Configuration

Each service should have its own cloudbuild.yaml that knows how to build and deploy just that service:

```yaml
# services/api/cloudbuild.yaml - Build config for the API service
steps:
  # Build the Docker image for the API
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/api:$SHORT_SHA'
      - '-f'
      - 'services/api/Dockerfile'
      - '.'  # Build context is the repo root (for shared code access)

  # Run API tests
  - name: 'gcr.io/$PROJECT_ID/api:$SHORT_SHA'
    entrypoint: 'npm'
    args: ['test']
    dir: 'services/api'

  # Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/api:$SHORT_SHA']

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['set', 'image', 'deployment/api', 'api=gcr.io/$PROJECT_ID/api:$SHORT_SHA']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'

images:
  - 'gcr.io/$PROJECT_ID/api:$SHORT_SHA'
```

Notice that the build context is set to `.` (the repo root) even though the Dockerfile is in `services/api/`. This lets the Docker build access shared code from the `shared/` directory.

## Dockerfile for Monorepo Services

Your Dockerfiles need to account for the monorepo structure:

```dockerfile
# services/api/Dockerfile - API service in a monorepo
FROM node:18-alpine

WORKDIR /app

# Copy shared code first
COPY shared/ ./shared/

# Copy service-specific code
COPY services/api/package*.json ./
RUN npm ci --production

COPY services/api/src/ ./src/

EXPOSE 8080
CMD ["node", "src/index.js"]
```

## Advanced: Dynamic Trigger Configuration with Terraform

If you have many services, managing triggers manually gets tedious. Use Terraform to define them:

```hcl
# main.tf - Dynamic Cloud Build triggers for all services
variable "services" {
  type = map(object({
    path          = string
    extra_paths   = list(string)
    build_config  = string
  }))
  default = {
    api = {
      path         = "services/api"
      extra_paths  = ["shared"]
      build_config = "services/api/cloudbuild.yaml"
    }
    web = {
      path         = "services/web"
      extra_paths  = ["shared"]
      build_config = "services/web/cloudbuild.yaml"
    }
    worker = {
      path         = "services/worker"
      extra_paths  = ["shared"]
      build_config = "services/worker/cloudbuild.yaml"
    }
  }
}

resource "google_cloudbuild_trigger" "service_trigger" {
  for_each = var.services

  name        = "${each.key}-trigger"
  description = "Build and deploy ${each.key} service"

  github {
    owner = "my-org"
    name  = "my-monorepo"

    push {
      branch = "^main$"
    }
  }

  # Include the service path and any extra paths (like shared code)
  included_files = concat(
    ["${each.value.path}/**"],
    [for p in each.value.extra_paths : "${p}/**"]
  )

  filename = each.value.build_config
}
```

## Trigger Ordering and Dependencies

Sometimes services depend on each other - maybe you need to build a shared library before building services that use it. You can handle this with a two-phase approach:

```yaml
# cloudbuild-shared.yaml - Build shared components first
steps:
  # Build and publish shared library
  - name: 'node:18'
    dir: 'shared/lib'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm ci
        npm run build
        npm publish --registry=https://us-npm.pkg.dev/my-project/my-repo/
```

Create a separate trigger for shared code that builds the library, and then the service triggers consume the published package.

## Handling Infrastructure Changes

For infrastructure code, you probably want a separate trigger entirely:

```bash
# Trigger for Terraform changes
gcloud builds triggers create github \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="infrastructure/cloudbuild.yaml" \
  --included-files="infrastructure/terraform/**" \
  --description="Apply infrastructure changes"
```

## Testing Your Trigger Configuration

Before relying on your triggers in production, test them:

```bash
# List all triggers to verify configuration
gcloud builds triggers list --project=my-project

# Manually run a specific trigger to test it
gcloud builds triggers run my-api-trigger \
  --branch=main \
  --project=my-project
```

Check the build logs to confirm that only the expected service was built.

## Wrapping Up

Path-based triggers in Cloud Build are the key to making monorepos work efficiently with CI/CD. The pattern is straightforward: create one trigger per service, use `includedFiles` to scope each trigger to its service directory, and add shared paths to triggers that depend on shared code. With this setup, a change to one service only rebuilds that service, while changes to shared code trigger rebuilds of everything that depends on it. This keeps build times short and compute costs low.
