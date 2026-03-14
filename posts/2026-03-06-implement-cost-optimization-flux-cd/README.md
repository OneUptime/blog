# How to Implement Cost Optimization with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cost Optimization, Kubernetes, GitOps, Resource Management, FinOps

Description: A practical guide to implementing cost optimization strategies for Kubernetes workloads using Flux CD and GitOps principles.

---

## Introduction

Running Kubernetes clusters at scale can become expensive quickly if resource allocation is not carefully managed. Flux CD, as a GitOps tool, provides an excellent framework for enforcing cost optimization policies declaratively. By codifying resource limits, scaling policies, and cleanup rules in Git, you can ensure consistent cost governance across all environments.

This guide walks through practical strategies for implementing cost optimization with Flux CD, including resource quotas, autoscaling configurations, spot instance scheduling, and idle resource cleanup.

## Prerequisites

Before getting started, ensure you have the following:

- A Kubernetes cluster (v1.24+)
- Flux CD v2 installed and bootstrapped
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Setting Up Resource Quotas with Flux CD

Resource quotas prevent runaway costs by capping resource consumption per namespace. Define quotas in your Git repository and let Flux CD enforce them.

```yaml
# clusters/production/resource-quotas/development-quota.yaml
# This ResourceQuota limits resource consumption in the development namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-resource-quota
  namespace: development
spec:
  hard:
    # Limit total CPU requests across all pods in this namespace
    requests.cpu: "4"
    # Limit total memory requests
    requests.memory: 8Gi
    # Limit total CPU limits
    limits.cpu: "8"
    # Limit total memory limits
    limits.memory: 16Gi
    # Cap the number of pods to prevent uncontrolled scaling
    pods: "20"
    # Limit PersistentVolumeClaims to control storage costs
    persistentvolumeclaims: "10"
```

## Enforcing LimitRanges for Default Resource Constraints

LimitRanges ensure every container has resource requests and limits, even if developers forget to set them.

```yaml
# clusters/production/resource-quotas/default-limits.yaml
# LimitRange sets default resource constraints for containers
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resource-limits
  namespace: development
spec:
  limits:
    - type: Container
      # Default limits applied when none are specified
      default:
        cpu: "500m"
        memory: 512Mi
      # Default requests applied when none are specified
      defaultRequest:
        cpu: "100m"
        memory: 128Mi
      # Maximum allowed resources per container
      max:
        cpu: "2"
        memory: 4Gi
      # Minimum required resources per container
      min:
        cpu: "50m"
        memory: 64Mi
```

## Configuring Horizontal Pod Autoscaler via Flux CD

Autoscaling ensures you only run the pods you need. Define HPA resources in Git for consistent scaling behavior.

```yaml
# apps/production/api-server/hpa.yaml
# HorizontalPodAutoscaler scales pods based on actual resource usage
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  # Minimum replicas to maintain availability
  minReplicas: 2
  # Maximum replicas to cap costs
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          # Scale up when average CPU exceeds 70%
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          # Scale up when average memory exceeds 80%
          averageUtilization: 80
  behavior:
    # Slow down scale-down to avoid flapping
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    # Allow faster scale-up for responsiveness
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

## Implementing Scheduled Scaling for Non-Production Environments

Scale down non-production workloads during off-hours to save costs using CronJobs managed by Flux CD.

```yaml
# clusters/staging/cost-optimization/scale-down-cronjob.yaml
# CronJob to scale down staging deployments at night
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-staging
  namespace: staging
spec:
  # Run at 8 PM every weekday
  schedule: "0 20 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: kubectl
              image: bitnami/kubectl:1.28
              command:
                - /bin/sh
                - -c
                # Scale all deployments in staging to zero replicas
                - |
                  kubectl get deployments -n staging \
                    -l cost-optimization/scalable=true \
                    -o name | xargs -I {} \
                    kubectl scale {} -n staging --replicas=0
          restartPolicy: OnFailure
---
# CronJob to scale up staging deployments in the morning
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-staging
  namespace: staging
spec:
  # Run at 8 AM every weekday
  schedule: "0 8 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: kubectl
              image: bitnami/kubectl:1.28
              command:
                - /bin/sh
                - -c
                # Restore deployments to their minimum replica count
                - |
                  kubectl get deployments -n staging \
                    -l cost-optimization/scalable=true \
                    -o name | xargs -I {} \
                    kubectl scale {} -n staging --replicas=1
          restartPolicy: OnFailure
```

## Using Kustomize Overlays for Environment-Specific Resource Sizing

Use Kustomize overlays to define different resource profiles per environment, managed through Flux CD.

```yaml
# apps/base/api-server/deployment.yaml
# Base deployment with production-level resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api-server
          image: myapp/api-server:latest
          resources:
            requests:
              cpu: "500m"
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

```yaml
# apps/overlays/development/patch-resources.yaml
# Overlay to reduce resources in development environment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  # Fewer replicas in dev to save costs
  replicas: 1
  template:
    spec:
      containers:
        - name: api-server
          resources:
            # Lower resource requests for dev workloads
            requests:
              cpu: "100m"
              memory: 128Mi
            limits:
              cpu: "250m"
              memory: 256Mi
```

```yaml
# clusters/development/apps.yaml
# Flux Kustomization pointing to the development overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/development
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Timeout for applying resources
  timeout: 5m
```

## Implementing Pod Disruption Budgets for Cost-Aware Rolling Updates

Pod Disruption Budgets ensure rolling updates do not over-provision resources during deployment.

```yaml
# apps/production/api-server/pdb.yaml
# PodDisruptionBudget controls how many pods can be unavailable during updates
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  # At least 50% of pods must remain available during disruptions
  minAvailable: "50%"
  selector:
    matchLabels:
      app: api-server
```

## Setting Up Cleanup Policies for Unused Resources

Use Flux CD's pruning feature combined with custom cleanup jobs to remove unused resources.

```yaml
# clusters/production/cleanup/unused-configmaps.yaml
# CronJob to clean up orphaned ConfigMaps older than 30 days
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-unused-configmaps
  namespace: kube-system
spec:
  # Run weekly on Sundays at midnight
  schedule: "0 0 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cleanup-sa
          containers:
            - name: cleanup
              image: bitnami/kubectl:1.28
              command:
                - /bin/sh
                - -c
                - |
                  # Find ConfigMaps not referenced by any pod
                  # and delete them to free up etcd storage
                  kubectl get configmaps --all-namespaces \
                    -l cost-optimization/auto-cleanup=true \
                    -o json | jq -r '.items[] |
                    select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - 2592000)) |
                    "\(.metadata.namespace) \(.metadata.name)"' |
                    while read ns name; do
                      kubectl delete configmap "$name" -n "$ns"
                    done
          restartPolicy: OnFailure
```

## Monitoring Cost Metrics with Flux CD Notifications

Set up Flux CD alerts to notify your team about cost-related events.

```yaml
# clusters/production/notifications/cost-alerts.yaml
# Provider for sending cost alerts to Slack
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: cost-alerts-slack
  namespace: flux-system
spec:
  type: slack
  channel: cost-alerts
  secretRef:
    name: slack-webhook-url
---
# Alert for resource quota and scaling events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: cost-optimization-alerts
  namespace: flux-system
spec:
  providerRef:
    name: cost-alerts-slack
  # Trigger on warning and error severity events
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
  # Only include events matching cost-related resources
  inclusionList:
    - ".*resource-quota.*"
    - ".*hpa.*"
    - ".*scale.*"
```

## Summary

Cost optimization with Flux CD is about encoding financial discipline into your GitOps workflow. By defining resource quotas, autoscaling policies, scheduled scaling, and cleanup rules as declarative manifests in Git, you ensure that cost controls are version-controlled, reviewable, and consistently applied across all environments. The key practices covered in this guide include:

- Resource quotas and limit ranges to cap spending per namespace
- Horizontal Pod Autoscalers to match capacity with demand
- Scheduled scaling to reduce non-production costs during off-hours
- Environment-specific resource sizing through Kustomize overlays
- Automated cleanup of unused resources
- Alerting on cost-related events via Flux CD notifications
