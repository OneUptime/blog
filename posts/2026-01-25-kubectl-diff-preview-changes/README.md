# How to Use kubectl diff to Preview Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, DevOps, Configuration Management, CI/CD, Best Practices

Description: Learn how to use kubectl diff to preview changes before applying them to your Kubernetes cluster. This guide covers basic usage, integration with CI/CD pipelines, and best practices for safe deployments.

---

Applying changes blindly to a Kubernetes cluster is risky. The `kubectl diff` command shows you exactly what will change before you commit to it. It compares your local manifests against the live cluster state, helping you catch mistakes before they cause outages.

## Basic Usage

The syntax mirrors `kubectl apply`:

```bash
# Preview changes for a single file
kubectl diff -f deployment.yaml

# Preview changes for a directory
kubectl diff -f ./manifests/

# Preview changes from stdin
cat deployment.yaml | kubectl diff -f -

# Preview changes with kustomize
kubectl diff -k ./overlays/production/
```

## Understanding the Output

The output uses standard diff format:

```bash
$ kubectl diff -f deployment.yaml

diff -u -N /tmp/LIVE-123/apps.v1.Deployment.default.myapp /tmp/MERGED-456/apps.v1.Deployment.default.myapp
--- /tmp/LIVE-123/apps.v1.Deployment.default.myapp
+++ /tmp/MERGED-456/apps.v1.Deployment.default.myapp
@@ -6,7 +6,7 @@
   spec:
     containers:
     - name: myapp
-      image: myapp:1.0.0
+      image: myapp:1.1.0
       resources:
         limits:
-          memory: "256Mi"
+          memory: "512Mi"
```

Lines starting with `-` will be removed. Lines starting with `+` will be added.

## Practical Examples

### Preview a Deployment Update

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5  # Changed from 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: api-server:2.0.0  # Changed from 1.5.0
          resources:
            limits:
              memory: "1Gi"  # Changed from 512Mi
            requests:
              memory: "512Mi"
```

```bash
$ kubectl diff -f deployment.yaml

# Output shows:
# - replicas: 3 -> 5
# - image: 1.5.0 -> 2.0.0
# - memory limit: 512Mi -> 1Gi
```

### Preview ConfigMap Changes

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  LOG_LEVEL: "debug"  # Changed from "info"
  MAX_CONNECTIONS: "200"  # New key
  DATABASE_URL: "postgres://db.internal:5432/app"
```

```bash
$ kubectl diff -f configmap.yaml

# Shows added and modified keys
```

### Preview Multiple Resources

```bash
# Preview all changes in a directory
kubectl diff -f ./k8s/

# Preview with recursive search
kubectl diff -R -f ./k8s/
```

## Exit Codes

`kubectl diff` uses exit codes to indicate the result:

| Exit Code | Meaning |
|-----------|---------|
| 0 | No differences found |
| 1 | Differences exist |
| >1 | Error occurred |

Use this in scripts:

```bash
#!/bin/bash
# safe-deploy.sh

kubectl diff -f ./manifests/

case $? in
    0)
        echo "No changes to apply"
        exit 0
        ;;
    1)
        echo "Changes detected. Review above and confirm."
        read -p "Apply changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl apply -f ./manifests/
        fi
        ;;
    *)
        echo "Error running diff"
        exit 1
        ;;
esac
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Kubernetes

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Preview changes
        run: |
          kubectl diff -f ./k8s/ > diff-output.txt 2>&1 || true

      - name: Comment PR with diff
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('diff-output.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Kubernetes Diff\n```diff\n' + diff + '\n```'
            });

  deploy:
    needs: diff
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Apply changes
        run: kubectl apply -f ./k8s/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - diff
  - deploy

diff:
  stage: diff
  script:
    - kubectl diff -f ./k8s/ || true
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

deploy:
  stage: deploy
  script:
    - kubectl diff -f ./k8s/
    - kubectl apply -f ./k8s/
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  when: manual
```

## Using with Kustomize

Preview kustomize overlays before applying:

```bash
# Preview base
kubectl diff -k ./base/

# Preview production overlay
kubectl diff -k ./overlays/production/

# Preview staging overlay
kubectl diff -k ./overlays/staging/
```

Example directory structure:

```
kustomize/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    production/
      kustomization.yaml
      replicas-patch.yaml
    staging/
      kustomization.yaml
```

```bash
# See what production overlay changes
$ kubectl diff -k ./overlays/production/

# Typical output shows overlay modifications:
# - replicas: 3 -> 10 (production scaling)
# - resource limits increased
```

## Using with Helm

Preview Helm chart changes:

```bash
# Generate manifests and diff
helm template my-release ./my-chart --values production-values.yaml | kubectl diff -f -

# For installed releases, compare upgrade
helm diff upgrade my-release ./my-chart --values production-values.yaml
```

Note: `helm diff` is a plugin that needs to be installed:

```bash
helm plugin install https://github.com/databus23/helm-diff
```

## Filtering Diff Output

### Ignore Specific Fields

Some fields change on every diff (like `resourceVersion`). Filter them out:

```bash
# Using grep to filter noise
kubectl diff -f deployment.yaml 2>&1 | grep -v "resourceVersion" | grep -v "generation"

# Using KUBECTL_EXTERNAL_DIFF for custom diff tool
export KUBECTL_EXTERNAL_DIFF="diff -u --ignore-matching-lines=resourceVersion"
kubectl diff -f deployment.yaml
```

### Custom Diff Tool

Use a custom diff tool for better output:

```bash
# Use colordiff for colored output
export KUBECTL_EXTERNAL_DIFF="colordiff -u"
kubectl diff -f deployment.yaml

# Use dyff for semantic YAML diff
export KUBECTL_EXTERNAL_DIFF="dyff between --omit-header"
kubectl diff -f deployment.yaml
```

## Common Scenarios

### Checking Secret Changes

Secrets are base64 encoded, making diffs hard to read:

```bash
# Decode and diff secrets manually
kubectl get secret my-secret -o yaml > current-secret.yaml
# Edit or compare with your new secret file
diff current-secret.yaml new-secret.yaml
```

### Namespace-Specific Diff

```bash
# Diff only in a specific namespace
kubectl diff -f deployment.yaml -n production

# Diff across all namespaces (if manifests specify namespaces)
kubectl diff -f ./all-namespaces/
```

### Dry Run Validation

Combine diff with dry-run for extra validation:

```bash
# First validate the manifest
kubectl apply --dry-run=server -f deployment.yaml

# Then see what would change
kubectl diff -f deployment.yaml

# Finally apply
kubectl apply -f deployment.yaml
```

## Troubleshooting

### Diff Shows Unexpected Changes

Some controllers add default fields:

```bash
# Compare against server defaults
kubectl get deployment myapp -o yaml > live.yaml
kubectl diff -f deployment.yaml

# The diff might show fields you did not set
# These are controller-managed fields
```

### Permission Errors

Diff requires read access to existing resources:

```bash
# Check your permissions
kubectl auth can-i get deployments
kubectl auth can-i get configmaps
```

### Resource Not Found

If the resource does not exist, diff shows the entire manifest as an addition:

```bash
$ kubectl diff -f new-deployment.yaml

# Output shows all lines with + prefix
# This is expected for new resources
```

## Best Practices

1. **Always diff before apply** in production
2. **Use in CI/CD** to review changes in pull requests
3. **Filter noise** from auto-generated fields
4. **Combine with dry-run** for full validation
5. **Document expected changes** in commit messages

```bash
# Full validation workflow
kubectl apply --dry-run=server -f deployment.yaml && \
kubectl diff -f deployment.yaml && \
kubectl apply -f deployment.yaml
```

---

The `kubectl diff` command is simple but powerful. It turns "I hope this works" into "I know exactly what will change." Make it part of your deployment workflow, and you will catch configuration mistakes before they become incidents.
