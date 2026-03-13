# How to Configure Image Tags with Git Branch and SHA for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, ImagePolicy, Git, Sha, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track container image tags that combine Git branch names and commit SHA hashes.

---

## Introduction

Not every team uses semantic versioning for their container images. A common alternative is tagging images with the Git branch name and commit SHA, producing tags like `main-abc1234` or `develop-def5678`. This approach ties each image directly to a specific commit in your source repository, making it easy to trace which code is running in your cluster.

Flux ImagePolicy supports this tagging pattern through its alphabetical and numerical sorting policies combined with tag filters. This guide shows you how to configure Flux to track images tagged with Git branch and SHA combinations.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A CI pipeline that tags images with the format `{branch}-{sha}`
- A GitRepository source configured in Flux

## Understanding the Tag Format

The Git branch and SHA tag format typically looks like one of these patterns:

- `main-a1b2c3d` (branch name followed by short SHA)
- `main-a1b2c3d4e5f6` (branch name followed by longer SHA)
- `feature-auth-abc1234` (feature branch with SHA)

Since these tags are not SemVer compliant, you cannot use the `semver` policy. Instead, you use the `alphabetical` policy with a filter pattern to select the latest image from a specific branch.

## Setting Up the ImageRepository

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 5m
```

## Configuring ImagePolicy for Branch-SHA Tags

To track the latest image from the `main` branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-[a-fA-F0-9]{7,40}$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

However, alphabetical ordering on SHA hashes does not give you the most recent commit. SHA hashes are random, so alphabetical order does not correspond to chronological order. To solve this, you need to include a timestamp or build number in your tag.

## Using Timestamps for Proper Ordering

The recommended approach is to include a timestamp in your image tag. Modify your CI pipeline to produce tags like `main-1678901234-abc1234` where the middle segment is a Unix timestamp or a sortable date:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<ts>[0-9]+)-[a-fA-F0-9]{7,40}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

This configuration filters tags that start with `main-`, extracts the timestamp portion, and uses numerical ordering to select the highest timestamp, which corresponds to the most recent build.

## Tracking a Specific Feature Branch

To track images from a feature branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-feature
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^feature-auth-(?P<ts>[0-9]+)-[a-fA-F0-9]{7,40}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

## Using Date-Formatted Tags

Some CI pipelines produce tags with date formats like `main-20260313-abc1234`. You can handle these with numerical extraction:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-dated
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<ts>[0-9]{8,14})-[a-fA-F0-9]{7}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

## CI Pipeline Tag Example

Here is a GitHub Actions step that produces the recommended tag format:

```yaml
- name: Build and push image
  run: |
    BRANCH=$(echo "${GITHUB_REF#refs/heads/}" | sed 's/\//-/g')
    SHA=$(echo "$GITHUB_SHA" | head -c 7)
    TIMESTAMP=$(date +%s)
    TAG="${BRANCH}-${TIMESTAMP}-${SHA}"
    docker build -t myorg/my-app:${TAG} .
    docker push myorg/my-app:${TAG}
```

## Marking Deployments for Updates

Add the image policy marker to your deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: docker.io/myorg/my-app:main-1678901234-abc1234 # {"$imagepolicy": "flux-system:my-app"}
```

## Verifying the Setup

Check the discovered tags and selected image:

```bash
flux get image repository my-app
flux get image policy my-app
```

To see which tags were discovered:

```bash
kubectl -n flux-system get imagerepository my-app -o yaml | grep -A 20 status
```

## Conclusion

Configuring Flux to track Git branch and SHA image tags requires a combination of tag filtering and numerical ordering. The key insight is that SHA hashes alone are not sortable chronologically, so including a timestamp or build number in your tag format is essential for correct ordering. With the `filterTags` pattern and `extract` field, you can isolate the sortable component and let Flux select the most recent build from any branch you choose.
