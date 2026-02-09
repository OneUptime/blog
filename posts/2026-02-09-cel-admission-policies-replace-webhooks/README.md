# How to Use CEL Admission Policies as a Replacement for Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CEL, Admission Control

Description: Learn how to use CEL-based ValidatingAdmissionPolicy to replace complex admission webhooks with declarative policies that run natively in the API server without external services.

---

Admission webhooks have long been the go-to solution for implementing custom validation and mutation logic in Kubernetes. But they come with operational overhead: you need to deploy webhook servers, manage TLS certificates, and handle availability concerns. CEL-based admission policies offer a simpler alternative that runs directly in the API server.

## The Traditional Webhook Approach

Traditionally, to enforce custom policies across multiple resource types, you would write an admission webhook:

1. Deploy a webhook server in your cluster
2. Configure TLS certificates
3. Create a ValidatingWebhookConfiguration
4. Handle availability and performance concerns
5. Maintain the webhook codebase

This approach works but adds complexity to your cluster infrastructure.

## Enter ValidatingAdmissionPolicy

Kubernetes 1.26 introduced ValidatingAdmissionPolicy (beta in 1.28+), which allows you to write admission policies using Common Expression Language (CEL) directly in policy objects. No webhook server required.

The basic structure consists of two resources:

- **ValidatingAdmissionPolicy**: Defines the validation logic
- **ValidatingAdmissionPolicyBinding**: Determines which resources the policy applies to

## Your First CEL Admission Policy

Let's create a policy that ensures all Deployments have resource limits:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  # What operations trigger this policy
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments"]
  # The validation logic in CEL
  validations:
  - expression: "object.spec.template.spec.containers.all(c, has(c.resources) && has(c.resources.limits))"
    message: "All containers must define resource limits"
  - expression: "object.spec.template.spec.containers.all(c, has(c.resources.limits.memory) && has(c.resources.limits.cpu))"
    message: "All containers must specify both CPU and memory limits"
```

Now create a binding to activate the policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-resource-limits-binding
spec:
  policyName: require-resource-limits
  # Apply to all namespaces except kube-system
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: kubernetes.io/metadata.name
        operator: NotIn
        values: ["kube-system"]
```

Apply these resources:

```bash
kubectl apply -f admission-policy.yaml
kubectl apply -f admission-policy-binding.yaml
```

Now try creating a Deployment without resource limits:

```bash
kubectl create deployment nginx --image=nginx

# Error from server (Forbidden): deployments.apps "nginx" is denied by ValidatingAdmissionPolicy 'require-resource-limits':
# All containers must define resource limits
```

The policy blocked the creation because containers lack resource limits.

## Accessing Request Context

CEL admission policies have access to several variables:

- `object`: The object being created or updated
- `oldObject`: The existing object (for UPDATE operations)
- `request`: Information about the admission request
- `params`: Optional parameters passed via policy binding

Here is an example using request context:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: enforce-user-annotations
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["configmaps"]
  validations:
  # Require that ConfigMaps include who created them
  - expression: "has(object.metadata.annotations) && 'created-by' in object.metadata.annotations"
    message: "ConfigMaps must have a 'created-by' annotation"
  # Reject if user is trying to impersonate another creator
  - expression: "!has(object.metadata.annotations) || object.metadata.annotations['created-by'] == request.userInfo.username"
    message: "You can only set created-by to your own username"
  - expression: "request.operation == 'UPDATE' || has(object.metadata.labels)"
    message: "New ConfigMaps must include labels"
```

## Transition Rules with oldObject

You can enforce constraints during updates by comparing `object` and `oldObject`:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: immutable-labels
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["UPDATE"]
      resources: ["deployments"]
  validations:
  # Prevent changes to the app label after creation
  - expression: |
      !has(oldObject.metadata.labels.app) ||
      !has(object.metadata.labels.app) ||
      oldObject.metadata.labels.app == object.metadata.labels.app
    message: "The 'app' label cannot be changed after creation"
  # Prevent downscaling in production
  - expression: |
      !has(oldObject.metadata.labels.environment) ||
      oldObject.metadata.labels.environment != 'production' ||
      object.spec.replicas >= oldObject.spec.replicas
    message: "Cannot reduce replicas in production deployments"
```

## Using Parameters for Configurable Policies

Parameters allow you to create reusable policies with different configurations. First, define a parameter resource:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: admission-policy-params
  namespace: default
data:
  maxReplicas: "10"
  allowedRegistries: "docker.io,gcr.io,quay.io"
```

Reference it in your policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: registry-and-replica-limits
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
  - expression: "object.spec.replicas <= int(params.data.maxReplicas)"
    message: "Deployment replicas exceed maximum allowed"
  - expression: |
      object.spec.template.spec.containers.all(c,
        params.data.allowedRegistries.split(',').exists(r, c.image.startsWith(r + '/'))
      )
    message: "Container images must come from allowed registries"
```

Bind the policy with parameters:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: registry-and-replica-limits-binding
spec:
  policyName: registry-and-replica-limits
  paramRef:
    name: admission-policy-params
    namespace: default
  matchResources:
    namespaceSelector:
      matchLabels:
        enforce-policies: "true"
```

## Advanced Pattern: Environment-Based Policies

Create different enforcement levels for different environments:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: production-safety-checks
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments", "statefulsets"]
  validations:
  # Production workloads must have multiple replicas
  - expression: |
      !has(object.metadata.labels.environment) ||
      object.metadata.labels.environment != 'production' ||
      object.spec.replicas >= 2
    message: "Production workloads must have at least 2 replicas for HA"

  # Production workloads must define pod disruption budgets
  - expression: |
      !has(object.metadata.labels.environment) ||
      object.metadata.labels.environment != 'production' ||
      has(object.metadata.annotations['pdb-configured'])
    message: "Production workloads must have a PodDisruptionBudget (annotate with pdb-configured=true)"

  # Production images must use specific tags, not 'latest'
  - expression: |
      !has(object.metadata.labels.environment) ||
      object.metadata.labels.environment != 'production' ||
      object.spec.template.spec.containers.all(c, !c.image.endsWith(':latest'))
    message: "Production containers cannot use 'latest' tag"
```

## Replacing Existing Webhooks

Here is a comparison of a webhook approach versus CEL admission policy for enforcing namespace labels:

**Old webhook approach (requires running server):**

```go
// webhook-server.go
func validateNamespace(ar v1.AdmissionReview) *v1.AdmissionResponse {
    ns := &corev1.Namespace{}
    if err := json.Unmarshal(ar.Request.Object.Raw, ns); err != nil {
        return &v1.AdmissionResponse{Result: &metav1.Status{Message: err.Error()}}
    }

    if ns.Labels["team"] == "" {
        return &v1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{Message: "Namespaces must have a 'team' label"},
        }
    }

    return &v1.AdmissionResponse{Allowed: true}
}
```

**New CEL admission policy (declarative):**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-namespace-team-label
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE"]
      resources: ["namespaces"]
  validations:
  - expression: "has(object.metadata.labels.team) && object.metadata.labels.team != ''"
    message: "Namespaces must have a non-empty 'team' label"
```

The CEL approach is dramatically simpler: no code to maintain, no deployment to manage, no certificates to rotate.

## Monitoring Policy Decisions

Check policy enforcement using audit logs:

```bash
# View policy decisions in API server audit logs
kubectl logs -n kube-system kube-apiserver-xxx | grep ValidatingAdmissionPolicy

# Check policy status
kubectl get validatingadmissionpolicy
kubectl describe validatingadmissionpolicy require-resource-limits
```

## Limitations and When to Still Use Webhooks

CEL admission policies cannot:

- Mutate objects (use MutatingAdmissionWebhook for this)
- Make external API calls
- Access data from other Kubernetes resources (beyond params)
- Perform complex computations

Use webhooks when you need:

- Mutation logic (adding sidecars, injecting volumes)
- External validation (checking against external databases)
- Complex business logic that CEL cannot express
- Cross-resource validation

## Best Practices

1. **Start simple**: Begin with basic policies and add complexity incrementally

2. **Test thoroughly**: Create test resources that should pass and fail validation

3. **Use descriptive messages**: Help users understand why their request was denied

4. **Scope policies carefully**: Use namespace selectors to avoid blocking critical system resources

5. **Set appropriate failurePolicy**: Use `Fail` for critical policies, `Ignore` for advisory ones

6. **Monitor performance**: CEL expressions run on every matching request, so keep them efficient

## Migrating from Webhooks

To migrate from webhooks to CEL policies:

1. Identify webhook validation logic that can be expressed in CEL
2. Create corresponding ValidatingAdmissionPolicy resources
3. Deploy policies with `failurePolicy: Ignore` initially
4. Monitor and test thoroughly
5. Switch to `failurePolicy: Fail` once confident
6. Remove the webhook configuration

## Conclusion

CEL-based admission policies represent a significant simplification in Kubernetes policy enforcement. By moving validation logic into declarative policy objects that run natively in the API server, you eliminate the operational overhead of webhook servers while maintaining powerful validation capabilities. For many use cases, CEL admission policies can completely replace custom webhooks, reducing complexity and improving reliability. Evaluate your current webhook implementations and consider migrating to this more streamlined approach where applicable.
