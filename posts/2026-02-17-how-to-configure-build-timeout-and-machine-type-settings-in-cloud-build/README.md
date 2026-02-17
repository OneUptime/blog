# How to Configure Build Timeout and Machine Type Settings in Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, CI/CD, DevOps, Build Configuration, Performance

Description: A practical guide to configuring build timeouts and machine types in Google Cloud Build to optimize build performance and avoid unnecessary failures.

---

If you have ever had a Cloud Build job fail because it ran out of time, or wondered why your builds are crawling along, you are not alone. The default settings in Cloud Build work for small projects, but once your builds get more involved - compiling large codebases, running extensive test suites, or building hefty Docker images - you need to tune the timeout and machine type settings.

Let me show you how to configure both of these settings and when it makes sense to change them.

## Understanding Default Settings

Out of the box, Cloud Build gives you:

- **Timeout**: 10 minutes (600 seconds) per build
- **Machine type**: e2-medium equivalent (1 vCPU, 4 GB RAM)

For a simple "build a small Docker image and push it" workflow, these defaults are fine. But real-world builds are rarely that simple.

## Configuring Build Timeout

### Setting Timeout in cloudbuild.yaml

You can set the timeout at the top level of your cloudbuild.yaml file. The value is specified in seconds with an 's' suffix:

```yaml
# cloudbuild.yaml - Set a 30-minute timeout for the entire build
timeout: 1800s

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:latest']
```

### Per-Step Timeout

You can also set timeouts on individual build steps. This is useful when you know a specific step should not take longer than a certain amount of time:

```yaml
# cloudbuild.yaml - Per-step timeouts
timeout: 3600s  # Overall build timeout: 1 hour

steps:
  # The build step gets 20 minutes
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
    timeout: 1200s

  # The test step gets 15 minutes
  - name: 'gcr.io/cloud-builders/docker'
    args: ['run', 'gcr.io/$PROJECT_ID/my-app:latest', 'npm', 'test']
    timeout: 900s

  # Push should be quick - 5 minutes max
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:latest']
    timeout: 300s
```

If a step exceeds its timeout, the build fails immediately without waiting for the overall timeout to expire. This is great for catching hung processes early.

### Setting Timeout via gcloud CLI

If you are submitting builds manually, you can set the timeout from the command line:

```bash
# Submit a build with a 45-minute timeout
gcloud builds submit \
  --config=cloudbuild.yaml \
  --timeout=2700s \
  --project=my-project
```

The CLI timeout overrides whatever is in the cloudbuild.yaml file, which is handy for one-off builds that need extra time.

### Maximum Timeout

The maximum timeout you can set is 24 hours (86400 seconds). If your build takes longer than that, you probably need to rethink your build strategy - break it into smaller builds or use caching more aggressively.

## Configuring Machine Types

### Available Machine Types

Cloud Build offers several machine type options. Here is what is available:

| Machine Type | vCPUs | Memory | Best For |
|---|---|---|---|
| E2_MEDIUM | 1 | 4 GB | Small builds, simple Docker images |
| E2_HIGHCPU_8 | 8 | 8 GB | Medium builds, parallel compilation |
| E2_HIGHCPU_32 | 32 | 32 GB | Large builds, heavy compilation |
| N1_HIGHCPU_8 | 8 | 7.2 GB | Legacy, use E2 instead |
| N1_HIGHCPU_32 | 32 | 28.8 GB | Legacy, use E2 instead |

### Setting Machine Type in cloudbuild.yaml

You configure the machine type in the options section:

```yaml
# cloudbuild.yaml - Use a larger machine for faster builds
options:
  machineType: 'E2_HIGHCPU_8'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:latest']
```

### Setting Machine Type via gcloud

```bash
# Submit with a specific machine type
gcloud builds submit \
  --config=cloudbuild.yaml \
  --machine-type=E2_HIGHCPU_32 \
  --project=my-project
```

## Combining Both Settings

Here is a realistic example that sets both timeout and machine type along with other useful options:

```yaml
# cloudbuild.yaml - Production-grade build configuration
options:
  # Use a high-CPU machine for faster builds
  machineType: 'E2_HIGHCPU_8'
  # Store logs in Cloud Logging
  logging: CLOUD_LOGGING_ONLY
  # Use a specific disk size for large builds (in GB)
  diskSizeGb: 200

# Give the build 45 minutes total
timeout: 2700s

steps:
  # Build the application
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--cache-from'
      - 'gcr.io/$PROJECT_ID/my-app:latest'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:latest'
      - '.'
    timeout: 1200s

  # Run tests
  - name: 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
    entrypoint: 'npm'
    args: ['test']
    timeout: 900s

  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:latest']

images:
  - 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/my-app:latest'
```

## Disk Size Configuration

While we are at it, disk size is another setting worth knowing about. The default is 100 GB, but if you are building large images or have a monorepo with lots of dependencies, you might need more:

```yaml
# cloudbuild.yaml - Increase disk size for large builds
options:
  machineType: 'E2_HIGHCPU_8'
  diskSizeGb: 500  # 500 GB disk
```

The maximum disk size is 2000 GB (2 TB). You are charged for the disk space, so do not go overboard.

## Cost Considerations

Bigger machines cost more. Here is the rough pricing breakdown:

- **E2_MEDIUM**: Included in the free tier (120 build-minutes per day)
- **E2_HIGHCPU_8**: About 8x the cost of the default
- **E2_HIGHCPU_32**: About 32x the cost of the default

The math is not always straightforward though. If a build takes 30 minutes on the default machine but only 5 minutes on an 8-vCPU machine, the larger machine actually costs less overall. I have seen this happen plenty of times with compilation-heavy builds.

## Using Build Triggers with Custom Settings

When you set up build triggers, you can override machine type and timeout per trigger:

```bash
# Create a trigger with a custom machine type and timeout
gcloud builds triggers create github \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_DEPLOY_ENV=production" \
  --description="Production build with large machine"
```

The settings in the trigger configuration take precedence over the cloudbuild.yaml defaults. This lets you use different machine types for different branches - a smaller machine for feature branches and a larger one for production builds.

## Practical Tips

A few things I have learned from running lots of Cloud Build jobs:

1. **Start with the default machine type** and only upgrade if builds are too slow. Profile your build to find the bottleneck before throwing more hardware at it.

2. **Set per-step timeouts** on steps that might hang - especially test steps and anything that involves network calls.

3. **Use caching** before upgrading machine types. Docker layer caching and dependency caching (using Cloud Storage buckets) often have a bigger impact than more CPUs.

4. **Monitor build times** using Cloud Monitoring. Set up alerts for builds that take longer than expected - it often signals a problem in your code or dependencies.

5. **Keep the overall timeout generous** but set per-step timeouts tight. This way a hung step fails fast but a legitimately slow build still has room to complete.

## Wrapping Up

Configuring timeout and machine type settings in Cloud Build is straightforward but makes a real difference in your CI/CD reliability and speed. The defaults are a reasonable starting point, but as your project grows, tuning these settings becomes important. Set your timeouts to match your actual build durations with some headroom, choose the right machine type based on your workload, and keep an eye on costs.
