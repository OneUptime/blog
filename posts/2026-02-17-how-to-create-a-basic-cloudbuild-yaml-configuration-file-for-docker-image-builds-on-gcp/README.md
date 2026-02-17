# How to Create a Basic cloudbuild.yaml Configuration File for Docker Image Builds on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Docker, cloudbuild.yaml, CI/CD, Container Builds

Description: A beginner-friendly guide to writing your first cloudbuild.yaml file for building Docker images using Google Cloud Build on GCP.

---

If you are moving your Docker builds off your laptop and into the cloud, Google Cloud Build is one of the simplest ways to get started. The entire build process is defined in a single file called `cloudbuild.yaml` that lives in your repository. In this post, I will break down how to write a basic `cloudbuild.yaml` for building Docker images, explain what each piece does, and share some patterns that will save you time.

## What Is cloudbuild.yaml?

The `cloudbuild.yaml` file is the configuration file that tells Cloud Build what to do. It defines a series of build steps, where each step runs a Docker container that performs some action. Think of it as a recipe for your build process.

Cloud Build reads this file from your source code repository, executes each step in order, and reports the results back. The file uses standard YAML syntax, so if you have worked with Docker Compose or Kubernetes manifests, the format will feel familiar.

## Your First cloudbuild.yaml

Let's start with the simplest possible example - building a Docker image and pushing it to Google Container Registry (now called Artifact Registry):

```yaml
# Basic cloudbuild.yaml that builds a Docker image and pushes it
steps:
  # Step 1: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']

# Images to push after all steps complete
images:
  - 'gcr.io/$PROJECT_ID/my-app:latest'
```

Let me break down each part.

### The steps Field

The `steps` field is an array of build steps. Each step runs in its own container. The two required properties for each step are:

- **name** - The Docker image to use for this step. Cloud Build pulls this image and runs it.
- **args** - The arguments passed to the container's entrypoint.

In our example, `gcr.io/cloud-builders/docker` is a pre-built image provided by Google that contains the Docker CLI. The args are passed to the Docker CLI, so `['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']` translates to running `docker build -t gcr.io/$PROJECT_ID/my-app:latest .` inside the build environment.

### The images Field

The `images` field tells Cloud Build which images to push to the container registry after all steps complete. You do not need a separate push step - just list the images here and Cloud Build handles the push automatically.

### Built-In Substitutions

Notice the `$PROJECT_ID` variable. Cloud Build provides several built-in substitution variables:

- `$PROJECT_ID` - Your GCP project ID
- `$BUILD_ID` - A unique identifier for this build
- `$COMMIT_SHA` - The full Git commit SHA (when triggered from a repo)
- `$SHORT_SHA` - The first 7 characters of the commit SHA
- `$BRANCH_NAME` - The branch name
- `$TAG_NAME` - The tag name (for tag-triggered builds)
- `$REPO_NAME` - The repository name
- `$REVISION_ID` - Same as COMMIT_SHA

## Building and Tagging with Multiple Tags

In practice, you usually want more than just a `latest` tag. Here is a configuration that tags the image with both the Git commit SHA and `latest`:

```yaml
# Build with multiple tags for better version tracking
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:latest'
      - '.'

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/my-app:latest'
```

This way, each build produces a uniquely tagged image that you can reference later, while also keeping the `latest` tag pointing to the most recent build.

## Using Artifact Registry Instead of Container Registry

Google recommends using Artifact Registry instead of the older Container Registry. The cloudbuild.yaml looks almost the same, just with a different image path:

```yaml
# Build and push to Artifact Registry instead of Container Registry
steps:
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
```

The path format for Artifact Registry is `REGION-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG`. Make sure you create the Artifact Registry repository before running the build.

## Adding Build Arguments

If your Dockerfile uses build arguments (ARG instructions), you can pass them through the cloudbuild.yaml:

```yaml
# Pass build arguments to the Docker build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NODE_ENV=production'
      - '--build-arg'
      - 'APP_VERSION=$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
      - '.'

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
```

## Specifying a Dockerfile

If your Dockerfile is not in the root of your repository or has a non-standard name, use the `-f` flag:

```yaml
# Build using a Dockerfile from a subdirectory
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'docker/Dockerfile.production'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
      - '.'

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
```

Note that the build context (the `.` at the end) is still the repository root. The `-f` flag just tells Docker where to find the Dockerfile.

## Setting Build Timeout and Machine Type

By default, Cloud Build gives you a 10-minute timeout and a basic machine. For larger builds, you may need to adjust these:

```yaml
# Configure timeout and machine type for larger builds
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'

# Set a 30-minute timeout
timeout: 1800s

# Use a higher-spec machine for faster builds
options:
  machineType: 'E2_HIGHCPU_8'
```

Available machine types include:
- `UNSPECIFIED` - Default (1 vCPU)
- `N1_HIGHCPU_8` - 8 vCPUs
- `N1_HIGHCPU_32` - 32 vCPUs
- `E2_HIGHCPU_8` - 8 vCPUs (E2 series)
- `E2_HIGHCPU_32` - 32 vCPUs (E2 series)

## Running a Build Manually

To test your cloudbuild.yaml without setting up triggers, submit a build manually from the command line:

```bash
# Submit a build to Cloud Build from the current directory
gcloud builds submit --config=cloudbuild.yaml .
```

This uploads your source code to a GCS staging bucket, then runs the build in Cloud Build. You can watch the logs in real time in the terminal or in the Cloud Build console.

For faster iteration during development, you can also point to a specific source:

```bash
# Submit a build from a specific directory
gcloud builds submit --config=cloudbuild.yaml --substitutions=SHORT_SHA=dev123 ./src/
```

## A More Complete Example

Here is a more realistic cloudbuild.yaml that includes running tests before building the production image:

```yaml
# Complete build pipeline with tests and production image
steps:
  # Step 1: Build the test image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-test-image'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile.test'
      - '-t'
      - 'test-image'
      - '.'

  # Step 2: Run tests using the test image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'run-tests'
    args:
      - 'run'
      - '--rm'
      - 'test-image'
      - 'npm'
      - 'test'

  # Step 3: Build the production image (only runs if tests pass)
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-production'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:latest'
      - '.'

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/my-app:latest'

timeout: 1200s

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
```

Notice the `id` field on each step. This is optional but helpful for reading build logs and for referencing steps when you start using parallel execution (covered in a later topic).

## Wrapping Up

The cloudbuild.yaml file is the foundation of everything you do with Cloud Build. Start with the basic pattern of build-and-push, verify it works with a manual submit, and then layer on additional steps like testing, multi-stage builds, and deployment. The simplicity of the format is its strength - each step is just a container with arguments, so you can do anything in a build step that you can do in a Docker container. Keep your first configurations simple and add complexity only when you need it.
