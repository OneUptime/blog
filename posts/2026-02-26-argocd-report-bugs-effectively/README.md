# How to Report Bugs in ArgoCD Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Open Source, Debugging

Description: Learn how to report bugs in ArgoCD effectively with clear reproduction steps, log collection, and proper issue formatting to help maintainers resolve issues quickly.

---

Every ArgoCD user eventually encounters a bug. The difference between a bug that gets fixed in a week and one that languishes for months often comes down to the quality of the bug report. Good bug reports save maintainers hours of investigation time and dramatically increase the chances your issue gets resolved. This guide covers the exact process for reporting ArgoCD bugs in a way that gets results.

## Before Filing a Bug Report

Before opening a GitHub issue, take these preliminary steps to avoid duplicates and confirm you are actually dealing with a bug.

**Search existing issues first.** Many bugs have already been reported. Search both open and closed issues on the ArgoCD GitHub repository.

```bash
# Search for existing issues using GitHub CLI
gh issue list --repo argoproj/argo-cd --state all --search "sync stuck degraded"

# Check if there's a known issue in the troubleshooting docs
# Visit https://argo-cd.readthedocs.io/en/stable/faq/
```

**Check if you are on a supported version.** ArgoCD typically maintains the last two minor releases. If you are running an older version, try upgrading first.

```bash
# Check your ArgoCD version
argocd version

# Example output:
# argocd: v2.10.2+abc1234
# argocd-server: v2.10.2+abc1234
```

**Try reproducing on the latest version.** Many bugs are already fixed in newer releases.

**Rule out configuration errors.** Review the ArgoCD documentation for the feature you are having trouble with. Many "bugs" turn out to be misconfiguration.

## Gathering Essential Information

Maintainers need specific information to diagnose and fix bugs. Collect all of this before filing your report.

### ArgoCD Server and Component Versions

```bash
# Get detailed version info
argocd version --client --short
argocd version --server

# Or check via kubectl
kubectl get pods -n argocd -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
```

### Kubernetes Cluster Information

```bash
# Kubernetes version
kubectl version --short

# Cluster provider information
kubectl get nodes -o wide

# Check ArgoCD installation method
kubectl get configmap -n argocd argocd-cm -o yaml
```

### ArgoCD Configuration

The `argocd-cm` and `argocd-rbac-cm` ConfigMaps often contain relevant settings.

```bash
# Export ArgoCD configuration (sanitize secrets!)
kubectl get configmap argocd-cm -n argocd -o yaml > argocd-cm.yaml
kubectl get configmap argocd-rbac-cm -n argocd -o yaml > argocd-rbac-cm.yaml
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml > argocd-cmd-params.yaml

# IMPORTANT: Remove any sensitive data before sharing
# Look for and redact: passwords, tokens, SSO configs, webhook secrets
```

### Application Manifest

If the bug relates to a specific application, export its definition.

```bash
# Export the Application resource
kubectl get application MY_APP -n argocd -o yaml > app-manifest.yaml

# For ApplicationSets
kubectl get applicationset MY_APPSET -n argocd -o yaml > appset-manifest.yaml
```

### Server Logs

Logs from the relevant ArgoCD component are critical. Different bugs require logs from different components.

```bash
# Application controller logs - for sync, health, and reconciliation issues
kubectl logs -n argocd deployment/argocd-application-controller --since=1h > controller.log

# API server logs - for UI, CLI, and API issues
kubectl logs -n argocd deployment/argocd-server --since=1h > server.log

# Repo server logs - for manifest generation, Helm, and Kustomize issues
kubectl logs -n argocd deployment/argocd-repo-server --since=1h > reposerver.log

# Redis logs - for caching issues
kubectl logs -n argocd deployment/argocd-redis --since=1h > redis.log

# For more verbose output, you can temporarily increase log level
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{"data":{"controller.log.level":"debug"}}'
# Remember to set it back to "info" after collecting logs
```

### Enable Debug Logging Temporarily

For intermittent bugs, you may need to enable debug logging and wait for the issue to recur.

```bash
# Enable debug logging on the application controller
kubectl patch configmap argocd-cmd-params-cm -n argocd \
  --type merge \
  -p '{"data":{
    "controller.log.level":"debug",
    "server.log.level":"debug",
    "reposerver.log.level":"debug"
  }}'

# Restart components to pick up the change
kubectl rollout restart deployment -n argocd argocd-application-controller
kubectl rollout restart deployment -n argocd argocd-server
kubectl rollout restart deployment -n argocd argocd-repo-server
```

## Writing the Bug Report

Use the GitHub issue template provided by the ArgoCD project. Here is the structure of an effective bug report.

### Title

Keep it specific and searchable. Bad titles look like "Sync is broken." Good titles look like "Application sync fails with OOMKilled when using Helm chart with 500+ templates."

### Description

Start with a one-paragraph summary of the bug, including what you expected to happen and what actually happened.

### Environment

```markdown
**ArgoCD version:** v2.10.2
**Kubernetes version:** v1.28.5
**Kubernetes provider:** EKS
**Installation method:** Helm chart (argo/argo-cd 6.4.0)
**ArgoCD HA mode:** Yes (3 replicas)
```

### Steps to Reproduce

This is the most important section. Write steps that anyone can follow to reproduce the issue.

```markdown
1. Create an Application targeting a Helm chart with 500+ templates:
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: large-chart
     namespace: argocd
   spec:
     project: default
     source:
       repoURL: https://github.com/example/large-chart.git
       targetRevision: main
       path: chart/
       helm:
         valueFiles:
           - values-production.yaml
     destination:
       server: https://kubernetes.default.svc
       namespace: production
   ```
2. Click "Sync" in the ArgoCD UI
3. Observe the repo-server pod getting OOMKilled after approximately 45 seconds
4. Check pod events: `kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-repo-server`
```text

### Expected Behavior

Describe what should happen in clear terms.

### Actual Behavior

Describe what actually happens, including error messages and logs.

```markdown
The argocd-repo-server pod is OOMKilled during manifest generation.
Memory usage spikes from 200Mi to over 1Gi within 30 seconds.

Error from controller logs:
```
level=error msg="ComparisonError: rpc error: code = Unavailable desc = connection error"
```text

Pod events show:
```
Last State: Terminated
Reason: OOMKilled
Exit Code: 137
```text
```

### Attach Relevant Logs

Paste sanitized logs inline or attach them as files. Use collapsible sections for long logs.

```markdown
<details>
<summary>Repo Server Logs</summary>

```
time="2024-01-15T10:23:45Z" level=info msg="Generating manifests for app large-chart"
time="2024-01-15T10:24:30Z" level=error msg="manifest generation error: signal: killed"
```text

</details>
```

## Common Bug Categories

Understanding what category your bug falls into helps you provide the right information.

**Sync Issues** - Include the Application manifest, controller logs, and the specific sync error from the UI or CLI. Check `argocd app get APP_NAME` output.

**UI Issues** - Include browser console errors (F12 in Developer Tools), screenshots, and the browser/version. API server logs are also relevant.

**Performance Issues** - Include resource metrics (CPU, memory) for ArgoCD pods, the number of Applications and clusters, and any relevant Prometheus metrics.

**RBAC Issues** - Include the `argocd-rbac-cm` ConfigMap, the user or group attempting the action, and the exact permission error message.

**Repository Connection Issues** - Include repo-server logs, the repository configuration from `argocd-cm` (with credentials redacted), and network details.

## Providing a Minimal Reproduction

The gold standard for bug reports is a minimal reproduction case. Strip away everything that is not needed to trigger the bug.

```bash
# Create a minimal test repository
mkdir argocd-bug-repro && cd argocd-bug-repro
git init

# Add only the minimal files needed to reproduce
cat > deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: test
        image: nginx:latest
EOF

git add . && git commit -m "minimal reproduction"
```

Push this to a public repository so maintainers can test directly.

## Following Up

After filing your bug report, stay engaged.

- Respond promptly to questions from maintainers
- Test proposed fixes when asked
- Update the issue if you find additional information
- If you find a workaround, share it in the issue for others

Effective bug reporting is a skill that improves with practice. The better your reports, the faster the ArgoCD community can identify and fix issues, benefiting everyone who depends on the tool for their Kubernetes deployments.

For proactive monitoring that catches ArgoCD issues before they become bugs, check out how to set up [comprehensive ArgoCD monitoring](https://oneuptime.com/blog/post/2026-02-26-argocd-contribute-open-source/view) with integrated alerting.
