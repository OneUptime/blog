# Scale Down Non-Production Clusters with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, kubernetes, cost-optimization, scaling, gitops, non-production

Description: Learn how to automate the scale-down of non-production Kubernetes clusters during off-hours using Flux CD, reducing compute costs by scaling workloads to zero outside business hours. This guide covers scheduled scaling, Flux Kustomizations for environment-specific replicas, and safe scale-down procedures.

---

## Introduction

Non-production clusters — development, staging, and QA environments — often run 24/7 at full capacity even though engineers only use them during business hours. Scaling these clusters down overnight and on weekends can reduce compute costs by 60–70% with minimal impact on developer workflows.

Flux CD enables automated scale-down through a combination of Kustomize overlays and scheduled CronJobs that suspend Flux reconciliations during off-hours. By managing replica counts as environment-specific configuration, you can define "business hours" and "off-hours" states in Git and let Flux automatically apply them on a schedule.

This guide covers two approaches: managing replica count overlays in Kustomize and using CronJobs to trigger Flux suspends/resumes on a schedule.

## Prerequisites

- Flux CD v2.x bootstrapped
- Non-production clusters (dev, staging) with predictable usage patterns
- `flux` and `kubectl` CLIs installed
- Cluster Autoscaler or node group auto-scaling configured (optional but recommended)

## Step 1: Create Kustomize Overlays for Off-Hours Configuration

Define separate overlays with reduced replica counts for off-hours.
```yaml
# clusters/dev/overlays/off-hours/replica-patch.yaml
# Kustomize patch scaling all deployments to zero for off-hours
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: dev
spec:
  # Scale to zero during off-hours
  replicas: 0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-service
  namespace: dev
spec:
  replicas: 0
```

```yaml
# clusters/dev/overlays/off-hours/kustomization.yaml
# Kustomization applying off-hours replica patches
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: replica-patch.yaml
```

## Step 2: Create a CronJob to Trigger Scale-Down

Deploy a CronJob that suspends Flux reconciliation for non-production Kustomizations at the end of the business day.
```yaml
# cronjob-scale-down.yaml
# CronJob scaling down dev cluster workloads at 7pm on weekdays
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dev-scale-down
  namespace: flux-system
spec:
  # Scale down at 7pm EST (00:00 UTC+1) Monday-Friday
  schedule: "0 23 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-scaler
          containers:
            - name: flux-cli
              image: ghcr.io/fluxcd/flux-cli:v2.2.0
              command:
                - flux
                - suspend
                - kustomization
                - dev-workloads
                - --namespace=flux-system
          restartPolicy: OnFailure
```

## Step 3: Create a CronJob to Resume Scale-Up

Deploy a corresponding CronJob to resume Flux reconciliation at the start of the business day.
```yaml
# cronjob-scale-up.yaml
# CronJob resuming dev cluster workloads at 7am on weekdays
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dev-scale-up
  namespace: flux-system
spec:
  # Resume at 7am EST (12:00 UTC) Monday-Friday
  schedule: "0 12 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-scaler
          containers:
            - name: flux-cli
              image: ghcr.io/fluxcd/flux-cli:v2.2.0
              command:
                - flux
                - resume
                - kustomization
                - dev-workloads
                - --namespace=flux-system
          restartPolicy: OnFailure
```

## Step 4: Configure RBAC for the Scaler ServiceAccount

Create the necessary RBAC permissions for the scale-down CronJob.
```yaml
# rbac-flux-scaler.yaml
# RBAC allowing the flux-scaler service account to suspend/resume Kustomizations
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-scaler
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomization-editor
rules:
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-scaler-binding
subjects:
  - kind: ServiceAccount
    name: flux-scaler
    namespace: flux-system
roleRef:
  kind: ClusterRole
  name: flux-kustomization-editor
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

- Always notify developers via Slack when automated scale-down begins — avoid surprise outages
- Keep a manual override process for when engineers need to work outside business hours
- Scale down node groups too (via Cluster Autoscaler or cloud provider APIs) to reduce node costs
- Test scale-up procedures thoroughly — verify all workloads come back healthy automatically
- Use environment-specific schedules — QA may need later off-hours than dev
- Monitor scale-down CronJob failures via Flux notifications to detect scheduling drift

## Conclusion

Automated scale-down of non-production clusters with Flux CD is a straightforward way to cut compute costs without impacting developer productivity during business hours. By combining Kustomize overlays for replica counts with CronJob-driven Flux suspend/resume workflows, you create a fully automated and auditable cost optimization system. The savings from scaling down overnight and on weekends compound significantly across multiple non-production environments.
