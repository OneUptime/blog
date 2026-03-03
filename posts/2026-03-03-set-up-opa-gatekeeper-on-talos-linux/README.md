# How to Set Up OPA Gatekeeper on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OPA Gatekeeper, Kubernetes, Policy Enforcement, Security

Description: Learn how to deploy and configure OPA Gatekeeper on Talos Linux to enforce custom policies across your Kubernetes cluster.

---

Open Policy Agent (OPA) Gatekeeper is a customizable admission webhook for Kubernetes that enforces policies written in the Rego language. It intercepts API requests before they are persisted to etcd and evaluates them against your defined policies. If a request violates a policy, it gets rejected with a clear error message.

On Talos Linux, where the operating system itself is locked down, adding policy enforcement at the Kubernetes API level with Gatekeeper completes the security picture. You get OS-level immutability from Talos and API-level policy enforcement from Gatekeeper. This guide covers installation, policy creation, and operational best practices.

## Prerequisites

- A running Talos Linux cluster
- kubectl and Helm installed locally
- Cluster admin access

## Installing OPA Gatekeeper

The recommended installation method is through the official Helm chart.

```bash
# Add the Gatekeeper Helm repository
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm repo update

# Install Gatekeeper
helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set replicas=3 \
  --set audit.replicas=1 \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=256Mi \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi
```

Verify the installation.

```bash
# Check that all pods are running
kubectl get pods -n gatekeeper-system

# You should see:
# gatekeeper-audit-xxx
# gatekeeper-controller-manager-xxx (3 replicas)

# Verify the webhook is registered
kubectl get validatingwebhookconfigurations | grep gatekeeper
```

## Understanding the Gatekeeper Architecture

Gatekeeper uses two primary custom resources:

- **ConstraintTemplate**: Defines the policy logic in Rego. Think of it as the blueprint for a type of policy.
- **Constraint**: An instance of a ConstraintTemplate applied with specific parameters. This is what actually enforces the rule.

The flow is: you create a ConstraintTemplate that defines what to check, then you create one or more Constraints that use that template with specific settings.

## Creating Your First Policy: Require Labels

Let us start with a common policy - requiring specific labels on all resources.

```yaml
# require-labels-template.yaml
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

        # Check if the required labels are present
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

Now create a constraint that uses this template.

```yaml
# require-team-label.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - cert-manager
  parameters:
    labels:
      - "team"
      - "environment"
```

```bash
kubectl apply -f require-labels-template.yaml
kubectl apply -f require-team-label.yaml

# Test by creating a namespace without the required labels
kubectl create namespace test-ns
# Error: Missing required labels: {"environment", "team"}

# Now create it with the correct labels
kubectl create namespace test-ns --dry-run=client -o yaml | \
  kubectl label --local -f - team=backend environment=staging --dry-run=client -o yaml | \
  kubectl apply -f -
```

## Policy: Block Privileged Containers

Prevent containers from running in privileged mode.

```yaml
# block-privileged-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sblockprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sBlockPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sblockprivileged

        # Check all containers in the pod
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          container.securityContext.privileged == true
          msg := sprintf("Privileged container not allowed: %v", [container.name])
        }

        # Also check init containers
        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          container.securityContext.privileged == true
          msg := sprintf("Privileged init container not allowed: %v", [container.name])
        }
```

```yaml
# block-privileged-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sBlockPrivileged
metadata:
  name: block-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
```

## Policy: Enforce Resource Limits

Require all containers to have resource requests and limits defined.

```yaml
# require-resources-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequireresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResources
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresources

        # Check that CPU requests are set
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.requests.cpu
          msg := sprintf("Container %v must have CPU requests", [container.name])
        }

        # Check that memory requests are set
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.requests.memory
          msg := sprintf("Container %v must have memory requests", [container.name])
        }

        # Check that CPU limits are set
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container %v must have CPU limits", [container.name])
        }

        # Check that memory limits are set
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container %v must have memory limits", [container.name])
        }
```

```yaml
# require-resources-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResources
metadata:
  name: require-container-resources
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
  enforcementAction: warn  # Start with warnings before enforcing
```

Notice the `enforcementAction: warn` setting. This lets you test policies without blocking anything. Once you are confident the policy is correct, change it to `deny`.

## Policy: Restrict Image Registries

Only allow images from trusted registries.

```yaml
# allowed-repos-template.yaml
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
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf("Container %v uses image %v which is not from an allowed repository", [container.name, container.image])
        }

        startswith_any(str, prefixes) {
          prefix := prefixes[_]
          startswith(str, prefix)
        }
```

```yaml
# allowed-repos-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: restrict-image-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  parameters:
    repos:
      - "registry.example.com/"
      - "ghcr.io/my-org/"
      - "docker.io/library/"
```

## Auditing Existing Resources

Gatekeeper runs an audit process that periodically checks existing resources against constraints. This helps you find violations that were created before the policy was in place.

```bash
# Check audit results for a specific constraint
kubectl get k8srequiredlabels require-team-label -o yaml | \
  grep -A 50 "violations:"

# Or list all violations across all constraints
kubectl get constraints -o json | \
  jq '.items[] | select(.status.violations) | {kind: .kind, name: .metadata.name, violations: .status.violations}'
```

## Excluding System Namespaces

Always exclude system namespaces from your policies to avoid breaking critical components.

```yaml
# Global exclusion configuration
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  match:
    - excludedNamespaces:
        - kube-system
        - gatekeeper-system
        - cert-manager
        - flux-system
      processes:
        - "*"
```

## Monitoring Gatekeeper

```bash
# Check Gatekeeper metrics
kubectl get --raw /metrics -n gatekeeper-system | grep gatekeeper

# Key metrics to monitor:
# gatekeeper_violations - current violation count
# gatekeeper_constraint_template_status - template health
# gatekeeper_request_duration_seconds - webhook latency
```

High webhook latency can slow down all API requests, so monitor this closely and scale up Gatekeeper replicas if needed.

## Wrapping Up

OPA Gatekeeper on Talos Linux provides a powerful policy enforcement layer that complements Talos's OS-level security. By defining policies as code, you can enforce organizational standards consistently across all clusters. Start with policies in warn mode, review the audit results, and gradually move to deny mode as your team adapts. The combination of Talos Linux's immutable infrastructure and Gatekeeper's policy enforcement gives you a defense-in-depth approach that covers both the operating system and the Kubernetes API layers.
