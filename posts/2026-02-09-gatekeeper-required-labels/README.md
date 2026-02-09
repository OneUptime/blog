# How to Implement Gatekeeper Constraints for Required Labels and Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Labels

Description: Implement Gatekeeper constraints to enforce required labels and annotations on Kubernetes resources, ensuring consistent metadata for organization and automation.

---

Labels and annotations provide essential metadata for Kubernetes resources, enabling organization, automation, and cost tracking. Gatekeeper constraints enforce label and annotation requirements, preventing resources from being created without proper metadata.

## Basic Required Labels Constraint

Require specific labels on all namespaces:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: namespace-required-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - "team"
      - "environment"
      - "cost-center"
```

Test the constraint:

```bash
# Fails - missing labels
kubectl create namespace test

# Succeeds
kubectl create namespace test \
  --labels=team=platform,environment=dev,cost-center=engineering
```

## Deployment Labels

Require labels on all deployments:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: deployment-required-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels:
      - "app"
      - "version"
      - "owner"
```

Example compliant deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
    version: v1.2.0
    owner: platform-team
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        version: v1.2.0
    spec:
      containers:
        - name: api
          image: myapp/api:v1.2.0
```

## Required Annotations

Enforce annotations for documentation and tooling:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredannotations
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredAnnotations
      validation:
        openAPIV3Schema:
          type: object
          properties:
            annotations:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredannotations

        violation[{"msg": msg}] {
          provided := {annotation | input.review.object.metadata.annotations[annotation]}
          required := {annotation | annotation := input.parameters.annotations[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required annotations: %v", [missing])
        }
```

Constraint requiring documentation:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredAnnotations
metadata:
  name: deployment-annotations
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    annotations:
      - "description"
      - "documentation-url"
      - "oncall-team"
```

## Combining Labels and Annotations

Enforce both on services:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: service-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Service"]
  parameters:
    labels:
      - "app"
      - "service-type"

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredAnnotations
metadata:
  name: service-annotations
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Service"]
  parameters:
    annotations:
      - "prometheus.io/scrape"
      - "prometheus.io/port"
```

## Label Value Validation

Validate label values match allowed patterns:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedlabelvalues
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedLabelValues
      validation:
        openAPIV3Schema:
          type: object
          properties:
            label:
              type: string
            allowedValues:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedlabelvalues

        violation[{"msg": msg}] {
          label_key := input.parameters.label
          label_value := input.review.object.metadata.labels[label_key]
          allowed := input.parameters.allowedValues
          not label_value_allowed(label_value, allowed)
          msg := sprintf("Label %v has invalid value %v, allowed: %v", [label_key, label_value, allowed])
        }

        label_value_allowed(value, allowed) {
          allowed[_] == value
        }
```

Enforce specific environment values:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedLabelValues
metadata:
  name: environment-values
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    label: "environment"
    allowedValues:
      - "dev"
      - "staging"
      - "production"
```

## Excluding System Namespaces

Skip enforcement for system namespaces:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: app-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
    excludedNamespaces:
      - kube-system
      - kube-public
      - gatekeeper-system
      - kube-node-lease
  parameters:
    labels:
      - "app"
      - "version"
```

## Audit Existing Resources

Check existing resources for compliance:

```bash
# View constraint status
kubectl get k8srequiredlabels namespace-required-labels -o yaml

# Check violations
kubectl describe k8srequiredlabels namespace-required-labels
```

Output shows violations:

```yaml
status:
  totalViolations: 5
  violations:
    - enforcementAction: deny
      kind: Namespace
      message: "Missing required labels: [team, cost-center]"
      name: test-namespace
```

Required labels and annotations constraints ensure consistent metadata across Kubernetes resources, enabling better organization, automation, and operational visibility.
