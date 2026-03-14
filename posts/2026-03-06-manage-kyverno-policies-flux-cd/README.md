# How to Manage Kyverno Policies with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kyverno, Policies, GitOps, Kubernetes, Security, Compliance, Policy-as-Code

Description: Learn how to organize, test, and manage Kyverno policies at scale using Flux CD for enterprise-grade policy-as-code workflows.

---

## Introduction

Managing Kyverno policies at scale requires a structured approach to policy organization, versioning, testing, and deployment. Flux CD provides the GitOps foundation to treat policies as code, enabling teams to review policy changes through pull requests, test them in staging environments, and progressively roll them out to production clusters.

This guide covers advanced Kyverno policy management patterns including multi-cluster deployment, policy testing, progressive enforcement, and compliance reporting.

## Prerequisites

Before you begin, ensure you have:

- Kyverno deployed on your Kubernetes cluster (see the deployment guide)
- Flux CD bootstrapped and connected to a Git repository
- kubectl access to one or more clusters
- Familiarity with Kyverno policy syntax

## Policy Repository Structure

Organize policies into a structured repository layout.

```text
policies/
  base/
    validation/
      require-labels.yaml
      require-probes.yaml
      restrict-image-registries.yaml
      disallow-latest-tag.yaml
    mutation/
      add-default-labels.yaml
      add-default-security-context.yaml
      inject-sidecar-config.yaml
    generation/
      generate-network-policy.yaml
      generate-resource-quota.yaml
    cleanup/
      cleanup-completed-jobs.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
    production/
      kustomization.yaml
      patches/
  exceptions/
    staging/
    production/
```

## Policy: Restrict Image Registries

Ensure all container images come from approved registries.

```yaml
# policies/base/validation/restrict-image-registries.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/subject: Pod
    policies.kyverno.io/description: >-
      Restricts container images to approved registries to prevent
      pulling images from untrusted sources.
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: >-
          Image '{{ element.image }}' in container '{{ element.name }}'
          is not from an approved registry. Approved registries are:
          ghcr.io, docker.io/library, gcr.io/distroless, registry.k8s.io
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                all:
                  - key: "{{ element.image }}"
                    operator: AnyNotIn
                    value:
                      - "ghcr.io/*"
                      - "docker.io/library/*"
                      - "gcr.io/distroless/*"
                      - "registry.k8s.io/*"
                      - "my-registry.example.com/*"
    - name: validate-init-container-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: >-
          Init container image '{{ element.image }}' is not from an approved registry.
        foreach:
          - list: "request.object.spec.initContainers"
            deny:
              conditions:
                all:
                  - key: "{{ element.image }}"
                    operator: AnyNotIn
                    value:
                      - "ghcr.io/*"
                      - "docker.io/library/*"
                      - "gcr.io/distroless/*"
                      - "registry.k8s.io/*"
                      - "my-registry.example.com/*"
```

## Policy: Disallow Latest Tag

Prevent use of the latest tag for container images.

```yaml
# policies/base/validation/disallow-latest-tag.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
  annotations:
    policies.kyverno.io/title: Disallow Latest Tag
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Requires all container images to have an explicit tag
      that is not 'latest'. Using 'latest' leads to unpredictable
      deployments and makes rollbacks difficult.
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: require-image-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: "Container '{{ element.name }}' must specify an image tag. The ':latest' tag is not allowed."
        foreach:
          - list: "request.object.spec.[containers, initContainers, ephemeralContainers][]"
            deny:
              conditions:
                any:
                  # Deny if no tag is specified (implies latest)
                  - key: "{{ element.image }}"
                    operator: Equals
                    value: "*/!(*:*)"
                  # Deny if the tag is explicitly 'latest'
                  - key: "{{ element.image }}"
                    operator: Equals
                    value: "*:latest"
```

## Policy: Require Health Probes

Ensure all deployments have readiness and liveness probes configured.

```yaml
# policies/base/validation/require-probes.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-probes
  annotations:
    policies.kyverno.io/title: Require Health Probes
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Requires all containers in Deployments to have readiness
      and liveness probes configured for reliable health checking.
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: require-readiness-probe
      match:
        any:
          - resources:
              kinds:
                - Deployment
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: "Container '{{element.name}}' in Deployment '{{request.object.metadata.name}}' must have a readinessProbe configured."
        foreach:
          - list: "request.object.spec.template.spec.containers"
            deny:
              conditions:
                all:
                  - key: "{{ element.readinessProbe || '' }}"
                    operator: Equals
                    value: ""
    - name: require-liveness-probe
      match:
        any:
          - resources:
              kinds:
                - Deployment
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: "Container '{{element.name}}' in Deployment '{{request.object.metadata.name}}' must have a livenessProbe configured."
        foreach:
          - list: "request.object.spec.template.spec.containers"
            deny:
              conditions:
                all:
                  - key: "{{ element.livenessProbe || '' }}"
                    operator: Equals
                    value: ""
```

## Policy: Auto-Inject Default Security Context

Mutate pods to add a secure default security context.

```yaml
# policies/base/mutation/add-default-security-context.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-security-context
  annotations:
    policies.kyverno.io/title: Add Default Security Context
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Adds a default security context to pods that do not have one,
      enforcing non-root, read-only root filesystem, and no
      privilege escalation.
spec:
  background: false
  rules:
    - name: add-pod-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      mutate:
        patchStrategicMerge:
          spec:
            # Add pod-level security context if not set
            +(securityContext):
              runAsNonRoot: true
              seccompProfile:
                type: RuntimeDefault
    - name: add-container-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - name: "{{ element.name }}"
                    securityContext:
                      # Add defaults only if not already set
                      +(allowPrivilegeEscalation): false
                      +(readOnlyRootFilesystem): true
                      +(capabilities):
                        +(drop):
                          - ALL
```

## Policy: Generate Resource Quotas

Automatically create resource quotas for new namespaces.

```yaml
# policies/base/generation/generate-resource-quota.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-resource-quota
  annotations:
    policies.kyverno.io/title: Generate Resource Quota
    policies.kyverno.io/category: Resource Management
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Generates a default ResourceQuota when a new namespace is created,
      preventing any single namespace from consuming all cluster resources.
spec:
  background: false
  rules:
    - name: generate-quota
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kube-public
                - kyverno
                - flux-system
                - default
      generate:
        synchronize: true
        apiVersion: v1
        kind: ResourceQuota
        name: default-quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              # Default resource quotas for new namespaces
              requests.cpu: "4"
              requests.memory: "8Gi"
              limits.cpu: "8"
              limits.memory: "16Gi"
              pods: "50"
              services: "20"
              persistentvolumeclaims: "10"
    - name: generate-limit-range
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kube-public
                - kyverno
                - flux-system
                - default
      generate:
        synchronize: true
        apiVersion: v1
        kind: LimitRange
        name: default-limit-range
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            limits:
              - default:
                  cpu: "200m"
                  memory: "256Mi"
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
                type: Container
```

## Policy: Cleanup Completed Jobs

Automatically clean up completed and failed jobs.

```yaml
# policies/base/cleanup/cleanup-completed-jobs.yaml
apiVersion: kyverno.io/v2
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-completed-jobs
  annotations:
    policies.kyverno.io/title: Cleanup Completed Jobs
    policies.kyverno.io/category: Housekeeping
    policies.kyverno.io/description: >-
      Removes completed Jobs that are older than 24 hours
      to keep the cluster clean.
spec:
  match:
    any:
      - resources:
          kinds:
            - Job
  exclude:
    any:
      - resources:
          namespaces:
            - kube-system
  conditions:
    all:
      # Only clean up completed jobs
      - key: "{{ target.status.succeeded || '0' }}"
        operator: GreaterThan
        value: 0
      # Only clean up jobs older than 24 hours
      - key: "{{ time_since('', '{{ target.status.completionTime }}', '') }}"
        operator: GreaterThan
        value: 24h
  # Run cleanup every hour
  schedule: "0 * * * *"
```

## Environment-Specific Overlays

Use Kustomize overlays to apply different enforcement levels per environment.

```yaml
# policies/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/validation/
  - ../../base/mutation/
  - ../../base/generation/
patches:
  # Set all validation policies to Audit in staging
  - target:
      kind: ClusterPolicy
      annotationSelector: "policies.kyverno.io/category in (Best Practices, Supply Chain Security, Security)"
    patch: |
      - op: replace
        path: /spec/validationFailureAction
        value: Audit
```

```yaml
# policies/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/validation/
  - ../../base/mutation/
  - ../../base/generation/
  - ../../base/cleanup/
patches:
  # Enforce validation policies in production
  - target:
      kind: ClusterPolicy
      annotationSelector: "policies.kyverno.io/category in (Best Practices, Supply Chain Security, Security)"
    patch: |
      - op: replace
        path: /spec/validationFailureAction
        value: Enforce
```

## Flux Kustomizations for Multi-Cluster Deployment

Deploy policies to different clusters with appropriate enforcement levels.

```yaml
# clusters/staging/policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/overlays/staging
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: kyverno
```

```yaml
# clusters/production/policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/overlays/production
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: kyverno
  # Use post-build substitution for cluster-specific values
  postBuild:
    substitute:
      CLUSTER_NAME: "production-us-east-1"
      ENVIRONMENT: "production"
```

## Monitoring Policy Compliance

Track policy compliance across clusters using PolicyReports.

```bash
# Get cluster-wide policy report summary
kubectl get clusterpolicyreport -o custom-columns=\
NAME:.metadata.name,\
PASS:.summary.pass,\
FAIL:.summary.fail,\
WARN:.summary.warn,\
ERROR:.summary.error

# Get per-namespace policy reports
kubectl get policyreport --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
PASS:.summary.pass,\
FAIL:.summary.fail

# Get detailed failures for a specific namespace
kubectl get policyreport -n production -o json | \
  jq '.results[] | select(.result == "fail") | {policy: .policy, rule: .rule, resource: .resources[0].name, message: .message}'

# Check Flux reconciliation status
flux get kustomizations kyverno-policies

# List all policies and their actions
kubectl get clusterpolicies -o custom-columns=\
NAME:.metadata.name,\
ACTION:.spec.validationFailureAction,\
BACKGROUND:.spec.background,\
READY:.status.conditions[0].status

# Force policy reconciliation
flux reconcile kustomization kyverno-policies --with-source
```

## Setting Up Flux Notifications for Policy Changes

Alert on policy deployment changes.

```yaml
# infrastructure/notifications/policy-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: kyverno-policy-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: kyverno-policies
  summary: "Kyverno policy changes detected"
```

## Summary

Managing Kyverno policies with Flux CD at scale requires a structured approach to policy organization, environment-specific enforcement, and compliance monitoring. By using a base/overlay pattern with Kustomize, teams can maintain a shared policy library while customizing enforcement levels per environment. Flux CD ensures policies are automatically deployed from Git, and PolicyReports provide continuous compliance visibility. Key practices include starting with Audit mode, using PolicyExceptions for legitimate edge cases, progressively moving to Enforce, and monitoring PolicyReports to track compliance trends across clusters.
