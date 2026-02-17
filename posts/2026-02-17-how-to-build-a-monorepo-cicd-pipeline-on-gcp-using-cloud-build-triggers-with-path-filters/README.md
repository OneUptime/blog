# How to Build a Monorepo CI/CD Pipeline on GCP Using Cloud Build Triggers with Path Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Monorepo, CI/CD, Path Filters

Description: Learn how to build an efficient CI/CD pipeline for monorepo projects on GCP using Cloud Build triggers with path filters to only build what changed.

---

Monorepos are popular for good reasons - shared tooling, atomic changes across services, and simplified dependency management. But they create a CI/CD challenge: when everything is in one repository, a naive pipeline rebuilds and redeploys everything on every commit, even if only one service changed.

Cloud Build's path filter feature solves this. You can create triggers that only fire when files in specific directories change. In this post, I will show you how to set up an efficient monorepo CI/CD pipeline on GCP that builds and deploys only what has actually changed.

## Monorepo Structure

Here is a typical monorepo layout:

```
my-monorepo/
  services/
    api-gateway/
      src/
      Dockerfile
      cloudbuild.yaml
      package.json
    user-service/
      src/
      Dockerfile
      cloudbuild.yaml
      package.json
    billing-service/
      src/
      Dockerfile
      cloudbuild.yaml
      requirements.txt
    notification-service/
      src/
      Dockerfile
      cloudbuild.yaml
      go.mod
  libs/
    common-utils/
      src/
      package.json
    auth-middleware/
      src/
      package.json
  infrastructure/
    terraform/
      modules/
      environments/
    cloudbuild.yaml
  .github/
  cloudbuild-shared.yaml
```

Each service has its own Dockerfile, build configuration, and source code. Shared libraries live in the `libs/` directory.

## Step 1: Create Per-Service Cloud Build Triggers

Create a trigger for each service with path filters so it only fires when that service's code changes:

```bash
# API Gateway trigger - fires when api-gateway code or shared libs change
gcloud builds triggers create github \
  --name="deploy-api-gateway" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=services/api-gateway/cloudbuild.yaml \
  --included-files="services/api-gateway/**,libs/common-utils/**,libs/auth-middleware/**"

# User Service trigger
gcloud builds triggers create github \
  --name="deploy-user-service" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=services/user-service/cloudbuild.yaml \
  --included-files="services/user-service/**,libs/common-utils/**"

# Billing Service trigger
gcloud builds triggers create github \
  --name="deploy-billing-service" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=services/billing-service/cloudbuild.yaml \
  --included-files="services/billing-service/**,libs/common-utils/**"

# Notification Service trigger
gcloud builds triggers create github \
  --name="deploy-notification-service" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=services/notification-service/cloudbuild.yaml \
  --included-files="services/notification-service/**,libs/common-utils/**"

# Infrastructure trigger
gcloud builds triggers create github \
  --name="deploy-infrastructure" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=infrastructure/cloudbuild.yaml \
  --included-files="infrastructure/**"
```

The key is the `--included-files` parameter. The trigger only fires if at least one of the changed files matches the specified patterns.

## Step 2: Create Per-Service Build Configurations

Each service has its own build configuration:

```yaml
# services/api-gateway/cloudbuild.yaml
steps:
  # Install shared dependencies
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Install shared library dependencies
        cd libs/common-utils && npm ci && cd /workspace
        cd libs/auth-middleware && npm ci && cd /workspace
        # Install service dependencies
        cd services/api-gateway && npm ci
    id: 'install'

  # Run tests
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd services/api-gateway
        npm test -- --ci --forceExit
    id: 'test'
    waitFor: ['install']

  # Build container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/services/api-gateway:$SHORT_SHA'
      - '-f'
      - 'services/api-gateway/Dockerfile'
      - '.'
    id: 'build'
    waitFor: ['test']

  # Push image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/services/api-gateway:$SHORT_SHA'
    id: 'push'
    waitFor: ['build']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'api-gateway'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/services/api-gateway:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
    id: 'deploy'
    waitFor: ['push']
```

## Step 3: Handle Shared Library Changes

When a shared library changes, all services that depend on it need to rebuild. The path filters handle this, but you can also create a dedicated trigger for shared library changes:

```bash
# When common-utils changes, trigger all dependent services
gcloud builds triggers create github \
  --name="rebuild-on-shared-lib-change" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-shared.yaml \
  --included-files="libs/**" \
  --ignored-files="libs/**/test/**"
```

```yaml
# cloudbuild-shared.yaml - Rebuild all affected services
steps:
  # Determine which services are affected by the library change
  - name: 'gcr.io/cloud-builders/git'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the changed files in this commit
        CHANGED_LIBS=$(git diff --name-only HEAD~1 HEAD -- libs/ | head -20)
        echo "Changed libraries:"
        echo "$CHANGED_LIBS"

        # Determine affected services based on dependency mapping
        AFFECTED_SERVICES=""

        if echo "$CHANGED_LIBS" | grep -q "libs/common-utils"; then
          AFFECTED_SERVICES="api-gateway user-service billing-service notification-service"
        fi

        if echo "$CHANGED_LIBS" | grep -q "libs/auth-middleware"; then
          AFFECTED_SERVICES="$AFFECTED_SERVICES api-gateway"
        fi

        # Deduplicate
        AFFECTED_SERVICES=$(echo "$AFFECTED_SERVICES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
        echo "Affected services: $AFFECTED_SERVICES"
        echo "$AFFECTED_SERVICES" > /workspace/affected_services.txt
    id: 'detect-affected'

  # Trigger builds for affected services
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        AFFECTED=$(cat /workspace/affected_services.txt)

        for service in $AFFECTED; do
          echo "Triggering build for: $service"
          gcloud builds triggers run "deploy-$service" \
            --branch=main \
            --project=$PROJECT_ID || true
        done
    id: 'trigger-rebuilds'
    waitFor: ['detect-affected']
```

## Step 4: PR Validation Triggers

For pull requests, run tests for all affected services:

```bash
# PR validation trigger with broad path filters
gcloud builds triggers create github \
  --name="pr-validate-all" \
  --repo-name=my-monorepo \
  --repo-owner=my-org \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml
```

```yaml
# cloudbuild-pr.yaml - Run tests for changed services only
steps:
  - name: 'gcr.io/cloud-builders/git'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Detect which services have changed
        git fetch origin main
        CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

        echo "Changed files:"
        echo "$CHANGED_FILES"

        SERVICES_TO_TEST=""

        # Check each service directory
        for service_dir in services/*/; do
          service_name=$(basename "$service_dir")
          if echo "$CHANGED_FILES" | grep -q "services/$service_name/"; then
            SERVICES_TO_TEST="$SERVICES_TO_TEST $service_name"
          fi
        done

        # Check shared libraries
        if echo "$CHANGED_FILES" | grep -q "libs/"; then
          # If shared libs changed, test all services
          SERVICES_TO_TEST="api-gateway user-service billing-service notification-service"
        fi

        echo "Services to test: $SERVICES_TO_TEST"
        echo "$SERVICES_TO_TEST" > /workspace/services_to_test.txt
    id: 'detect-changes'

  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        SERVICES=$(cat /workspace/services_to_test.txt)

        if [ -z "$SERVICES" ]; then
          echo "No service changes detected, skipping tests"
          exit 0
        fi

        FAILED=0
        for service in $SERVICES; do
          echo "========================================="
          echo "Testing: $service"
          echo "========================================="

          cd /workspace/services/$service

          if [ -f "package.json" ]; then
            npm ci
            npm test -- --ci --forceExit || FAILED=1
          elif [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
            python -m pytest tests/ || FAILED=1
          elif [ -f "go.mod" ]; then
            go test ./... || FAILED=1
          fi

          cd /workspace
        done

        exit $FAILED
    id: 'test-changed-services'
    waitFor: ['detect-changes']

  # Build check - verify all changed services can build
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        SERVICES=$(cat /workspace/services_to_test.txt)

        for service in $SERVICES; do
          echo "Building: $service"
          docker build \
            -t "$service:pr-test" \
            -f "services/$service/Dockerfile" \
            . || exit 1
        done
    id: 'build-check'
    waitFor: ['detect-changes']
```

## Step 5: Dependency Map Configuration

Maintain a dependency map so you always know which services depend on which libraries:

```yaml
# dependency-map.yaml
services:
  api-gateway:
    libs:
      - common-utils
      - auth-middleware
    language: node
  user-service:
    libs:
      - common-utils
    language: node
  billing-service:
    libs:
      - common-utils
    language: python
  notification-service:
    libs:
      - common-utils
    language: go
```

## Step 6: Monitor Build Performance

Track how your monorepo pipeline performs:

```bash
# Query recent builds and their durations per service
gcloud builds list \
  --filter="trigger_id!='' AND status=SUCCESS" \
  --format="table(id, createTime, duration, substitutions.TRIGGER_NAME)" \
  --limit=20
```

## Wrapping Up

Monorepo CI/CD on GCP comes down to one key feature: path-filtered triggers. By creating a trigger per service with the right path filters, you get targeted builds that only process what changed. When shared libraries change, the triggers for all dependent services fire automatically.

This approach gives you the benefits of a monorepo - shared code, atomic changes, unified tooling - without the cost of rebuilding everything on every commit. Start with one trigger per service, add shared library triggers, and tune the path filters as your codebase evolves.
