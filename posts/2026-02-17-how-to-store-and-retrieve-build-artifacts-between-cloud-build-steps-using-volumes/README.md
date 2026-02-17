# How to Store and Retrieve Build Artifacts Between Cloud Build Steps Using Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, CI/CD, Volumes, Build Artifacts, DevOps

Description: Learn how to share files and build artifacts between steps in Google Cloud Build using volumes and the workspace directory.

---

Each step in a Cloud Build pipeline runs in its own container. This means that if step one generates a compiled binary or a test report, step two will not automatically have access to it. Understanding how to pass data between steps is essential for building any non-trivial pipeline.

Cloud Build provides two main mechanisms for sharing data between steps: the built-in workspace volume and custom volumes. Let me walk through both approaches and show you when to use each one.

## The Default Workspace Volume

By default, Cloud Build mounts a persistent volume at `/workspace` for every step. This is the most common way to share files between build steps. Your source code gets cloned into `/workspace` at the beginning of the build, and any files you write there persist across all steps.

Here is a simple example:

```yaml
# cloudbuild.yaml - Using the default /workspace directory
steps:
  # Step 1: Build the application and output to /workspace/dist
  - name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm ci
        npm run build
        # The build output goes to /workspace/dist automatically
        ls -la dist/

  # Step 2: Run tests using the built artifacts
  - name: 'node:18'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # dist/ is still here from the previous step
        npm ci
        npm test

  # Step 3: Package everything into a Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']
```

Since all steps share `/workspace`, the build output from step one is available in steps two and three without any extra configuration.

## Understanding the Workspace Behavior

A few things to keep in mind about the workspace:

- The working directory for each step defaults to `/workspace`
- If you specify a `dir` field in a step, it is relative to `/workspace`
- The workspace persists for the entire build duration
- The workspace is destroyed after the build completes

Here is how the `dir` field works:

```yaml
# cloudbuild.yaml - Using the dir field
steps:
  # This runs in /workspace/frontend
  - name: 'node:18'
    dir: 'frontend'
    entrypoint: 'npm'
    args: ['ci']

  # This runs in /workspace/backend
  - name: 'node:18'
    dir: 'backend'
    entrypoint: 'npm'
    args: ['ci']

  # This runs in /workspace (the default)
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
```

## Custom Volumes for Temporary Data

Sometimes you need to share data that should not live in the workspace - maybe because it would interfere with your source code or Docker build context. Custom volumes let you mount additional shared directories.

```yaml
# cloudbuild.yaml - Using custom volumes
steps:
  # Step 1: Generate test data and store it in a custom volume
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Generate test fixtures
        python scripts/generate_fixtures.py
        # Save them to the custom volume
        cp -r fixtures/* /test-data/
    volumes:
      - name: 'test-data'
        path: '/test-data'

  # Step 2: Run tests using the generated data
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # The test data is available here
        ls /test-data/
        python -m pytest tests/ --fixtures-dir=/test-data
    volumes:
      - name: 'test-data'
        path: '/test-data'

  # Step 3: Build Docker image - no test data in the build context
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
    # Note: we do NOT mount the test-data volume here
```

The key difference from the workspace is that custom volumes are only available to steps that explicitly mount them. Step three in the example above does not see the test data at all, which keeps the Docker build context clean.

## Sharing Compiled Dependencies

A practical use case is sharing compiled dependencies between steps. For example, if you have a Go project and want to share the module cache:

```yaml
# cloudbuild.yaml - Sharing Go module cache between steps
steps:
  # Step 1: Download dependencies
  - name: 'golang:1.21'
    entrypoint: 'go'
    args: ['mod', 'download']
    volumes:
      - name: 'go-modules'
        path: '/go'

  # Step 2: Run tests (reuses downloaded modules)
  - name: 'golang:1.21'
    entrypoint: 'go'
    args: ['test', './...']
    volumes:
      - name: 'go-modules'
        path: '/go'

  # Step 3: Build the binary (reuses downloaded modules)
  - name: 'golang:1.21'
    entrypoint: 'go'
    args: ['build', '-o', '/workspace/app', './cmd/server']
    volumes:
      - name: 'go-modules'
        path: '/go'
```

Without the shared volume, each step would re-download all the Go modules, wasting time and bandwidth.

## Using Volumes for npm and pip Caches

The same pattern works for other package managers:

```yaml
# cloudbuild.yaml - Sharing npm cache
steps:
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci', '--cache', '/npm-cache']
    volumes:
      - name: 'npm-cache'
        path: '/npm-cache'

  - name: 'node:18'
    entrypoint: 'npm'
    args: ['test']
    volumes:
      - name: 'npm-cache'
        path: '/npm-cache'
```

```yaml
# cloudbuild.yaml - Sharing pip cache
steps:
  - name: 'python:3.11'
    entrypoint: 'pip'
    args: ['install', '-r', 'requirements.txt', '--cache-dir', '/pip-cache']
    volumes:
      - name: 'pip-cache'
        path: '/pip-cache'

  - name: 'python:3.11'
    entrypoint: 'python'
    args: ['-m', 'pytest']
    volumes:
      - name: 'pip-cache'
        path: '/pip-cache'
```

## Passing Data Between Steps Using Files

Sometimes you need to pass small pieces of data between steps - like a version number, a commit hash, or a dynamically generated configuration value. Writing to a file in the workspace is the simplest approach:

```yaml
# cloudbuild.yaml - Passing data via files
steps:
  # Step 1: Calculate the version and save it
  - name: 'ubuntu'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Generate a version string based on date and commit
        VERSION="1.0.$(date +%Y%m%d)-$SHORT_SHA"
        echo $VERSION > /workspace/VERSION
        echo "Building version: $VERSION"

  # Step 2: Use the version in the Docker build
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        VERSION=$(cat /workspace/VERSION)
        docker build \
          --build-arg VERSION=$VERSION \
          -t gcr.io/$PROJECT_ID/my-app:$VERSION \
          .

  # Step 3: Tag with the version
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        VERSION=$(cat /workspace/VERSION)
        docker push gcr.io/$PROJECT_ID/my-app:$VERSION
```

## Persisting Artifacts Beyond the Build

Volumes and workspace data are ephemeral - they disappear when the build finishes. If you need artifacts to survive past the build, upload them to Cloud Storage:

```yaml
# cloudbuild.yaml - Upload artifacts to Cloud Storage
steps:
  - name: 'golang:1.21'
    entrypoint: 'go'
    args: ['build', '-o', '/workspace/bin/myapp', './cmd/server']

  # Upload the binary to a GCS bucket
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['cp', '/workspace/bin/myapp', 'gs://my-build-artifacts/$BUILD_ID/myapp']

# Or use the artifacts section for automatic uploads
artifacts:
  objects:
    location: 'gs://my-build-artifacts/$BUILD_ID/'
    paths:
      - 'bin/myapp'
      - 'reports/*.xml'
```

The `artifacts` section at the bottom of the config is a cleaner way to handle this. Cloud Build will automatically upload the matching files after all steps complete successfully.

## Multiple Volumes in a Single Step

You can mount multiple volumes in a single step when needed:

```yaml
# cloudbuild.yaml - Multiple volumes in one step
steps:
  - name: 'ubuntu'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Access both volumes
        echo "cache contents:" && ls /cache
        echo "secrets:" && ls /secrets
    volumes:
      - name: 'build-cache'
        path: '/cache'
      - name: 'secrets-vol'
        path: '/secrets'
```

## Wrapping Up

Sharing data between Cloud Build steps is straightforward once you understand the two main mechanisms. Use `/workspace` for anything related to your source code and build output. Use custom volumes for temporary data, caches, and anything you want to keep separate from the build context. And when you need artifacts to persist beyond the build, upload them to Cloud Storage. These patterns cover the vast majority of real-world CI/CD pipeline needs.
