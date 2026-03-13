# How to Use Shallow Clone for GitRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Git, Shallow Clone, Source Controller

Description: Configure Flux GitRepository resources to use shallow clones for faster artifact fetching and reduced network bandwidth.

---

## What Is a Shallow Clone

A shallow clone is a Git clone that downloads only a limited number of commits instead of the entire repository history. A depth of 1 fetches only the latest commit on the target branch, which is the minimum amount of data needed to produce a working tree of the current state.

## How Flux Handles Git Clones

The Flux source-controller clones each GitRepository resource on every reconciliation cycle to check for changes. By default, Flux already performs a shallow clone with depth 1 for performance. However, understanding this behavior and knowing how to verify and adjust it is important for optimizing large-scale deployments.

## Default Shallow Clone Behavior

When you create a GitRepository without specifying clone depth, Flux clones with depth 1:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo.git
  ref:
    branch: main
```

This is equivalent to running `git clone --depth=1 --branch=main`.

## When Shallow Clone Is Critical

Shallow clones provide the most benefit when:

- The repository has a long commit history (thousands of commits)
- The repository contains large files that have been modified many times
- You are cloning over a high-latency or bandwidth-constrained network
- You manage many GitRepository resources and want to minimize total network usage

## Verifying Shallow Clone Is Active

Check the source-controller logs to see clone behavior:

```bash
kubectl logs -n flux-system deploy/source-controller | \
  grep -i "clone\|fetch\|checkout"
```

You should see entries indicating shallow clone operations.

## Using a Tag Reference

When referencing a specific tag, Flux still performs an efficient fetch:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo.git
  ref:
    tag: v1.2.3
```

## Using a Commit Reference

When you pin to a specific commit, Flux must fetch enough history to reach that commit. This can be slower than a branch reference with depth 1:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo.git
  ref:
    commit: abc123def456
```

For performance, prefer branch or tag references over commit references when possible.

## Using SemVer Ranges

SemVer ranges require listing tags, which adds some overhead but does not require a full clone:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo.git
  ref:
    semver: ">=1.0.0 <2.0.0"
```

## Combining Shallow Clone with Ignore Rules

For maximum efficiency, combine shallow cloning with ignore rules to minimize both the clone size and the resulting artifact size:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-repo.git
  ref:
    branch: main
  ignore: |
    # Exclude everything except Kubernetes manifests
    /*
    !/deploy/
    !/base/
    !/overlays/
```

## Measuring Clone Performance

Compare clone times with different configurations:

```bash
# Time a reconciliation
START=$(date +%s)
kubectl annotate gitrepository my-repo -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
kubectl wait gitrepository my-repo -n flux-system \
  --for=condition=Ready --timeout=120s
END=$(date +%s)
echo "Completed in $((END - START)) seconds"
```

Run this before and after configuration changes to measure the impact.

## Limitations of Shallow Clones

Shallow clones have some limitations to be aware of:

- Flux cannot detect file renames across commits because the history is not available
- Some Git servers may not support shallow fetching for all reference types
- If your Kustomize overlays use Git-based remote references, those are resolved separately by Kustomize and are not affected by the GitRepository clone depth

## Summary

Shallow clones are the default behavior in Flux and provide significant performance benefits for large repositories. Verify that your GitRepository resources are using branch or tag references for optimal clone performance, combine with ignore rules for even faster artifact creation, and avoid commit references when possible.
