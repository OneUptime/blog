# How to Deploy OPA Gatekeeper for Policy-Based Kubernetes Admission Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPA, Gatekeeper, Kubernetes

Description: Deploy and configure OPA Gatekeeper to enforce policy-based admission control in Kubernetes clusters, preventing non-compliant resources from being created.

---

OPA Gatekeeper extends Kubernetes with policy-based admission control using Open Policy Agent. Unlike traditional admission webhooks, Gatekeeper provides a declarative way to define and enforce policies through Custom Resource Definitions, making policy management more accessible and GitOps-friendly.

## Installing OPA Gatekeeper

Deploy Gatekeeper using kubectl:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

Or use Helm:

```bash
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper/gatekeeper --name-template=gatekeeper --namespace gatekeeper-system --create-namespace
```

Verify installation:

```bash
kubectl get pods -n gatekeeper-system
kubectl get crd | grep gatekeeper
```

## Understanding Gatekeeper Architecture

Gatekeeper consists of:

- **Validating Admission Webhook**: Intercepts API requests
- **Constraint Templates**: Define policy logic using Rego
- **Constraints**: Instantiate templates with parameters
- **Audit**: Periodically checks existing resources for violations

## Creating Your First Constraint Template

Define a template that requires labels:

```yaml
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

Apply the template:

```bash
kubectl apply -f required-labels-template.yaml
```

## Creating Constraints

Instantiate the template with specific requirements:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - "team"
      - "environment"
```

Apply the constraint:

```bash
kubectl apply -f require-team-label.yaml
```

Test the policy:

```bash
# This will fail
kubectl create namespace test-namespace

# This will succeed
kubectl create namespace test-namespace --labels=team=platform,environment=dev
```

## Container Image Policy

Enforce approved container registries:

```yaml
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
          satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
          not any(satisfied)
          msg := sprintf("Container image %v not from approved registry", [container.image])
        }
```

Constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: approved-registries
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    repos:
      - "gcr.io/mycompany/"
      - "myregistry.azurecr.io/"
```

## Resource Limits Policy

Require resource limits on all containers:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8scontainerlimits
spec:
  crd:
    spec:
      names:
        kind: K8sContainerLimits
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8scontainerlimits

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits
          msg := sprintf("Container %v must specify resource limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container %v must specify memory limit", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container %v must specify CPU limit", [container.name])
        }
```

## Excluding Namespaces

Exempt system namespaces from policies:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    excludedNamespaces:
      - kube-system
      - kube-public
      - gatekeeper-system
  parameters:
    labels: ["app", "version"]
```

## Audit Mode

Check existing resources for violations without blocking:

```bash
# View audit results
kubectl get constraints

# Get detailed violations
kubectl get k8srequiredlabels require-team-label -o yaml

# View audit logs
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit
```

Violations appear in constraint status:

```yaml
status:
  auditTimestamp: "2026-02-09T10:30:00Z"
  totalViolations: 3
  violations:
    - enforcementAction: deny
      kind: Namespace
      name: test-namespace
      message: "Missing required labels: [team, environment]"
```

## Enforcement Actions

Control how violations are handled:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels
spec:
  enforcementAction: dryrun  # or deny, warn
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels: ["app"]
```

Enforcement actions:
- **deny**: Block resource creation (default)
- **dryrun**: Log violations, don't block
- **warn**: Show warnings, allow creation

## Monitoring and Observability

Export metrics for monitoring:

```bash
# Gatekeeper exposes Prometheus metrics
kubectl port-forward -n gatekeeper-system svc/gatekeeper-webhook-service 8888:443

# View metrics
curl -k https://localhost:8888/metrics
```

Key metrics:
- `gatekeeper_constraints` - Number of constraints
- `gatekeeper_constraint_template_count` - Number of templates
- `gatekeeper_violations` - Total violations detected

OPA Gatekeeper provides policy-based admission control for Kubernetes, enforcing organizational standards and security requirements before resources are created. By defining policies as code, you ensure consistent compliance across all clusters and workloads.
