# How to Implement CEL-Based ValidatingAdmissionPolicy for Kubernetes Native Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CEL, Admission Control, ValidatingAdmissionPolicy, Policy Enforcement

Description: Learn how to use Kubernetes native ValidatingAdmissionPolicy with Common Expression Language (CEL) to enforce policies without external webhooks, improving performance and reducing operational complexity.

---

ValidatingAdmissionPolicy brings native policy enforcement to Kubernetes using Common Expression Language (CEL). Unlike external admission controllers like OPA Gatekeeper or Kyverno, ValidatingAdmissionPolicy runs in-process within the API server, reducing latency and eliminating external dependencies. This guide shows you how to write effective CEL-based policies for common security and compliance requirements.

## Understanding ValidatingAdmissionPolicy

ValidatingAdmissionPolicy became stable in Kubernetes 1.30 and provides a built-in alternative to webhook-based admission control. Policies use CEL expressions to evaluate resources during admission, blocking requests that violate rules. The API server evaluates expressions directly without external calls, making admission faster and more reliable.

CEL is a Google-developed expression language designed for fast, safe evaluation. It provides familiar syntax similar to JavaScript or Go, with built-in functions for string manipulation, list operations, and type checking.

## Enabling ValidatingAdmissionPolicy

For Kubernetes 1.30+, ValidatingAdmissionPolicy is enabled by default. For earlier versions, enable the feature gate:

```bash
# Check if the API is available
kubectl api-resources | grep validatingadmissionpolicies

# If using kubeadm, add to the API server configuration
# /etc/kubernetes/manifests/kube-apiserver.yaml
--feature-gates=ValidatingAdmissionPolicy=true
```

Verify the feature is available before creating policies.

## Writing Your First Policy

Create a policy that requires all pods to have specific labels:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-labels
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: "has(object.metadata.labels.team)"
      message: "Pod must have a 'team' label"
    - expression: "has(object.metadata.labels.environment)"
      message: "Pod must have an 'environment' label"
```

The policy uses two validation expressions. The `has()` function checks if a field exists. The `object` variable refers to the resource being created or updated.

Now create a binding to activate the policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-labels-binding
spec:
  policyName: require-labels
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchExpressions:
        - key: environment
          operator: In
          values: ["production", "staging"]
```

The binding connects the policy to specific namespaces. This separation lets you define policies once and bind them differently for various environments.

## Validating Label Values

Check not just label presence but also valid values:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: validate-environment-label
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: |
        has(object.metadata.labels.environment) &&
        object.metadata.labels.environment in ['dev', 'staging', 'production']
      message: "environment label must be 'dev', 'staging', or 'production'"
```

The `in` operator checks if a value exists in a list. Multiple conditions combine with `&&` for logical AND operations.

## Enforcing Container Security

Prevent containers from running as root using CEL:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-nonroot
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: |
        object.spec.containers.all(c,
          has(c.securityContext) &&
          has(c.securityContext.runAsNonRoot) &&
          c.securityContext.runAsNonRoot == true
        )
      message: "All containers must set runAsNonRoot to true"
    - expression: |
        !has(object.spec.initContainers) ||
        object.spec.initContainers.all(c,
          has(c.securityContext) &&
          has(c.securityContext.runAsNonRoot) &&
          c.securityContext.runAsNonRoot == true
        )
      message: "All init containers must set runAsNonRoot to true"
```

The `all()` function iterates over collections, ensuring every element matches the condition. The second expression uses `!has()` to make init containers optional, only checking them when they exist.

## Restricting Resource Limits

Ensure all containers define resource limits:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: |
        object.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.limits) &&
          has(c.resources.limits.memory) &&
          has(c.resources.limits.cpu)
        )
      message: "All containers must define CPU and memory limits"
    - expression: |
        object.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.requests) &&
          has(c.resources.requests.memory) &&
          has(c.resources.requests.cpu)
        )
      message: "All containers must define CPU and memory requests"
```

Breaking validations into separate expressions provides clearer error messages when specific checks fail.

## Validating Image Sources

Restrict images to approved registries:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restrict-image-registries
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: |
        object.spec.containers.all(c,
          c.image.startsWith('registry.company.com/') ||
          c.image.startsWith('docker.io/library/')
        )
      message: "Images must come from approved registries"
```

The `startsWith()` function checks image registry prefixes. Multiple approved registries combine with logical OR (`||`).

## Using Parameters for Configurable Policies

Create reusable policies with parameters:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: max-replicas
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  paramKind:
    apiVersion: v1
    kind: ConfigMap
  validations:
    - expression: |
        !has(params.data.maxReplicas) ||
        object.spec.replicas <= int(params.data.maxReplicas)
      message: "Replica count exceeds maximum allowed"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: replica-limits
  namespace: default
data:
  maxReplicas: "10"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: max-replicas-binding
spec:
  policyName: max-replicas
  validationActions: [Deny]
  paramRef:
    name: replica-limits
    namespace: default
```

The policy references parameters from a ConfigMap. The binding specifies which ConfigMap to use, enabling different limits for different environments without rewriting the policy.

## Checking Multiple Fields with Complex Logic

Implement conditional logic based on multiple field values:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: production-requirements
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: |
        !has(object.metadata.labels.environment) ||
        object.metadata.labels.environment != 'production' ||
        (
          object.spec.containers.all(c,
            has(c.resources) &&
            has(c.resources.limits) &&
            has(c.securityContext) &&
            c.securityContext.runAsNonRoot == true
          ) &&
          has(object.spec.securityContext) &&
          has(object.spec.securityContext.seccompProfile)
        )
      message: |
        Production pods must have resource limits, run as non-root,
        and define seccomp profiles
```

This policy only enforces strict requirements when the environment label is production, allowing more flexibility in development.

## Audit Mode for Testing

Deploy policies in audit mode before enforcement:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-labels-audit
spec:
  policyName: require-labels
  validationActions: [Audit]  # Log violations without blocking
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production
```

Audit mode logs violations in the API server audit log without rejecting requests, letting you identify issues before enforcing policies.

## Validating Service Configuration

Apply policies to services and other resources:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-service-labels
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["services"]
  validations:
    - expression: |
        has(object.metadata.labels) &&
        has(object.metadata.labels.app) &&
        object.spec.selector.app == object.metadata.labels.app
      message: "Service app label must match selector"
```

This ensures service labels align with selectors, preventing misconfigurations.

## Checking Namespace Restrictions

Prevent resources in specific namespaces from violating rules:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: production-restrictions
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
    namespaceSelector:
      matchExpressions:
        - key: environment
          operator: In
          values: ["production"]
  validations:
    - expression: "!object.spec.hostNetwork"
      message: "hostNetwork is not allowed in production"
    - expression: "!object.spec.hostPID"
      message: "hostPID is not allowed in production"
    - expression: "!object.spec.hostIPC"
      message: "hostIPC is not allowed in production"
```

The namespace selector in matchConstraints limits policy scope to production namespaces.

## Testing Policies

Test policies against sample resources:

```bash
# Create a test pod that should fail
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-no-labels
spec:
  containers:
    - name: nginx
      image: nginx:1.21
EOF

# Check the error message
# Should see: "Pod must have a 'team' label"

# Create a compliant pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-with-labels
  labels:
    team: platform
    environment: dev
spec:
  containers:
    - name: nginx
      image: nginx:1.21
EOF
```

Validate that policies block non-compliant resources and allow compliant ones.

## Monitoring Policy Impact

Check API server metrics for policy evaluation:

```bash
# View metrics from the API server
kubectl get --raw /metrics | grep validating_admission_policy

# Check audit logs for policy decisions
kubectl logs -n kube-system kube-apiserver-<node> | grep ValidatingAdmissionPolicy
```

Monitor policy evaluation time to ensure CEL expressions perform well at scale.

## Conclusion

ValidatingAdmissionPolicy with CEL provides native, performant policy enforcement in Kubernetes. CEL expressions evaluate in-process, reducing latency compared to external webhooks. Start with simple validation rules for labels and security contexts, then build more complex logic using CEL functions. Use parameter ConfigMaps to make policies reusable across environments, and deploy in audit mode before enforcement. Test policies thoroughly and monitor their impact on API server performance.

CEL-based policies offer the best performance and reliability for admission control, especially at scale where external webhook latency becomes problematic.
