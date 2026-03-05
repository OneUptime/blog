# How to Configure Sortable Image Tags for Flux Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Tagging Strategy, CI/CD

Description: Learn how to design container image tagging strategies that work well with Flux image automation, including sortable formats for numerical, semver, and timestamp-based policies.

---

## Introduction

Flux image automation selects the "latest" image tag by sorting available tags according to a policy. For this to work correctly, your image tags must be sortable in a meaningful way. Tags like `latest`, `dev`, or random commit hashes cannot be sorted reliably. This guide explains how to design image tag formats that enable Flux to consistently pick the correct version.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Image automation controllers deployed
- A CI/CD pipeline that builds and tags container images

## Why Sortable Tags Matter

Flux ImagePolicy supports three sorting strategies:

1. **SemVer** - Sorts tags as semantic versions (e.g., `1.2.3`)
2. **Numerical** - Sorts tags as numbers (e.g., `42`, `43`, `44`)
3. **Alphabetical** - Sorts tags lexicographically (e.g., `a`, `b`, `c`)

If your tags do not conform to one of these patterns, the ImagePolicy cannot determine which tag is newest. A tag like `latest` is just a single value that never changes in sort order.

## Tag Format 1: Semantic Versioning

SemVer is the most widely used format. Tags follow the `MAJOR.MINOR.PATCH` pattern.

```bash
# Example CI/CD step that tags images with semver
# Assumes VERSION is set from your release process
docker build -t ghcr.io/my-org/my-app:${VERSION} .
docker push ghcr.io/my-org/my-app:${VERSION}

# Example tags produced: 1.0.0, 1.0.1, 1.1.0, 2.0.0
```

Configure the ImagePolicy with a semver range.

```yaml
# image-policy-semver.yaml
# Selects the latest tag matching the semver range
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

## Tag Format 2: Build Numbers

Sequential build numbers are simple and always sortable. Each CI build increments a counter.

```bash
# Example CI/CD step using a build number as the tag
# BUILD_NUMBER is provided by your CI system (e.g., GitHub Actions run number)
docker build -t ghcr.io/my-org/my-app:${BUILD_NUMBER} .
docker push ghcr.io/my-org/my-app:${BUILD_NUMBER}

# Example tags produced: 100, 101, 102, 103
```

Use the numerical policy to select the highest build number.

```yaml
# image-policy-build-number.yaml
# Selects the tag with the highest numeric value
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^[0-9]+$"
  policy:
    numerical:
      order: asc
```

The `filterTags.pattern` ensures only purely numeric tags are considered, excluding tags like `latest` or `dev`.

## Tag Format 3: Timestamps

Unix timestamps or formatted timestamps provide precise ordering.

```bash
# Example CI/CD step using a Unix timestamp as part of the tag
TIMESTAMP=$(date +%s)
docker build -t ghcr.io/my-org/my-app:${TIMESTAMP} .
docker push ghcr.io/my-org/my-app:${TIMESTAMP}

# Example tags produced: 1709654400, 1709740800, 1709827200
```

Use the numerical policy for Unix timestamps.

```yaml
# image-policy-timestamp.yaml
# Selects the most recent tag based on Unix timestamp
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^[0-9]{10}$"
  policy:
    numerical:
      order: asc
```

## Tag Format 4: Composite Tags with Extractable Components

Many teams use composite tags that include branch names, commit SHAs, and timestamps. Flux can extract the sortable component using a regex capture group.

```bash
# Example CI/CD step producing composite tags
# Format: branch-sha-timestamp
BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/\//-/g')
SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)
TAG="${BRANCH}-${SHA}-${TIMESTAMP}"

docker build -t ghcr.io/my-org/my-app:${TAG} .
docker push ghcr.io/my-org/my-app:${TAG}

# Example tags produced: main-a1b2c3d-1709654400, main-e4f5g6h-1709740800
```

Use `filterTags` with a named capture group to extract the timestamp.

```yaml
# image-policy-composite.yaml
# Extracts the timestamp from composite tags for numerical sorting
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^main-[a-f0-9]+-(?P<ts>[0-9]+)$"
    extract: "$ts"
  policy:
    numerical:
      order: asc
```

The `pattern` matches only tags from the `main` branch, and `extract` pulls out the timestamp for sorting. This is one of the most flexible approaches.

## Tag Format 5: Date-Based Tags

Human-readable date tags can be sorted alphabetically if formatted correctly.

```bash
# Example CI/CD step using ISO date format
# Format: YYYYMMDD-HHMMSS
TAG=$(date -u +%Y%m%d-%H%M%S)
docker build -t ghcr.io/my-org/my-app:${TAG} .
docker push ghcr.io/my-org/my-app:${TAG}

# Example tags produced: 20260301-143022, 20260302-091544
```

Because the format starts with the year and progresses to smaller units, alphabetical sorting produces chronological order.

```yaml
# image-policy-date.yaml
# Alphabetical sorting works for YYYYMMDD-HHMMSS formatted tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^[0-9]{8}-[0-9]{6}$"
  policy:
    alphabetical:
      order: asc
```

## Comparison of Tag Formats

| Format | Example | Policy Type | Pros | Cons |
|---|---|---|---|---|
| SemVer | 1.2.3 | semver | Widely understood, range support | Requires version management |
| Build number | 142 | numerical | Simple, always sortable | No version semantics |
| Unix timestamp | 1709654400 | numerical | Precise, no collisions | Not human-readable |
| Composite | main-abc-1709654400 | numerical (extracted) | Rich metadata | Complex regex needed |
| Date string | 20260301-143022 | alphabetical | Human-readable | Timezone sensitive |

## Anti-Patterns to Avoid

Tags that do not work well with Flux automation:

- **`latest`** - Never changes in sort order, Flux cannot detect updates
- **Random strings** - Not sortable in any meaningful way
- **Branch names only** - `main`, `develop` are not sortable versions
- **Commit SHA only** - `a1b2c3d` has no chronological order

## Conclusion

Designing sortable image tags is essential for reliable Flux image automation. Choose a tagging strategy that fits your release process, whether that is semver for formal releases, build numbers for continuous deployment, or composite tags with extractable timestamps. The key is that Flux must be able to sort your tags and determine which one is the newest.
