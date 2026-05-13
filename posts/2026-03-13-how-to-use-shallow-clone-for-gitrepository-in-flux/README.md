# How to Use Shallow Clone for GitRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Git, Shallow Clone, Source Controller

Description: Configure Flux GitRepository resources to use shallow clones for faster artifact fetching and reduced network bandwidth.

---

## What Is a Shallow Clone

A shallow clone is a Git clone that downloads only a limited number of commits instead of the entire repository history. A depth of 1 fetches only the latest commit on the target branch, which is the minimum amount of data needed to produce a working tree of the current state.

## How Flux Handles Git Clones

The Flux source-controller fetches each GitRepository resource on every reconciliation cycle to check for changes and produce an artifact. By default, Flux performs shallow clones for supported references, using depth 1 for branch and tag references. There is no GitRepository field for setting clone depth, so optimization is mainly about choosing efficient references and reducing the artifact contents.

## Default Shallow Clone Behavior

When you create a GitRepository with a branch reference, Flux clones that branch with depth 1:

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

This is similar to running `git clone --depth=1 --branch=main --no-tags https://github.com/my-org/my-repo.git`.

## When Shallow Clone Is Critical

Shallow clones provide the most benefit when:

- The repository has a long commit history (thousands of commits)
- The repository contains large files that have been modified many times
- You are cloning over a high-latency or bandwidth-constrained network
- You manage many GitRepository resources and want to minimize total network usage

## Verifying Shallow Clone Is Active

There is no GitRepository spec field to enable shallow clone manually. For branch and tag references, shallow clone is source-controller behavior. You can still check the source-controller logs to confirm that the repository is being fetched and reconciled:

```bash
kubectl logs -n flux-system deploy/source-controller | \
  grep -i "clone\|fetch\|checkout"
```

You should see entries for repository fetch or checkout operations, but the logs may not print the clone depth explicitly.

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

When you pin to a specific commit without a branch, Flux cannot use the branch-only shallow clone path. This can be slower than a branch reference with depth 1:

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

For performance, prefer branch or tag references when possible. If you need to pin a commit, combine `commit` with `branch` when the commit exists on that branch so Flux can target that branch while checking out the commit:

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
    commit: abc123def456
```

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

For maximum efficiency, combine shallow cloning with ignore rules to minimize the resulting artifact size:

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

- Git history is not available in the generated artifact, so workflows that need previous commits or rename history should not rely on the GitRepository artifact alone
- Some Git servers may not support shallow fetching for all reference types
- If your Kustomize overlays use Git-based remote references, those are resolved separately by Kustomize and are not affected by the GitRepository clone depth

## Summary

Shallow clones are the default behavior in Flux and provide significant performance benefits for large repositories. Verify that your GitRepository resources are using branch or tag references for optimal clone performance, combine with ignore rules for even faster artifact creation, and avoid commit references when possible.
