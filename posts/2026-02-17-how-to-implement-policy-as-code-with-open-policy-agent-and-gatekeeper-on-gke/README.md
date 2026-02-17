# How to Implement Policy as Code with Open Policy Agent and Gatekeeper on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Open Policy Agent, Security

Description: Implement policy as code on GKE using Open Policy Agent and Gatekeeper to enforce security and compliance rules across your Kubernetes clusters.

---

Running Kubernetes without admission policies is like leaving your front door wide open and hoping nobody walks in. On GKE, you can use Open Policy Agent (OPA) with Gatekeeper to enforce policies that prevent misconfigurations before they ever reach your cluster.

This is not just about security, though that is a big part of it. Policy as code also helps with consistency, compliance, and catching mistakes in development rather than production. In this post, I will walk through setting up Gatekeeper on GKE, writing constraint templates, and building a workflow that scales.

## Why Gatekeeper Over Raw OPA

You might wonder why we use Gatekeeper instead of deploying OPA directly. Gatekeeper is purpose-built for Kubernetes. It integrates as a validating admission webhook, uses Custom Resource Definitions (CRDs) for policies, and provides audit functionality out of the box. Raw OPA requires you to build all that plumbing yourself.

## Installing Gatekeeper on GKE

First, make sure you have a GKE cluster. Then install Gatekeeper using kubectl:

```bash
# Install Gatekeeper v3.15 on your GKE cluster
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/deploy/gatekeeper.yaml

# Verify the installation - all pods should be Running
kubectl get pods -n gatekeeper-system
```

You should see the gatekeeper-controller-manager and gatekeeper-audit pods running. The controller handles admission requests in real-time, while the audit pod periodically scans existing resources for violations.

## Understanding Constraint Templates and Constraints

Gatekeeper uses a two-level system. A ConstraintTemplate defines the policy logic in Rego (OPA's policy language), and a Constraint applies that template with specific parameters.

Think of it like this: the template is a function definition, and the constraint is a function call with arguments.

## Writing Your First Constraint Template

Let us start with a common requirement - blocking containers from running as root. Here is the constraint template:

```yaml
# template-disallow-root.yaml
# Constraint template that blocks containers running as root
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sdisallowroot
spec:
  crd:
    spec:
      names:
        kind: K8sDisallowRoot
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Allow specifying which containers to exempt
            exemptContainers:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sdisallowroot

        # Check pod-level security context
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          container.securityContext.runAsUser == 0
          msg := sprintf("Container %v is running as root (UID 0)", [container.name])
        }

        # Check if runAsNonRoot is explicitly set to false
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          container.securityContext.runAsNonRoot == false
          msg := sprintf("Container %v has runAsNonRoot set to false", [container.name])
        }

        # Check init containers as well
        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not is_exempt(container.name)
          container.securityContext.runAsUser == 0
          msg := sprintf("Init container %v is running as root", [container.name])
        }

        is_exempt(name) {
          exempt := input.parameters.exemptContainers[_]
          name == exempt
        }
```

Now apply a constraint that uses this template:

```yaml
# constraint-disallow-root.yaml
# Applies the no-root policy to all namespaces except kube-system
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowRoot
metadata:
  name: disallow-root-containers
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
  parameters:
    exemptContainers:
      - istio-init  # Istio init container needs root
```

## More Practical Policies

Here are several more constraint templates that most GKE clusters should have.

This template enforces resource limits on all containers:

```yaml
# template-require-resource-limits.yaml
# Ensures all containers specify CPU and memory limits
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
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container %v must specify cpu limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container %v must specify memory limits", [container.name])
        }
```

This template restricts which container registries are allowed:

```yaml
# template-allowed-registries.yaml
# Only allows images from approved container registries
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
          container := input.review.object.spec.containers[_]
          not registry_allowed(container.image)
          msg := sprintf(
            "Container %v uses image %v from unauthorized registry. Allowed: %v",
            [container.name, container.image, input.parameters.registries]
          )
        }

        registry_allowed(image) {
          registry := input.parameters.registries[_]
          startswith(image, registry)
        }
```

Apply it to only allow images from your Artifact Registry:

```yaml
# constraint-allowed-registries.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRegistries
metadata:
  name: only-approved-registries
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  parameters:
    registries:
      - "us-docker.pkg.dev/my-project/"
      - "gcr.io/my-project/"
```

## Testing Policies Before Enforcement

You do not want to roll out deny-mode policies on day one and break every deployment pipeline. Use the dryrun enforcement action first:

```yaml
# Start with dryrun to see what would be blocked
spec:
  enforcementAction: dryrun
```

Then check violations using the audit feature:

```bash
# List all violations found by the audit controller
kubectl get k8sdisallowroot disallow-root-containers -o yaml | \
  grep -A 100 'violations:'
```

## Integrating with CI/CD

Catch policy violations before they even reach the cluster by running Gatekeeper in your CI pipeline. You can use the gator CLI tool:

```bash
# Install gator CLI
go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@latest

# Test your Kubernetes manifests against your policies
gator verify ./policies/...

# Test a specific manifest against all constraint templates
gator test --filename=deployment.yaml --filename=policies/
```

Add this to your Cloud Build pipeline:

```yaml
# cloudbuild.yaml
# Run policy checks before deploying to GKE
steps:
  - name: 'golang:1.22'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@latest
        gator test --filename=k8s/ --filename=policies/
    id: 'policy-check'

  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['apply', '-f', 'k8s/']
    waitFor: ['policy-check']
```

## Monitoring Policy Violations

Set up alerting for policy violations so you know when something is trying to break the rules:

```yaml
# Log-based metric for policy violations
resource "google_logging_metric" "gatekeeper_violations" {
  name   = "gatekeeper-admission-violations"
  filter = <<-EOT
    resource.type="k8s_cluster"
    jsonPayload.msg=~"denied admission"
    jsonPayload.msg=~"gatekeeper"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}
```

## Practical Advice

Start small. Pick three to five policies that match your biggest risks, deploy them in dryrun mode, and let them soak for a week. Review the violations, fix the legitimate issues, add exemptions for the intentional ones, and then flip to deny mode.

Keep your constraint templates in a dedicated Git repository. Version them, review them in pull requests, and deploy them through a pipeline - just like application code.

Finally, document why each policy exists. Six months from now, someone will want to know why their deployment is being rejected. A clear description in the constraint metadata saves everyone time.

Policy as code on GKE with Gatekeeper is one of those investments that pays for itself quickly. The initial setup takes a day or two, but the misconfiguration it prevents over time makes it well worth the effort.
