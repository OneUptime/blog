# How to Configure Image Tags with Regex Extraction for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, image-automation, Kubernetes, GitOps, Regex

Description: Learn how to use regex extraction in Flux CD ImagePolicy to parse complex image tag formats and select the right version.

---

## Introduction

Container image tags often encode multiple pieces of information such as version numbers, build identifiers, Git commit SHAs, and timestamps. Flux CD's ImagePolicy resource supports regex-based tag filtering and extraction, allowing you to parse complex tag formats and select the appropriate image based on the extracted value.

This guide demonstrates how to use the `filterTags` field with regex capture groups to handle various real-world tag formats.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- Container images with structured tag formats in your registry
- Familiarity with Go-compatible regular expressions

## Understanding filterTags

The `filterTags` field in an ImagePolicy spec has two subfields:

- `pattern`: A Go-compatible regular expression with named capture groups
- `extract`: A template string that references the named capture groups

When Flux evaluates the policy, it applies the regex to each tag. Tags that do not match the pattern are discarded. For matching tags, the `extract` template produces a string that is then evaluated by the chosen policy (semver, numerical, or alphabetical).

## Example 1: Extracting Version from Build Tags

Suppose your CI pipeline produces tags like `build-42-v1.3.7` where `42` is the build number and `v1.3.7` is the semantic version.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-\d+-v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This pattern matches tags starting with `build-`, followed by any number of digits, a hyphen, and then a semantic version prefixed with `v`. The `version` capture group extracts just the version number, which the semver policy then evaluates.

## Example 2: Extracting Timestamp from SHA Tags

Some pipelines produce tags like `abc1234-20260313120000` combining a short Git SHA with a timestamp.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^[a-f0-9]{7}-(?P<ts>\d{14})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

The regex matches a 7-character hex string followed by a 14-digit timestamp. The `ts` capture group extracts the timestamp, and the `numerical` policy with ascending order selects the tag with the highest (most recent) timestamp.

## Example 3: Multi-Part Extraction

For tags like `release-1.5.0-linux-amd64`, you may want to filter by architecture and extract the version:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-amd64
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^release-(?P<version>\d+\.\d+\.\d+)-linux-amd64$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This filters only `linux-amd64` tags and extracts the semantic version for sorting.

## Example 4: Branch-Based Tags

If your registry has tags like `main-20260313-abc1234` and `feature-xyz-20260313-def5678`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-main
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<date>\d{8})-[a-f0-9]+$'
    extract: '$date'
  policy:
    numerical:
      order: asc
```

This selects only tags from the `main` branch and sorts them by the date component.

## Example 5: Channel-Based Tags

For tags like `stable-v2.1.0`, `beta-v2.2.0-rc.1`, `alpha-v2.3.0-alpha.5`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-stable
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^stable-v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

By anchoring the pattern with `$` and not allowing pre-release suffixes, this policy only picks up stable releases.

## Verifying the Extraction

After applying your ImagePolicy, check whether the regex is matching tags correctly:

```bash
kubectl -n flux-system get imagepolicy my-app -o jsonpath='{.status.latestImage}'
```

If the output is empty or unexpected, review the ImageRepository scan results:

```bash
kubectl -n flux-system get imagerepository my-app -o jsonpath='{.status.lastScanResult.tagCount}'
```

You can also inspect Flux logs for pattern matching details:

```bash
kubectl -n flux-system logs deploy/image-reflector-controller | grep my-app
```

## Common Regex Pitfalls

1. **Unescaped dots**: In regex, `.` matches any character. Use `\.` to match a literal dot in version strings.
2. **Missing anchors**: Without `^` and `$`, the pattern may match substrings of longer tags unexpectedly.
3. **Greedy quantifiers**: `.*` is greedy and may capture more than intended. Use `.*?` for non-greedy matching or be specific with character classes.
4. **Named group syntax**: Flux uses Go regex syntax. Named groups are written as `(?P<name>pattern)`, not `(?<name>pattern)`.

## Conclusion

Regex extraction in Flux CD ImagePolicy provides the flexibility to handle virtually any tag naming convention. By combining named capture groups with the appropriate sorting policy, you can reliably select the correct image from complex tag formats. This capability is essential for teams with established CI/CD conventions who want to adopt GitOps without changing their tagging strategy.
