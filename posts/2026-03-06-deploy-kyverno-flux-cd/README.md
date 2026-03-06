# How to Deploy Kyverno with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kyverno, policy engine, gitops, kubernetes, security, admission control

Description: A practical guide to deploying Kyverno as a Kubernetes-native policy engine using Flux CD for GitOps-driven policy management.

---

## Introduction

Kyverno is a Kubernetes-native policy engine that uses familiar YAML syntax instead of a specialized policy language. It can validate, mutate, generate, and clean up Kubernetes resources. Unlike OPA Gatekeeper which requires Rego, Kyverno policies are written as Kubernetes resources, making them accessible to teams already comfortable with YAML.

This guide covers deploying Kyverno with Flux CD, configuring the policy engine, and setting up your first policies.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD bootstrapped and connected to a Git repository
- kubectl configured for cluster access
- Sufficient cluster resources (Kyverno requires at least 256 MB memory)

## Adding the Kyverno Helm Repository

Register the Kyverno Helm chart repository with Flux.

```yaml
# infrastructure/sources/kyverno-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno/
```

## Creating the Kyverno Namespace

Define the namespace for Kyverno components.

```yaml
# infrastructure/kyverno/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kyverno
  labels:
    # Exempt kyverno namespace from its own policies
    pod-security.kubernetes.io/enforce: privileged
```

## Deploying Kyverno with HelmRelease

Deploy Kyverno using a Flux HelmRelease with production-ready settings.

```yaml
# infrastructure/kyverno/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 30m
  chart:
    spec:
      chart: kyverno
      version: "3.3.x"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: flux-system
      interval: 12h
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Admission controller configuration
    admissionController:
      replicas: 3
      resources:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      # Configure the admission webhook
      serviceMonitor:
        enabled: false
    # Background controller for generate and mutate existing policies
    backgroundController:
      replicas: 2
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
    # Cleanup controller for TTL-based cleanup policies
    cleanupController:
      replicas: 1
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
    # Reports controller for policy reports
    reportsController:
      replicas: 1
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
    # Configure webhook failure policy
    config:
      # Resources to exclude from policy enforcement
      resourceFiltersExcludeNamespaces:
        - kube-system
        - kyverno
        - flux-system
      # Webhook timeout in seconds
      webhookTimeout: 10
    # Feature flags
    features:
      policyExceptions:
        enabled: true
        namespace: "kyverno"
      autoUpdateWebhooks:
        enabled: true
```

## Creating the Flux Kustomization

Set up the Flux Kustomization for Kyverno deployment.

```yaml
# clusters/my-cluster/infrastructure/kyverno.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/kyverno
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kyverno-admission-controller
      namespace: kyverno
    - apiVersion: apps/v1
      kind: Deployment
      name: kyverno-background-controller
      namespace: kyverno
    - apiVersion: apps/v1
      kind: Deployment
      name: kyverno-cleanup-controller
      namespace: kyverno
    - apiVersion: apps/v1
      kind: Deployment
      name: kyverno-reports-controller
      namespace: kyverno
```

## Creating a Validation Policy

Create a policy that validates resources against defined rules.

```yaml
# infrastructure/kyverno/policies/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    # Document the policy
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Requires all Deployments and StatefulSets to have
      team and environment labels.
spec:
  # Start with audit mode before enforcing
  validationFailureAction: Audit
  # Apply to existing resources
  background: true
  rules:
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      # Exclude system namespaces
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: "The label 'team' is required on all Deployments and StatefulSets."
        pattern:
          metadata:
            labels:
              # Require the team label to be present
              team: "?*"
    - name: require-environment-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: "The label 'environment' must be one of: production, staging, development."
        pattern:
          metadata:
            labels:
              # Require environment label with specific values
              environment: "production | staging | development"
```

## Creating a Mutation Policy

Create a policy that automatically adds default values to resources.

```yaml
# infrastructure/kyverno/policies/add-default-resources.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-resources
  annotations:
    policies.kyverno.io/title: Add Default Resource Limits
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Adds default resource requests and limits to containers
      that do not have them specified.
spec:
  # Apply in background to existing resources
  background: false
  rules:
    - name: add-default-resources
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
            containers:
              # Add default resource limits to containers without them
              - (name): "*"
                resources:
                  requests:
                    +(memory): "128Mi"
                    +(cpu): "100m"
                  limits:
                    +(memory): "256Mi"
                    +(cpu): "200m"
```

## Creating a Generate Policy

Generate resources automatically when other resources are created.

```yaml
# infrastructure/kyverno/policies/generate-network-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-network-policy
  annotations:
    policies.kyverno.io/title: Generate Default Network Policy
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Generates a default-deny NetworkPolicy when a new
      namespace is created.
spec:
  background: false
  rules:
    - name: generate-default-deny
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
        # Synchronize means the generated resource stays in sync
        synchronize: true
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-all
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            # Deny all ingress and egress by default
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
            ingress: []
            egress:
              # Allow DNS resolution
              - to:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: kube-system
                ports:
                  - protocol: UDP
                    port: 53
                  - protocol: TCP
                    port: 53
```

## Creating a Container Security Policy

Enforce container security best practices.

```yaml
# infrastructure/kyverno/policies/container-security.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: container-security-baseline
  annotations:
    policies.kyverno.io/title: Container Security Baseline
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Enforces baseline container security settings including
      non-root user, read-only root filesystem, and no privilege escalation.
spec:
  validationFailureAction: Audit
  background: true
  rules:
    # Disallow privileged containers
    - name: disallow-privileged
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
      validate:
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "false"
    # Require non-root user
    - name: require-run-as-non-root
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
      validate:
        message: "Containers must run as non-root. Set runAsNonRoot to true."
        anyPattern:
          - spec:
              securityContext:
                runAsNonRoot: true
              containers:
                - =(securityContext):
                    =(runAsNonRoot): true
          - spec:
              containers:
                - securityContext:
                    runAsNonRoot: true
    # Disallow privilege escalation
    - name: disallow-privilege-escalation
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
      validate:
        message: "Privilege escalation is not allowed. Set allowPrivilegeEscalation to false."
        pattern:
          spec:
            containers:
              - securityContext:
                  allowPrivilegeEscalation: false
```

## Setting Up Policy Exceptions

Create exceptions for workloads that need to bypass specific policies.

```yaml
# infrastructure/kyverno/exceptions/monitoring-exception.yaml
apiVersion: kyverno.io/v2
kind: PolicyException
metadata:
  name: monitoring-exception
  namespace: kyverno
spec:
  # Exceptions apply to specific policies and rules
  exceptions:
    - policyName: container-security-baseline
      ruleNames:
        - require-run-as-non-root
        - disallow-privilege-escalation
  match:
    any:
      - resources:
          kinds:
            - Pod
            - Deployment
          namespaces:
            - monitoring
          names:
            - "prometheus-*"
            - "node-exporter-*"
```

## Creating the Policies Kustomization

Deploy policies after Kyverno is ready.

```yaml
# clusters/my-cluster/policies/kyverno-policies.yaml
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
  path: ./infrastructure/kyverno/policies
  prune: true
  wait: true
  timeout: 5m
  # Policies must be deployed after Kyverno is ready
  dependsOn:
    - name: kyverno
```

## Verifying the Deployment

Check that Kyverno and policies are working correctly.

```bash
# Check Flux reconciliation
flux get kustomizations kyverno
flux get kustomizations kyverno-policies

# Verify Kyverno pods are running
kubectl get pods -n kyverno

# List all cluster policies
kubectl get clusterpolicies

# Check policy reports for violations
kubectl get policyreport --all-namespaces
kubectl get clusterpolicyreport

# Get detailed report for a namespace
kubectl get policyreport -n production -o yaml

# Test a policy by creating a non-compliant resource
kubectl run test-pod --image=nginx -n default --dry-run=server

# View webhook configurations
kubectl get validatingwebhookconfigurations | grep kyverno
kubectl get mutatingwebhookconfigurations | grep kyverno
```

## Monitoring Policy Reports

Kyverno generates PolicyReport resources for audit results.

```bash
# Get summary of policy violations per namespace
kubectl get policyreport --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
PASS:.summary.pass,\
FAIL:.summary.fail,\
WARN:.summary.warn,\
ERROR:.summary.error,\
SKIP:.summary.skip

# Get detailed violation information
kubectl get policyreport -n production -o json | \
  jq '.results[] | select(.result == "fail") | {policy: .policy, rule: .rule, message: .message}'

# Force Flux reconciliation
flux reconcile kustomization kyverno-policies --with-source
```

## Summary

Deploying Kyverno with Flux CD provides a Kubernetes-native policy engine managed through GitOps. Kyverno's YAML-based policy syntax makes it accessible to teams without requiring a specialized policy language. With Flux CD managing the deployment, policies are automatically reconciled from Git, ensuring consistent enforcement across clusters. Key practices include starting with Audit mode, using PolicyExceptions for legitimate exemptions, and monitoring PolicyReports for compliance tracking.
