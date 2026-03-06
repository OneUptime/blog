# How to Deploy OPA Gatekeeper with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, OPA, Gatekeeper, Policy Engine, GitOps, Kubernetes, Security, Admission Control

Description: A step-by-step guide to deploying OPA Gatekeeper as a Kubernetes policy engine using Flux CD for GitOps-driven policy enforcement.

---

## Introduction

OPA Gatekeeper is a customizable admission webhook for Kubernetes that enforces policies defined using the Open Policy Agent (OPA) framework. It uses the Rego policy language and Kubernetes-native CRDs (ConstraintTemplates and Constraints) to validate, mutate, and audit resources. Deploying Gatekeeper through Flux CD ensures your policy infrastructure is version-controlled, auditable, and consistently applied across clusters.

This guide covers deploying Gatekeeper, configuring basic policies, and managing the policy lifecycle with Flux CD.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD bootstrapped and connected to a Git repository
- kubectl configured for cluster access
- Basic understanding of OPA and the Rego policy language

## Adding the Gatekeeper Helm Repository

Register the Gatekeeper Helm chart repository with Flux.

```yaml
# infrastructure/sources/gatekeeper-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gatekeeper
  namespace: flux-system
spec:
  interval: 1h
  url: https://open-policy-agent.github.io/gatekeeper/charts
```

## Creating the Gatekeeper Namespace

Define the namespace for Gatekeeper components.

```yaml
# infrastructure/gatekeeper/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gatekeeper-system
  labels:
    # Exclude gatekeeper namespace from policy enforcement
    admission.gatekeeper.sh/ignore: "no-self-managing"
    # Prevent Istio sidecar injection if service mesh is present
    istio-injection: disabled
```

## Deploying Gatekeeper with HelmRelease

Deploy Gatekeeper using a Flux HelmRelease.

```yaml
# infrastructure/gatekeeper/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gatekeeper
  namespace: gatekeeper-system
spec:
  interval: 30m
  chart:
    spec:
      chart: gatekeeper
      version: "3.17.x"
      sourceRef:
        kind: HelmRepository
        name: gatekeeper
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
    # Webhook configuration
    validatingWebhookName: gatekeeper-validating-webhook-configuration
    mutatingWebhookName: gatekeeper-mutating-webhook-configuration
    # Number of audit controller replicas
    replicas: 3
    # Audit configuration
    audit:
      # How often to run audit scans
      auditInterval: 60
      # Number of violations to report per constraint
      constraintViolationsLimit: 20
      # Write audit results back to constraint status
      auditFromCache: true
      resources:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"
          cpu: "500m"
    # Controller manager configuration
    controllerManager:
      resources:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"
          cpu: "500m"
    # Enable mutation support
    enableMutation: true
    # Configure which namespaces to exempt from policies
    exemptNamespaces:
      - kube-system
      - gatekeeper-system
      - flux-system
    # Enable external data provider support
    enableExternalData: false
    # Log level
    logLevel: INFO
    # Pod disruption budget
    pdb:
      controllerManager:
        minAvailable: 1
```

## Creating the Flux Kustomization

Set up the Flux Kustomization for Gatekeeper deployment.

```yaml
# clusters/my-cluster/infrastructure/gatekeeper.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: gatekeeper-controller-manager
      namespace: gatekeeper-system
    - apiVersion: apps/v1
      kind: Deployment
      name: gatekeeper-audit
      namespace: gatekeeper-system
```

## Deploying a ConstraintTemplate

Create a ConstraintTemplate that defines the policy logic.

```yaml
# infrastructure/gatekeeper/templates/required-labels.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Define the parameters this template accepts
            labels:
              type: array
              description: "List of required labels"
              items:
                type: object
                properties:
                  key:
                    type: string
                    description: "The label key"
                  allowedRegex:
                    type: string
                    description: "Optional regex for allowed values"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        # Check if all required labels are present
        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_].key}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }

        # Check if label values match the allowed regex
        violation[{"msg": msg}] {
          label := input.parameters.labels[_]
          label.allowedRegex != ""
          value := input.review.object.metadata.labels[label.key]
          not re_match(label.allowedRegex, value)
          msg := sprintf("Label <%v: %v> does not match regex %v", [label.key, value, label.allowedRegex])
        }
```

## Creating a Constraint

Apply the ConstraintTemplate by creating a Constraint resource.

```yaml
# infrastructure/gatekeeper/constraints/require-team-label.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  # Start in dryrun mode to see violations without blocking
  enforcementAction: dryrun
  match:
    # Apply to specific resource kinds
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
    # Exclude system namespaces
    excludedNamespaces:
      - kube-system
      - kube-public
      - gatekeeper-system
      - flux-system
  parameters:
    labels:
      # Require a team label on all matching resources
      - key: "team"
        allowedRegex: "^[a-z]+-[a-z]+$"
      # Require an environment label
      - key: "environment"
        allowedRegex: "^(production|staging|development)$"
```

## Adding a Container Image Policy

Create a policy to restrict container images to approved registries.

```yaml
# infrastructure/gatekeeper/templates/allowed-repos.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              description: "List of allowed container image repositories"
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos

        # Check all containers in a pod
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf("Container <%v> image <%v> is not from an allowed repository. Allowed repos: %v", [container.name, container.image, input.parameters.repos])
        }

        # Check init containers as well
        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf("Init container <%v> image <%v> is not from an allowed repository", [container.name, container.image])
        }

        # Helper function to check if image starts with any allowed repo
        startswith_any(image, repos) {
          repo := repos[_]
          startswith(image, repo)
        }
```

```yaml
# infrastructure/gatekeeper/constraints/allowed-repos.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-container-repos
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - flux-system
  parameters:
    repos:
      # Only allow images from these registries
      - "my-registry.example.com/"
      - "docker.io/library/"
      - "gcr.io/distroless/"
```

## Configuring Gatekeeper Config

Define which resources Gatekeeper should sync for audit purposes.

```yaml
# infrastructure/gatekeeper/config.yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  sync:
    syncOnly:
      # Sync namespaces for referential policies
      - group: ""
        version: "v1"
        kind: "Namespace"
      # Sync pods for container image policies
      - group: ""
        version: "v1"
        kind: "Pod"
      # Sync services for network policy validation
      - group: ""
        version: "v1"
        kind: "Service"
  # Validation configuration
  validation:
    traces:
      - user: "system:serviceaccount:gatekeeper-system:gatekeeper-admin"
        kind:
          group: ""
          version: "v1"
          kind: "Namespace"
```

## Organizing Policies with Flux Kustomizations

Separate policy templates and constraints into different Kustomizations for proper ordering.

```yaml
# clusters/my-cluster/policies/templates.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-templates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper/templates
  prune: true
  wait: true
  timeout: 5m
  # Templates must be deployed after Gatekeeper is ready
  dependsOn:
    - name: gatekeeper
---
# Constraints depend on templates being ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-constraints
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper/constraints
  prune: true
  wait: true
  timeout: 5m
  # Constraints must be deployed after templates
  dependsOn:
    - name: gatekeeper-templates
```

## Monitoring Gatekeeper

Set up monitoring for policy violations and Gatekeeper health.

```bash
# Check Gatekeeper pod status
kubectl get pods -n gatekeeper-system

# View all constraint templates
kubectl get constrainttemplates

# View all constraints and their violation counts
kubectl get constraints

# Check audit results for a specific constraint
kubectl get k8srequiredlabels require-team-label -o yaml

# View detailed violation information
kubectl describe k8srequiredlabels require-team-label

# Check Flux reconciliation
flux get kustomizations gatekeeper
flux get kustomizations gatekeeper-templates
flux get kustomizations gatekeeper-constraints

# View Gatekeeper webhook logs
kubectl logs -n gatekeeper-system -l control-plane=controller-manager --tail=50
```

## Transitioning from Dryrun to Enforce

Gradually move from audit-only mode to enforcement.

```yaml
# Step 1: Start with dryrun to see violations
spec:
  enforcementAction: dryrun

# Step 2: Move to warn to notify users without blocking
spec:
  enforcementAction: warn

# Step 3: Finally enforce the policy
spec:
  enforcementAction: deny
```

Update the enforcementAction in your constraint YAML files and commit to Git. Flux will automatically reconcile the changes.

## Summary

Deploying OPA Gatekeeper with Flux CD establishes a GitOps-driven policy enforcement framework for Kubernetes. By storing ConstraintTemplates and Constraints in Git, every policy change is reviewed, version-controlled, and automatically applied. The combination of Gatekeeper's audit capabilities and Flux's reconciliation ensures policies are consistently enforced and violations are tracked over time. Start with dryrun mode to understand the impact before enforcing policies in production.
