# How to Implement Change Management for Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Change Management, GitOps, Kubernetes, DevOps

Description: Learn how to implement a GitOps-based change management workflow for Dapr components, ensuring all changes are reviewed, tested, and auditable before reaching production.

---

## Why Dapr Components Need Change Management

Dapr components are Kubernetes custom resources that define connections to critical infrastructure like state stores, message brokers, and secret stores. An unreviewed change to a component - such as a connection string update or metadata modification - can break services or introduce security vulnerabilities across all applications that use that component.

## Storing Components in Git

Organize Dapr components in a structured Git repository layout:

```text
infrastructure/
  dapr/
    components/
      production/
        statestore.yaml
        pubsub.yaml
        secret-store.yaml
      staging/
        statestore.yaml
        pubsub.yaml
    configurations/
      production/
        tracing-config.yaml
      staging/
        tracing-config.yaml
```

## GitOps Workflow with Argo CD

Configure Argo CD to manage Dapr components:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components-production
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/myorg/infrastructure
    targetRevision: main
    path: dapr/components/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: false
    syncOptions:
    - Validate=true
    - CreateNamespace=false
  revisionHistoryLimit: 10
```

Disable `selfHeal` for production so that manual changes made directly to the cluster are not automatically reverted. Note that with `automated` sync enabled, changes pushed to Git are still deployed automatically — remove the `automated` block entirely to require explicit sync approval for all changes.

## Pull Request Review Process

Enforce a review policy for component changes via GitHub branch protection:

```yaml
# .github/CODEOWNERS
# Dapr component changes require platform team review
infrastructure/dapr/components/production/ @platform-team @security-team
infrastructure/dapr/configurations/ @platform-team
```

```yaml
# .github/workflows/validate-dapr-components.yaml
name: Validate Dapr Components
on:
  pull_request:
    paths:
    - "infrastructure/dapr/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Install Dapr CLI
      run: |
        wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
    - name: Validate component YAML
      run: |
        for f in infrastructure/dapr/components/production/*.yaml; do
          kubectl apply --dry-run=client -f "$f"
        done
    - name: Check for missing scopes
      run: |
        python3 scripts/check-component-scopes.py infrastructure/dapr/components/production/
```

## Automated Validation Script

```python
#!/usr/bin/env python3
# scripts/check-component-scopes.py
import sys
import yaml
import glob

violations = []
for filepath in glob.glob(f"{sys.argv[1]}/*.yaml"):
    with open(filepath) as f:
        doc = yaml.safe_load(f)
    if doc.get("kind") == "Component":
        if not doc.get("scopes"):
            violations.append(f"{filepath}: missing 'scopes' field")
        metadata = doc.get("metadata", {})
        labels = metadata.get("labels", {})
        if "cost-center" not in labels:
            violations.append(f"{filepath}: missing 'cost-center' label")

if violations:
    for v in violations:
        print(f"ERROR: {v}")
    sys.exit(1)
print("All components passed validation")
```

## Change Rollback Procedure

```bash
# View component change history via Argo CD
argocd app history dapr-components-production

# Rollback to a previous revision
argocd app rollback dapr-components-production <revision-number>

# Or directly via kubectl with the previous YAML from Git
git log --oneline infrastructure/dapr/components/production/statestore.yaml
git show HEAD~1:infrastructure/dapr/components/production/statestore.yaml | \
  kubectl apply -f -
```

## Summary

Dapr component change management starts with storing all component YAML in Git and deploying via GitOps tools like Argo CD. Enforce pull request review policies with CODEOWNERS, automate validation of component governance rules in CI, and disable auto-sync for production to require explicit approval. Maintain Git history as your audit trail and use Argo CD's rollback capability to quickly revert problematic component changes.
