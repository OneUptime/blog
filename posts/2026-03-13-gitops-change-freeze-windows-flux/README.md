# How to Implement GitOps Change Freeze Windows with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Change Management, Change Freeze, Compliance

Description: Suspend Flux CD reconciliation during change freeze periods to prevent any deployments from reaching your cluster without revoking Git access.

---

## Introduction

Change freeze windows are periods during which no new changes are allowed to reach production. Common triggers include major product launches, holiday periods, end-of-quarter financial close, or active incident investigations. During a freeze, you want the assurance that no automated process - including Flux CD - will modify the cluster.

Flux CD provides a `suspend` field on every reconciliation resource. When set to `true`, Flux stops reconciling that resource entirely. The Git repository remains unchanged and the full audit trail is preserved - you are only pausing the actor that applies changes, not the record of what was committed.

This guide shows how to suspend and resume Flux resources manually, how to automate freeze windows with Kubernetes CronJobs, and how to add CI checks that block PRs from merging to the Flux-watched branch during a declared freeze.

## Prerequisites

- Flux CD bootstrapped and managing at least one environment
- `flux` CLI and `kubectl` installed
- RBAC permissions to patch Flux Kustomization and HelmRelease resources
- Optional: a CI/CD system (GitHub Actions) for automated enforcement

## Step 1: Understand the Suspend Field

Every Flux reconciler (Kustomization, HelmRelease, ImageUpdateAutomation, etc.) supports a `suspend` field:

```yaml
# When suspend: true, Flux skips reconciliation on the next interval
# The resource stays in place; Flux just does nothing new
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-production
  namespace: flux-system
spec:
  suspend: true          # Freeze: Flux will not apply any changes
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Importantly, `suspend: true` does not roll back existing resources - it simply stops applying new changes.

## Step 2: Manually Suspend All Production Reconcilers

To enter a change freeze immediately, suspend every Flux resource that targets production:

```bash
# Suspend all Kustomizations
flux suspend kustomization --all --namespace flux-system

# Or target specific ones
flux suspend kustomization apps-production
flux suspend kustomization infra-production

# Suspend HelmReleases in the production namespace
flux suspend helmrelease --all --namespace production

# Suspend image update automation so new image tags are not pushed
flux suspend imagerepository --all --namespace flux-system
flux suspend imageupdateautomation --all --namespace flux-system

# Confirm suspend status
flux get kustomizations --all-namespaces
flux get helmreleases --all-namespaces
```

The output will show `Suspended: True` for each frozen resource.

## Step 3: Automate Freeze Windows with a CronJob

For recurring freeze windows (such as every Friday evening through Monday morning), use a Kubernetes CronJob that patches Flux resources on a schedule.

```yaml
# clusters/production/freeze/freeze-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-freeze-start
  namespace: flux-system
spec:
  # Every Friday at 18:00 UTC
  schedule: "0 18 * * 5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-freeze-sa
          restartPolicy: OnFailure
          containers:
            - name: freeze
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Suspend all Kustomizations in flux-system
                  kubectl patch kustomization apps-production \
                    -n flux-system \
                    --type merge \
                    -p '{"spec":{"suspend":true}}'
                  kubectl patch kustomization infra-production \
                    -n flux-system \
                    --type merge \
                    -p '{"spec":{"suspend":true}}'
                  echo "Change freeze activated at $(date -u)"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-freeze-end
  namespace: flux-system
spec:
  # Every Monday at 06:00 UTC
  schedule: "0 6 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-freeze-sa
          restartPolicy: OnFailure
          containers:
            - name: unfreeze
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  kubectl patch kustomization apps-production \
                    -n flux-system \
                    --type merge \
                    -p '{"spec":{"suspend":false}}'
                  kubectl patch kustomization infra-production \
                    -n flux-system \
                    --type merge \
                    -p '{"spec":{"suspend":false}}'
                  echo "Change freeze lifted at $(date -u)"
```

Create the RBAC resources needed by the CronJob:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-freeze-sa
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-freeze-role
rules:
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "patch", "list"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "patch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-freeze-binding
subjects:
  - kind: ServiceAccount
    name: flux-freeze-sa
    namespace: flux-system
roleRef:
  kind: ClusterRole
  name: flux-freeze-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Block PRs During a Freeze with CI

Add a CI check that reads a freeze flag file from the repository and fails the status check if a freeze is active, preventing PRs from merging.

```yaml
# .github/workflows/freeze-check.yaml
name: Change Freeze Check

on:
  pull_request:
    branches: [main]

jobs:
  freeze-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for active change freeze
        run: |
          # A freeze is declared by the existence of this file
          if [ -f ".change-freeze" ]; then
            echo "::error::A change freeze is active. See .change-freeze for details."
            cat .change-freeze
            exit 1
          fi
          echo "No change freeze active. PR can proceed."
```

When a freeze is declared, create the flag file and commit it:

```bash
# Declare a freeze by committing a flag file
cat > .change-freeze <<EOF
Change freeze active from 2026-12-20 to 2027-01-03
Reason: Holiday period freeze
Contact: platform-team@example.com for emergency exceptions
EOF

git add .change-freeze
git commit -m "chore: declare holiday change freeze"
git push origin main
```

Remove the file to lift the freeze.

## Step 5: Resume Reconciliation

After the freeze window ends, resume Flux reconciliation and force an immediate sync:

```bash
# Resume all suspended resources
flux resume kustomization --all --namespace flux-system
flux resume helmrelease --all --namespace production
flux resume imagerepository --all --namespace flux-system
flux resume imageupdateautomation --all --namespace flux-system

# Force an immediate reconciliation rather than waiting for the interval
flux reconcile kustomization apps-production
flux reconcile kustomization infra-production

# Verify the cluster converges to the expected state
flux get kustomizations --watch
```

## Best Practices

- Always suspend image update automation alongside Kustomizations - leaving it running allows new image commits to land on `main` during the freeze even if reconciliation is paused.
- Store the freeze flag file in Git so the freeze declaration is itself auditable and reversible via PR.
- Notify your team through Slack or PagerDuty when a freeze is activated and again when it is lifted.
- Document an exception process for emergency hotfixes that must deploy during a freeze (see the hotfix workflow post for details).
- Test your freeze automation in staging before relying on it in production.

## Conclusion

Change freeze windows with Flux CD are clean and reversible. The `suspend` field on Flux resources provides an immediate, auditable way to halt all reconciliation without revoking Git access or modifying your actual configuration. Combined with a CronJob for recurring freezes and a CI flag file for declared freezes, you have a complete change freeze capability that satisfies change management requirements while keeping the Flux workflow intact for when the freeze ends.
