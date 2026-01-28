# How to Use OpenShift BuildConfigs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, BuildConfigs, CI/CD, Containers, DevOps

Description: Learn how OpenShift BuildConfigs work, how to configure source-to-image and Docker builds, trigger pipelines, and manage build history reliably.

---

OpenShift BuildConfigs turn source code into container images using the platform's build system. They are ideal when you want repeatable builds inside the cluster, with built-in triggers and consistent outputs for your deployments. This guide explains the core concepts and shows practical configurations.

## What Is a BuildConfig

A BuildConfig defines:

- The build strategy (Source-to-Image, Docker, or Custom)
- The source location (Git, binary input, or an image stream)
- Output image destination
- Triggers to run builds automatically
- History and retention settings

BuildConfigs are different from Tekton pipelines. Pipelines are better for full CI workflows, but BuildConfigs are simple and fast for straightforward container builds.

## Build Strategies at a Glance

- **Source-to-Image (S2I)**: Injects your source into a builder image that produces a runnable image.
- **Docker**: Builds from a Dockerfile in your repository.
- **Custom**: Runs a user-defined builder image with custom logic.

## Example 1: Source-to-Image BuildConfig

This example builds a Node.js app from a Git repo and pushes the image to an ImageStream.

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: web-s2i
spec:
  runPolicy: Serial
  source:
    type: Git
    git:
      uri: https://github.com/example/web-app.git
      ref: main
  strategy:
    type: Source
    sourceStrategy:
      from:
        kind: ImageStreamTag
        name: nodejs:18
  output:
    to:
      kind: ImageStreamTag
      name: web-s2i:latest
  triggers:
    - type: ConfigChange
    - type: GitHub
      github:
        secret: super-secret-webhook
```

## Example 2: Docker BuildConfig

This example uses a Dockerfile in your repo to build the image.

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: api-docker
spec:
  runPolicy: Serial
  source:
    type: Git
    git:
      uri: https://github.com/example/api.git
      ref: main
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  output:
    to:
      kind: ImageStreamTag
      name: api-docker:latest
  triggers:
    - type: ConfigChange
```

## Triggering Builds

You can trigger builds in several ways:

- **ConfigChange**: Runs when the BuildConfig changes.
- **GitHub / Generic Webhook**: Runs on pushes.
- **ImageChange**: Runs when a base image changes.
- **Manual**: Trigger via `oc start-build`.

### Manual Build Example

The command below starts a build and streams the logs. Use this when testing new settings.

```bash
oc start-build web-s2i --follow
```

## Build History and Retention

BuildConfigs keep build history, which can consume space. Use these settings to manage retention:

```yaml
spec:
  successfulBuildsHistoryLimit: 5
  failedBuildsHistoryLimit: 2
```

## Binary Builds for CI Systems

If you already build artifacts in CI, use binary builds to upload a local directory or a pre-built archive.

The command below uploads the current directory and starts a build.

```bash
oc start-build api-docker --from-dir=. --follow
```

## Security and Permissions

Builds run with a service account. Make sure it can:

- Pull base images
- Push to the output image stream
- Access secrets for Git or private registries

Use dedicated service accounts per team if you need isolation.

## Common Pitfalls

- **Long builds timing out**: Increase build timeouts or improve caching.
- **Missing base images**: Ensure image streams exist and are in the right namespace.
- **Webhook failures**: Check secrets and ensure inbound access to the webhook endpoint.

## Conclusion

OpenShift BuildConfigs are a clean way to build images inside the cluster without running a full CI system. Use S2I for fast developer workflows, Docker strategy for portability, and triggers for automation. For multi-step pipelines, consider OpenShift Pipelines, but for most app builds, BuildConfigs are still a great default.
