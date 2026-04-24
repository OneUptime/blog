# How to Enable OPA Gatekeeper Policies with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, OPA Gatekeeper, Security, Policy

Description: Learn how to deploy and manage OPA Gatekeeper admission controller policies in Kubernetes clusters managed by Portainer to enforce custom security and compliance rules.

## Introduction

OPA (Open Policy Agent) Gatekeeper is a Kubernetes admission controller that enforces customizable policies on resources being created or updated in the cluster. When deployed in a cluster managed by Portainer, Gatekeeper policies apply to all resources including those deployed through Portainer's UI or API.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment
- kubectl access via Portainer kubectl shell or downloaded kubeconfig
- Cluster admin access
- Helm installed (for Gatekeeper installation)

## Step 1: Install OPA Gatekeeper

Use Portainer's Helm application flow to install Gatekeeper:

1. Go to your Kubernetes environment → **Applications**.
2. Create a new application from a Helm chart and choose **Helm repository** as the deployment method.
3. Select a chart source that exposes the Gatekeeper Helm repository:
   - URL: `https://open-policy-agent.github.io/gatekeeper/charts`
4. Install the `gatekeeper` chart in the `gatekeeper-system` namespace.

Or use the kubectl shell:

```bash
# Add Gatekeeper Helm repo

helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm repo update

# Install Gatekeeper in its own namespace
helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set replicas=2 \
  --set auditInterval=60

# Verify installation
kubectl get pods -n gatekeeper-system
kubectl get crd | grep -E "(constraint|gatekeeper)"
```

## Step 2: Create a ConstraintTemplate

A ConstraintTemplate defines the schema and Rego policy logic:

```yaml
# require-labels-template.yaml - Require specific labels on namespaces
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
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

```bash
# Apply via kubectl shell
kubectl apply -f require-labels-template.yaml
```

## Step 3: Create a Constraint

A Constraint applies the template to specific resources:

```yaml
# require-labels-constraint.yaml - Enforce labels on all namespaces
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: ns-require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
    excludedNamespaces:
      - kube-system
      - kube-public
      - gatekeeper-system
      - portainer
  parameters:
    labels:
      - team       # Every namespace must have a "team" label
      - env        # Every namespace must have an "env" label
```

```bash
kubectl apply -f require-labels-constraint.yaml
```

## Step 4: Common Security Policies

### Require Resource Limits

```yaml
# require-resource-limits-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequireresourcelimits
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResourceLimits
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresourcelimits

        violation[{"msg": msg}] {
          container := input_containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container '%v' must have memory limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input_containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container '%v' must have CPU limits", [container.name])
        }

        input_containers[c] {
          c := input.review.object.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.initContainers[_]
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResourceLimits
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
```

### Block Privileged Containers

```yaml
# no-privileged-containers.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8snoprivilegedcontainer
spec:
  crd:
    spec:
      names:
        kind: K8sNoPrivilegedContainer
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8snoprivilegedcontainer

        violation[{"msg": msg}] {
          container := input_containers[_]
          container.securityContext.privileged == true
          msg := sprintf("Container '%v' cannot run in privileged mode", [container.name])
        }

        input_containers[c] {
          c := input.review.object.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.ephemeralContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.initContainers[_]
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sNoPrivilegedContainer
metadata:
  name: no-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: ["", "apps", "batch"]
        kinds: ["Pod", "Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
```

### Require Approved Image Registries

```yaml
# allowed-registries.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedregistries
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedregistries

        violation[{"msg": msg}] {
          container := input_containers[_]
          image := container.image
          not starts_with_allowed(image)
          msg := sprintf("Image '%v' is not from an approved registry", [image])
        }

        input_containers[c] {
          c := input.review.object.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.ephemeralContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.template.spec.initContainers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.jobTemplate.spec.template.spec.initContainers[_]
        }

        starts_with_allowed(image) {
          prefix := input.parameters.registries[_]
          startswith(image, prefix)
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRegistries
metadata:
  name: allowed-registries
spec:
  match:
    kinds:
      - apiGroups: ["", "apps", "batch"]
        kinds: ["Pod", "Deployment", "StatefulSet"]
  parameters:
    registries:
      - "registry.company.com/"
      - "ghcr.io/your-org/"
```

## Step 5: Test Policies

```bash
# Test a policy violation
kubectl run test-pod-disallowed --image=docker.io/nginx -n default
# Expected error: Image 'docker.io/nginx' is not from an approved registry

# Test compliance
kubectl run test-pod-allowed --image=registry.company.com/nginx:latest -n default
# Expected: pod/test-pod-allowed created

# View constraint violations from audit
kubectl describe k8sallowedregistries allowed-registries
kubectl get k8sallowedregistries -o yaml | grep -A 20 "violations:"
```

## Step 6: Monitor Gatekeeper in Portainer

```bash
# Check Gatekeeper pod health via kubectl shell
kubectl get pods -n gatekeeper-system
kubectl logs -n gatekeeper-system deploy/gatekeeper-controller-manager --tail=50

# Check audit results
kubectl get constraints
```

## Conclusion

OPA Gatekeeper in Portainer-managed Kubernetes clusters provides policy-as-code enforcement that applies to all deployments regardless of how they're initiated - whether through Portainer's UI, API, kubectl, or CI/CD pipelines. Start with critical policies (no privileged containers, required resource limits), test in audit mode before enforcing, and gradually add more policies as your team becomes familiar with the constraints.
