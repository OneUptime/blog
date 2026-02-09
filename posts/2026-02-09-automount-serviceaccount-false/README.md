# How to Configure ServiceAccount automountServiceAccountToken False

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, ServiceAccounts

Description: Learn how to disable automatic ServiceAccount token mounting in Kubernetes using automountServiceAccountToken false for improved security on workloads that don't need API access.

---

By default, Kubernetes automatically mounts ServiceAccount tokens into every pod. While convenient, this creates unnecessary security risks for workloads that don't need API access. Configuring automountServiceAccountToken to false eliminates this attack surface and follows security best practices.

## Understanding Automatic Token Mounting

When Kubernetes creates a pod, it automatically injects the ServiceAccount token into the container filesystem at `/var/run/secrets/kubernetes.io/serviceaccount/token`. This happens whether the application needs it or not.

For pods that interact with the Kubernetes API, this is necessary and convenient. But most application workloads don't need API access. They serve web traffic, process data, or perform computations without ever talking to the API server.

Mounting tokens unnecessarily increases risk. If an attacker compromises a container, they gain the ServiceAccount token. Even with minimal RBAC permissions, this token provides an identity within the cluster that can be abused. The principle of least privilege says we shouldn't provide credentials unless they're needed.

## Disabling Token Mounting at the ServiceAccount Level

The cleanest approach is disabling automatic mounting on the ServiceAccount itself:

```yaml
# no-token-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-without-api-access
  namespace: production
automountServiceAccountToken: false
```

Any pod using this ServiceAccount won't receive an automatic token mount:

```yaml
# pod-using-no-token-sa.yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  namespace: production
spec:
  serviceAccountName: app-without-api-access
  containers:
  - name: nginx
    image: nginx:latest
```

Apply and verify:

```bash
kubectl apply -f no-token-serviceaccount.yaml
kubectl apply -f pod-using-no-token-sa.yaml

# Verify no token is mounted
kubectl exec web-server -n production -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/
# Should show: No such file or directory
```

This approach works well when you have a dedicated ServiceAccount for workloads that never need API access.

## Disabling Token Mounting at the Pod Level

You can also disable token mounting for specific pods while keeping the ServiceAccount's default behavior:

```yaml
# pod-no-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-worker
  namespace: production
spec:
  serviceAccountName: default
  automountServiceAccountToken: false
  containers:
  - name: worker
    image: worker:latest
```

This pod uses the default ServiceAccount but doesn't receive a token. This is useful when most pods using a ServiceAccount need tokens, but specific pods don't.

Pod-level settings override ServiceAccount-level settings, giving you fine-grained control:

```yaml
# override-example.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flexible-sa
  namespace: production
automountServiceAccountToken: true  # Default is to mount
---
apiVersion: v1
kind: Pod
metadata:
  name: no-api-pod
spec:
  serviceAccountName: flexible-sa
  automountServiceAccountToken: false  # This pod opts out
  containers:
  - name: app
    image: app:latest
---
apiVersion: v1
kind: Pod
metadata:
  name: api-pod
spec:
  serviceAccountName: flexible-sa
  # automountServiceAccountToken not specified, inherits from SA (true)
  containers:
  - name: app
    image: app:latest
```

The first pod gets no token, the second pod gets a token, both using the same ServiceAccount.

## Deployment Configuration

In production, you typically use Deployments rather than bare pods:

```yaml
# deployment-no-token.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: web-app-sa
      automountServiceAccountToken: false
      containers:
      - name: app
        image: web-app:latest
        ports:
        - containerPort: 8080
```

This configuration applies to all pods created by the Deployment, ensuring consistent security across replicas.

## StatefulSet Configuration

StatefulSets follow the same pattern:

```yaml
# statefulset-no-token.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      serviceAccountName: database-sa
      automountServiceAccountToken: false
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
```

Databases rarely need Kubernetes API access, making this a natural fit.

## When You Should Disable Token Mounting

Disable automatic token mounting for these workload types:

Web servers serving static or dynamic content without needing cluster information. Databases and data stores that don't integrate with Kubernetes. Batch processing jobs that process external data. Proxies and load balancers that forward traffic. Any application that doesn't use a Kubernetes client library.

Check your application code. If you don't see imports for Kubernetes client libraries and no code making API requests, you don't need a token.

## When You Need Token Mounting

Keep automatic token mounting enabled for these scenarios:

Applications that use the Kubernetes API to discover services. Controllers and operators that manage Kubernetes resources. Monitoring tools that collect cluster metrics. Sidecar containers that perform service mesh functions. Init containers that configure resources based on cluster state.

When in doubt, start with token mounting disabled. If the application fails with authentication errors, you know it needs the token.

## Security Implications

Disabling token mounting reduces the attack surface significantly. Without a token, compromised containers can't authenticate to the API server. This prevents:

Reconnaissance attacks where attackers enumerate cluster resources. Privilege escalation through RBAC misconfigurations. Lateral movement using ServiceAccount credentials. Token exfiltration for persistent access.

Even with minimal RBAC permissions, tokens provide a foothold. Eliminating unnecessary tokens is a fundamental security practice.

## Implementing with Pod Security Standards

Pod Security Standards can enforce token mounting policies:

```yaml
# namespace-with-pss.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

The restricted Pod Security Standard encourages (but doesn't require) disabling automatic token mounting. Pair this with policy enforcement for comprehensive security.

## Using OPA Gatekeeper for Enforcement

Enforce token mounting policies across the cluster with OPA Gatekeeper:

```yaml
# gatekeeper-constraint-template.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequireautomountfalse
spec:
  crd:
    spec:
      names:
        kind: K8sRequireAutomountFalse
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireautomountfalse

        violation[{"msg": msg}] {
          # Check if automountServiceAccountToken is not explicitly set to false
          not input.review.object.spec.automountServiceAccountToken == false
          msg := "Pods must set automountServiceAccountToken to false unless explicitly required"
        }
---
# constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireAutomountFalse
metadata:
  name: require-automount-false
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
```

This policy blocks pods that don't explicitly disable token mounting in the production namespace.

## Troubleshooting Common Issues

If applications fail after disabling token mounting, check for these issues:

```bash
# Application logs might show authentication errors
kubectl logs pod-name -n production

# Common error messages:
# - "Unable to authenticate with Kubernetes API"
# - "No ServiceAccount token found"
# - "Failed to load in-cluster config"
```

If you see these errors, the application needs API access. Either enable token mounting or refactor the application to not require it.

Verify whether a token is actually mounted:

```bash
# Check if token exists
kubectl exec pod-name -n production -- test -f /var/run/secrets/kubernetes.io/serviceaccount/token && echo "Token exists" || echo "No token"

# Check the pod spec
kubectl get pod pod-name -n production -o jsonpath='{.spec.automountServiceAccountToken}'
```

## Migration Strategy

Migrate existing workloads gradually:

1. Identify pods that don't need API access through code review and log analysis
2. Create new ServiceAccounts with automountServiceAccountToken false
3. Update deployments to use the new ServiceAccounts
4. Monitor for authentication errors
5. Roll back if needed, investigate why tokens are needed

Start with non-critical workloads to gain confidence in the approach.

## Best Practices

Create separate ServiceAccounts for different security profiles. Use ServiceAccounts with automountServiceAccountToken false as the default. Explicitly enable token mounting only for workloads that need it. Document why token mounting is enabled when you do enable it. Audit your cluster regularly to identify pods with unnecessary tokens.

This inverts the default security model - tokens are opt-in rather than opt-out.

## Verification Script

Use this script to audit your cluster:

```bash
#!/bin/bash
# audit-token-mounting.sh

echo "Pods with automatic token mounting:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.automountServiceAccountToken != false) |
    "\(.metadata.namespace)/\(.metadata.name)"'

echo ""
echo "ServiceAccounts with automatic token mounting:"
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] |
    select(.automountServiceAccountToken != false) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

This identifies candidates for security improvements.

## Conclusion

Disabling automatic ServiceAccount token mounting is a simple but effective security measure. By setting automountServiceAccountToken to false on ServiceAccounts and pods that don't need API access, you reduce your attack surface and follow the principle of least privilege. Most application workloads don't need tokens - they just need to run their business logic. Make token mounting an explicit choice rather than an automatic default, and your cluster security posture improves significantly.
