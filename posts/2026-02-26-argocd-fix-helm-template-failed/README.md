# How to Fix 'helm template failed' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Helm

Description: Diagnose and fix the helm template failed error in ArgoCD caused by syntax errors, missing values, version mismatches, dependency issues, and rendering timeouts.

---

The "helm template failed" error in ArgoCD means the repo server could not render your Helm chart into valid Kubernetes manifests. ArgoCD uses `helm template` under the hood to generate manifests from Helm charts, and any issue that causes this command to fail will result in this error.

The error message usually includes the specific Helm error:

```
rpc error: code = Unknown desc = helm template failed: exit status 1:
Error: template: mychart/templates/deployment.yaml:15:20: executing
"mychart/templates/deployment.yaml" at <.Values.image.tag>: nil pointer evaluating interface {}.tag
```

This guide covers all common causes and their fixes.

## Step 1: Reproduce Locally

Always start by reproducing the error locally. This gives you the fastest feedback loop:

```bash
# Clone the repo
git clone https://github.com/org/repo
cd repo/chart-directory

# Run the same helm template command ArgoCD uses
helm template my-release . \
  --values values.yaml \
  --namespace production \
  --debug
```

The `--debug` flag will give you the full template output up to the point of failure, which helps identify the exact line causing the issue.

## Cause 1: Template Syntax Error

The most common cause - a Go template syntax error in your chart:

**Example error:**

```
Error: template: mychart/templates/deployment.yaml:10:
unexpected "}" in operand
```

**Common syntax mistakes:**

```yaml
# WRONG - missing closing braces
image: {{ .Values.image.repository }:{{ .Values.image.tag }}

# CORRECT
image: {{ .Values.image.repository }}:{{ .Values.image.tag }}

# WRONG - unclosed if block
{{ if .Values.enabled }}
apiVersion: v1
# Missing {{ end }}

# CORRECT
{{ if .Values.enabled }}
apiVersion: v1
kind: ConfigMap
{{ end }}
```

**Fix:** Correct the template syntax and push to Git. ArgoCD will pick up the changes on the next reconciliation.

## Cause 2: Missing or Nil Values

When templates reference values that do not exist:

```
nil pointer evaluating interface {}.tag
```

**Fix with default values:**

```yaml
# Instead of direct reference that can be nil:
image: {{ .Values.image.tag }}

# Use the default function:
image: {{ .Values.image.tag | default "latest" }}

# Or use the 'with' block for nested values:
{{ with .Values.image }}
image: {{ .repository }}:{{ .tag }}
{{ end }}

# Or check if the value exists:
{{ if .Values.image }}
image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
{{ end }}
```

**Check which values ArgoCD is using:**

```bash
# See what values ArgoCD passes to Helm
argocd app get my-app -o yaml | grep -A50 "source:"
```

## Cause 3: Values File Not Found

If ArgoCD references a values file that does not exist in the repository:

```
Error: open /tmp/values-production.yaml: no such file or directory
```

**Check the application's values file references:**

```bash
argocd app get my-app -o yaml | grep -A5 "valueFiles"
```

**Fix by correcting the path:**

```yaml
spec:
  source:
    helm:
      valueFiles:
        # Path is relative to the chart directory
        - values.yaml
        - values-production.yaml  # Make sure this file exists
```

**Common path issues:**
- The path is relative to the chart directory, not the repository root
- File names are case-sensitive
- When using multiple sources, the path resolution changes

## Cause 4: Helm Version Mismatch

Your chart requires a Helm version that ArgoCD does not have:

**Check which Helm version ArgoCD uses:**

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- helm version
```

**If the chart uses Helm 3 features not available in the bundled version:**

```yaml
# Specify the required Helm version in Chart.yaml
apiVersion: v2    # v2 means Helm 3
name: my-chart
version: 1.0.0
```

For very new Helm features, you may need to upgrade ArgoCD to a version that bundles the required Helm version.

## Cause 5: Chart Dependencies Not Resolved

If your chart has dependencies that are not pulled:

```
Error: found in Chart.yaml, but missing in charts/ directory: common, postgresql
```

**For charts stored in Git, dependencies should be vendored:**

```bash
# Update dependencies locally
helm dependency update ./my-chart

# Commit the charts/ directory
git add my-chart/charts/
git commit -m "Update Helm dependencies"
git push
```

**Or let ArgoCD handle dependencies (for Helm repository sources):**

ArgoCD automatically resolves dependencies when the chart is sourced from a Helm repository. But for Git sources, you need to commit the `charts/` directory.

**If using a Helm repository as source:**

```yaml
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: 1.0.0
```

## Cause 6: Invalid YAML in Values Files

Syntax errors in your values file:

```
Error: YAML parse error on my-chart/templates/deployment.yaml:
error converting YAML to JSON: yaml: line 15: could not find expected ':'
```

**Validate your values file:**

```bash
# Check YAML syntax
yamllint values.yaml

# Or use a quick Python check
python3 -c "import yaml; yaml.safe_load(open('values.yaml'))"
```

## Cause 7: ArgoCD Helm Parameters Conflict

Parameters passed via ArgoCD can override or conflict with values:

```yaml
spec:
  source:
    helm:
      parameters:
        - name: image.tag
          value: "v1.0.0"
      valueFiles:
        - values.yaml
```

**Check for conflicts between parameters and values files:**

```bash
# See all parameters ArgoCD passes
argocd app get my-app -o yaml
```

Parameters take precedence over values files. If a parameter is set to an incompatible type (e.g., string where an object is expected), rendering will fail.

## Cause 8: Chart Exceeds Rendering Timeout

For complex charts, rendering might timeout:

```
Error: context deadline exceeded
```

**Increase the exec timeout on the repo server:**

```yaml
# Repo server deployment
env:
  - name: ARGOCD_EXEC_TIMEOUT
    value: "300s"
```

## Cause 9: Helm Release Name Issues

ArgoCD uses the application name as the Helm release name by default. If the name is too long or contains invalid characters:

```
Error: release name "very-long-application-name-that-exceeds-53-chars" is invalid
```

**Fix by setting a custom release name:**

```yaml
spec:
  source:
    helm:
      releaseName: short-name
```

## Cause 10: Template Functions Not Available

Using functions that are not available in the Helm version bundled with ArgoCD:

```yaml
# Some newer Helm functions might not be available
{{ .Values.data | toRawJson }}  # toRawJson added in Helm 3.12
```

**Check function availability:**

```bash
# Check Helm version in ArgoCD
kubectl exec -n argocd deployment/argocd-repo-server -- helm version --short
```

## Debugging with ArgoCD CLI

ArgoCD provides tools to debug Helm rendering:

```bash
# See the rendered manifests
argocd app manifests my-app

# Get the manifest diff
argocd app diff my-app

# Force a hard refresh to re-render
argocd app get my-app --hard-refresh
```

## Quick Debugging Checklist

1. Can you `helm template` the chart locally with the same values?
2. Are all values files present at the correct paths?
3. Are chart dependencies resolved (check `charts/` directory)?
4. Is the Helm version compatible?
5. Are there syntax errors in templates or values files?
6. Is the release name valid (under 53 characters)?
7. Are all referenced values defined with proper defaults?

## Summary

The "helm template failed" error means ArgoCD could not render your Helm chart into Kubernetes manifests. Always start by reproducing the error locally with `helm template --debug`. The most common causes are template syntax errors, missing values, unresolved chart dependencies, and version mismatches. Fix the underlying Helm issue, push to Git, and ArgoCD will re-render on the next reconciliation.
