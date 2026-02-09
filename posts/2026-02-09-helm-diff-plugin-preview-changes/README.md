# How to Use Helm Diff Plugin to Preview Changes Before Applying Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Learn how to use the Helm Diff plugin to preview changes before applying upgrades, enabling safe deployments by visualizing exactly what will change in your Kubernetes resources.

---

Upgrading Helm releases in production requires confidence that changes will behave as expected. The Helm Diff plugin addresses this need by showing you exactly what will change before you apply an upgrade. This preview capability helps catch configuration errors, understand the impact of changes, and make informed decisions about deployments.

## Installing the Helm Diff Plugin

Install the plugin directly from its repository:

```bash
helm plugin install https://github.com/databus23/helm-diff
```

Verify the installation:

```bash
helm plugin list
helm diff version
```

The plugin integrates seamlessly with the Helm CLI and works with all Helm 3 releases.

## Basic Diff Usage

Compare your proposed changes against the currently deployed release:

```bash
# Show differences for an upgrade
helm diff upgrade myapp ./mychart -f values.yaml

# Compare against a specific namespace
helm diff upgrade myapp ./mychart -f values.yaml -n production

# Show differences with modified values
helm diff upgrade myapp ./mychart --set replicaCount=5
```

The output shows a unified diff format similar to git diff, highlighting additions, deletions, and modifications.

## Understanding Diff Output

The diff output uses color coding and symbols to indicate changes:

```
+ Lines in green with a plus sign indicate additions
- Lines in red with a minus sign indicate deletions
~ Lines in yellow with a tilde indicate modifications
```

Example output:

```diff
production, myapp-deployment, Deployment (apps) has changed:
  # Source: mychart/templates/deployment.yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: myapp
    namespace: production
  spec:
-   replicas: 3
+   replicas: 5
    selector:
      matchLabels:
        app: myapp
    template:
      spec:
        containers:
        - name: myapp
-         image: myapp:v1.0.0
+         image: myapp:v1.1.0
          ports:
          - containerPort: 8080
```

## Comparing Different Value Files

Preview changes when switching between environment configurations:

```bash
# Current production values
helm diff upgrade myapp ./mychart \
  -f values.yaml \
  -f values-production.yaml

# Compare against staging configuration
helm diff upgrade myapp ./mychart \
  -f values.yaml \
  -f values-staging.yaml
```

This helps verify that environment-specific configurations produce expected differences.

## Using Diff in Release Workflows

Integrate diff into your deployment workflow:

```bash
#!/bin/bash
# deploy.sh - Safe deployment script with diff preview

RELEASE="$1"
CHART="$2"
VALUES_FILE="$3"
NAMESPACE="${4:-default}"

echo "=== Previewing Changes ==="
helm diff upgrade "$RELEASE" "$CHART" \
  -f "$VALUES_FILE" \
  -n "$NAMESPACE"

echo ""
echo "=== Review the changes above ==="
read -p "Proceed with upgrade? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo "Applying upgrade..."
    helm upgrade "$RELEASE" "$CHART" \
      -f "$VALUES_FILE" \
      -n "$NAMESPACE" \
      --wait
    echo "Upgrade complete!"
else
    echo "Upgrade cancelled."
    exit 1
fi
```

Use the script:

```bash
./deploy.sh myapp ./mychart values-production.yaml production
```

## Filtering Diff Output

Focus on specific resources or changes:

```bash
# Show only the summary
helm diff upgrade myapp ./mychart --suppress-secrets

# Hide secrets from output
helm diff upgrade myapp ./mychart --suppress-secrets

# Show context lines around changes
helm diff upgrade myapp ./mychart --context=5

# Output in different formats
helm diff upgrade myapp ./mychart --output simple
helm diff upgrade myapp ./mychart --output json
```

## Comparing Against Specific Revisions

Compare your changes against any previous revision:

```bash
# Show current deployed revision
helm list -n production

# Compare against a specific revision
helm diff revision myapp 5 -n production

# Compare two revisions
helm diff revision myapp 3 5 -n production
```

This helps understand how your deployment has evolved over time.

## Detecting Unintended Changes

Use diff to catch configuration drift or unintended modifications:

```bash
# Compare current state with what should be deployed
helm diff upgrade myapp ./mychart \
  -f values-production.yaml \
  -n production > changes.diff

# Check if there are any differences
if [ -s changes.diff ]; then
    echo "Configuration drift detected!"
    cat changes.diff
    exit 1
else
    echo "No drift detected, deployment matches chart"
fi
```

## CI/CD Integration with GitHub Actions

Add diff checks to your pipeline:

```yaml
# .github/workflows/helm-diff.yaml
name: Helm Diff Check

on:
  pull_request:
    paths:
      - 'charts/**'
      - 'values/**'

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Install Helm
      uses: azure/setup-helm@v3

    - name: Install Helm Diff Plugin
      run: helm plugin install https://github.com/databus23/helm-diff

    - name: Configure Kubernetes
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBECONFIG }}

    - name: Generate Diff
      id: diff
      run: |
        helm diff upgrade myapp ./charts/myapp \
          -f values/production.yaml \
          -n production \
          --allow-unreleased > diff-output.txt
        echo "diff<<EOF" >> $GITHUB_OUTPUT
        cat diff-output.txt >> $GITHUB_OUTPUT
        echo "EOF" >> $GITHUB_OUTPUT

    - name: Comment on PR
      uses: actions/github-script@v6
      with:
        script: |
          const diff = `${{ steps.diff.outputs.diff }}`;
          const body = `## Helm Diff Output\n\`\`\`diff\n${diff}\n\`\`\``;
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: body
          });
```

## Comparing Release Manifests

Preview the complete manifest that will be applied:

```bash
# Show full manifest with changes highlighted
helm diff upgrade myapp ./mychart -f values.yaml --detailed-exitcode

# Save manifest for review
helm diff upgrade myapp ./mychart -f values.yaml > proposed-changes.yaml

# Compare manifests side by side
helm get manifest myapp > current.yaml
helm template myapp ./mychart -f values.yaml > proposed.yaml
diff -u current.yaml proposed.yaml
```

## Advanced Diff Options

Customize diff behavior for specific scenarios:

```bash
# Suppress hooks from comparison
helm diff upgrade myapp ./mychart --suppress-hooks

# Normalize YAML before comparison
helm diff upgrade myapp ./mychart --normalize-manifests

# Set custom diff context
helm diff upgrade myapp ./mychart --context=10

# Disable color output (useful for logs)
helm diff upgrade myapp ./mychart --no-color

# Show three-way diff (original, current, proposed)
helm diff upgrade myapp ./mychart --three-way-merge
```

## Handling Large Diffs

For charts with many resources, make the output more manageable:

```bash
# Count changed resources
helm diff upgrade myapp ./mychart | grep "has changed" | wc -l

# Show only resource names that changed
helm diff upgrade myapp ./mychart | grep "has changed"

# Filter specific resource types
helm diff upgrade myapp ./mychart | grep "Deployment"

# Export to file for detailed review
helm diff upgrade myapp ./mychart > /tmp/helm-diff.txt
less /tmp/helm-diff.txt
```

## Diff for New Releases

Preview what will be created for a new installation:

```bash
# Compare against empty state
helm diff install myapp ./mychart -f values.yaml

# Preview all resources that will be created
helm template myapp ./mychart -f values.yaml | kubectl diff -f -
```

## Creating Deployment Approval Workflows

Build approval processes around diff output:

```bash
#!/bin/bash
# approval-workflow.sh

RELEASE="$1"
CHART="$2"
NAMESPACE="$3"

# Generate diff
DIFF_OUTPUT=$(helm diff upgrade "$RELEASE" "$CHART" -n "$NAMESPACE" 2>&1)

# Check if there are changes
if echo "$DIFF_OUTPUT" | grep -q "has changed"; then
    echo "Changes detected:"
    echo "$DIFF_OUTPUT"

    # Post to Slack or other notification system
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"Deployment approval needed for $RELEASE\"}" \
      "$SLACK_WEBHOOK_URL"

    # Wait for approval (example: check for approval file)
    echo "Waiting for approval..."
    while [ ! -f "/tmp/approved-$RELEASE" ]; do
        sleep 10
    done

    # Apply changes
    helm upgrade "$RELEASE" "$CHART" -n "$NAMESPACE"
    rm "/tmp/approved-$RELEASE"
else
    echo "No changes detected, skipping deployment"
fi
```

## Validating Chart Changes

Combine diff with other validation tools:

```bash
#!/bin/bash
# validate-and-diff.sh

RELEASE="$1"
CHART="$2"

echo "=== Linting Chart ==="
helm lint "$CHART"

echo ""
echo "=== Validating Templates ==="
helm template "$RELEASE" "$CHART" | kubeval --strict

echo ""
echo "=== Showing Differences ==="
helm diff upgrade "$RELEASE" "$CHART"

echo ""
echo "=== Checking Policy Compliance ==="
helm template "$RELEASE" "$CHART" | conftest test -

if [ $? -eq 0 ]; then
    echo "All checks passed!"
else
    echo "Validation failed!"
    exit 1
fi
```

## Monitoring Diff in Production

Track what changed after deployments:

```bash
# Before upgrade
helm get manifest myapp -n production > before.yaml

# After upgrade
helm get manifest myapp -n production > after.yaml

# Show what actually changed
diff -u before.yaml after.yaml

# Archive for audit trail
tar -czf "deployment-$(date +%Y%m%d-%H%M%S).tar.gz" before.yaml after.yaml
```

## Troubleshooting Diff Issues

Handle common problems with the diff plugin:

```bash
# Diff shows no changes but upgrade fails
# Force rerendering of templates
helm diff upgrade myapp ./mychart --reset-values

# Connection timeouts
# Increase timeout duration
helm diff upgrade myapp ./mychart --timeout 5m

# Large manifests cause issues
# Split by resource type
for kind in deployment service configmap; do
    helm diff upgrade myapp ./mychart | grep -A 50 "$kind"
done
```

The Helm Diff plugin transforms blind upgrades into informed decisions. By visualizing changes before they happen, you gain confidence in your deployments and catch potential issues before they impact your production environment. This visibility is essential for maintaining stable and predictable Kubernetes operations.
