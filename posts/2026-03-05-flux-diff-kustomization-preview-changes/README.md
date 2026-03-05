# How to Use flux diff kustomization to Preview Changes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Diff, Preview, Change Management

Description: Learn how to use the flux diff kustomization command to preview what changes Flux CD will apply to your cluster before reconciliation happens.

---

One of the challenges of GitOps is understanding what will actually change in your cluster when you push a commit. The `flux diff kustomization` command solves this by comparing the rendered output of your local manifests against what is currently running in the cluster. It shows you a detailed diff of what would be created, modified, or deleted during the next reconciliation, giving you confidence before merging changes.

This guide covers how to use `flux diff kustomization` effectively for change preview, pull request reviews, and safety checks.

## Prerequisites

- The `flux` CLI installed (version 2.1 or later)
- `kubectl` access to the target cluster
- A Git repository with Flux Kustomization resources
- A local checkout of the repository with pending changes

## What flux diff kustomization Does

The `flux diff kustomization` command performs the following steps:

1. Reads the Kustomization spec from the cluster
2. Runs `kustomize build` on the local path to produce the desired manifests
3. Applies any variable substitutions defined in the Kustomization
4. Compares the rendered output against the live resources in the cluster using server-side apply dry run
5. Outputs a unified diff showing what would change

This is the same comparison the kustomize-controller performs during reconciliation, so the diff accurately reflects what will happen.

## Basic Usage

To preview changes for a Kustomization that exists in the cluster:

```bash
flux diff kustomization my-app --path ./apps/my-app
```

If there are changes, the output shows a unified diff:

```diff
--- Deployment/default/my-app (live)
+++ Deployment/default/my-app (rendered)
@@ -15,7 +15,7 @@
     spec:
       containers:
         - name: my-app
-          image: ghcr.io/my-org/my-app:1.5.1
+          image: ghcr.io/my-org/my-app:1.5.2
           ports:
             - containerPort: 8080
```

If there are no changes, the command produces no output and exits with code 0.

## Understanding the Diff Output

The diff output follows the standard unified diff format:

- Lines prefixed with `---` show the current live state in the cluster
- Lines prefixed with `+++` show the desired state from your local manifests
- Lines prefixed with `-` are being removed
- Lines prefixed with `+` are being added
- Context lines (no prefix) are unchanged

Each resource that differs gets its own diff section, identified by the resource kind, namespace, and name.

## Previewing New Resources

When your changes include entirely new resources, the diff shows them as additions:

```diff
--- (none)
+++ ConfigMap/default/my-app-config (rendered)
@@ -0,0 +1,8 @@
+apiVersion: v1
+kind: ConfigMap
+metadata:
+  name: my-app-config
+  namespace: default
+data:
+  DATABASE_URL: "postgres://db.example.com:5432/myapp"
+  LOG_LEVEL: "info"
```

## Previewing Resource Deletions

When resources are removed from your manifests and the Kustomization has `prune: true`, the diff shows them as deletions:

```diff
--- ConfigMap/default/old-config (live)
+++ (none)
@@ -1,7 +0,0 @@
-apiVersion: v1
-kind: ConfigMap
-metadata:
-  name: old-config
-  namespace: default
-data:
-  DEPRECATED_KEY: "value"
```

## Using diff in Pull Request Workflows

The most powerful use of `flux diff kustomization` is in pull request reviews. Set up a CI job that runs the diff against the production cluster and posts the results as a PR comment:

```yaml
# .github/workflows/flux-diff.yaml
name: Flux Diff
on:
  pull_request:
    branches: [main]

jobs:
  diff:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Run Flux Diff
        id: diff
        run: |
          DIFF=$(flux diff kustomization my-app --path ./apps/my-app 2>&1 || true)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Comment on PR
        if: steps.diff.outputs.diff != ''
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### Flux Diff Preview\n\`\`\`diff\n${process.env.DIFF}\n\`\`\``
            })
        env:
          DIFF: ${{ steps.diff.outputs.diff }}
```

This workflow gives reviewers visibility into the exact cluster changes a PR will produce, similar to how Terraform plan works for infrastructure changes.

## Diffing Multiple Kustomizations

If your repository manages multiple Kustomizations, run diffs for each one:

```bash
for ks in my-app my-infra monitoring; do
  echo "=== Diff for $ks ==="
  flux diff kustomization $ks --path ./apps/$ks
  echo ""
done
```

Or target specific environments:

```bash
# Diff against staging cluster
KUBECONFIG=~/.kube/staging flux diff kustomization my-app --path ./apps/my-app

# Diff against production cluster
KUBECONFIG=~/.kube/production flux diff kustomization my-app --path ./apps/my-app
```

## Handling Variable Substitutions

If your Kustomization uses `postBuild` substitutions, `flux diff kustomization` automatically resolves them by reading the Kustomization spec from the cluster. This means the diff reflects the fully rendered output with all variables replaced.

For example, if your manifest contains `${REPLICAS}` and the Kustomization substitutes it with `3`, the diff will show the resolved value:

```diff
@@ -10,7 +10,7 @@
 spec:
-  replicas: 2
+  replicas: 3
```

## Exit Codes

The command uses exit codes to indicate the result:

- **0**: No differences found (cluster is up to date)
- **1**: Differences found (changes would be applied)
- **2**: An error occurred (build failure, cluster unreachable, etc.)

Use these exit codes in scripts:

```bash
flux diff kustomization my-app --path ./apps/my-app
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "No changes detected"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "Changes will be applied on next reconciliation"
else
  echo "Error running diff"
  exit 1
fi
```

## Comparing with flux build

While `flux build kustomization` shows you the rendered output, `flux diff kustomization` goes further by comparing that output against the live cluster state. Use them together:

- `flux build kustomization`: Validate that manifests render correctly
- `flux diff kustomization`: Preview what will change in the cluster

The build command works without cluster access (useful for CI validation), while the diff command requires cluster access to compare against live state.

## Summary

The `flux diff kustomization` command is an essential safety tool for GitOps workflows. It previews exactly what Flux will change in your cluster, showing creates, updates, and deletes in a familiar unified diff format. By integrating it into pull request workflows, you give reviewers the ability to see cluster impact before merging, reducing the risk of unexpected changes. Combined with `flux build kustomization` for manifest validation, it forms a complete pre-deployment verification pipeline that brings the predictability of infrastructure-as-code tools to your Kubernetes deployments.
