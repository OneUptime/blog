# How to Set Up Kyverno Mutating Policies to Inject Security Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Kyverno

Description: Learn how to use Kyverno mutating policies to automatically inject security defaults into Kubernetes resources, ensuring consistent security configurations across all workloads.

---

Manually configuring security contexts for every pod in a Kubernetes cluster is error-prone and inconsistent. Kyverno mutating policies automatically modify resources as they're created, injecting security best practices like non-root users, dropped capabilities, and read-only filesystems without requiring developers to specify them explicitly.

This guide demonstrates how to implement Kyverno mutating policies that enforce security defaults automatically.

## Understanding Kyverno Mutation

Kyverno is a policy engine designed for Kubernetes that operates as an admission controller. Mutating policies intercept resource creation requests and modify them before they're stored in etcd. This enables you to:

- Add missing security context settings
- Inject sidecar containers
- Set resource limits and requests
- Add labels and annotations
- Configure network policies

## Prerequisites

Ensure you have:

- Kubernetes cluster (1.24+)
- kubectl with cluster admin access
- Helm 3.x for Kyverno installation

## Installing Kyverno

Install Kyverno using Helm:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace \
  --set admissionController.replicas=3 \
  --set backgroundController.replicas=2 \
  --set cleanupController.replicas=2 \
  --set reportsController.replicas=2
```

Verify installation:

```bash
kubectl get pods -n kyverno
kubectl get clusterpolicies
```

## Basic Security Context Injection

Create a policy that adds security contexts to pods:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-security-context
spec:
  background: true
  rules:
  - name: add-securitycontext-to-pods
    match:
      any:
      - resources:
          kinds:
          - Pod
    mutate:
      patchStrategicMerge:
        spec:
          securityContext:
            +(runAsNonRoot): true
            +(runAsUser): 1000
            +(fsGroup): 3000
            +(seccompProfile):
              type: RuntimeDefault
          containers:
          - (name): "*"
            securityContext:
              +(allowPrivilegeEscalation): false
              +(capabilities):
                drop:
                - ALL
              +(readOnlyRootFilesystem): true
```

This policy automatically adds security settings to any pod that doesn't already have them.

Test the mutation:

```bash
# Create a pod without security context

kubectl run test --image=busybox:1.36 --restart=Never -- sleep 3600

# Check the created pod - security context should be automatically added
kubectl get pod test -o yaml | grep -A 20 securityContext
```

## Conditional Mutations

Apply mutations based on conditions:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-security-production
spec:
  background: true
  rules:
  - name: add-security-to-production
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - production*
    mutate:
      patchStrategicMerge:
        spec:
          securityContext:
            +(runAsNonRoot): true
            +(runAsUser): 1000
          containers:
          - (name): "*"
            securityContext:
              +(allowPrivilegeEscalation): false
              +(readOnlyRootFilesystem): true
              +(capabilities):
                drop:
                - ALL
```

Different namespaces get different security levels automatically.

## Adding Resource Limits

Inject default resource limits:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-resource-limits
spec:
  background: true
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
    mutate:
      patchStrategicMerge:
        spec:
          containers:
          - (name): "*"
            resources:
              requests:
                +(memory): "128Mi"
                +(cpu): "100m"
              limits:
                +(memory): "512Mi"
                +(cpu): "500m"
```

## Injecting Sidecar Containers

Automatically add sidecar containers for monitoring or security:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-security-sidecar
spec:
  background: false
  rules:
  - name: inject-sidecar
    match:
      any:
      - resources:
          kinds:
          - Deployment
          selector:
            matchLabels:
              security-scanning: "enabled"
    mutate:
      patchStrategicMerge:
        spec:
          template:
            spec:
              containers:
              - name: security-scanner
                image: aquasec/trivy:latest
                args:
                - server
                - --listen
                - 0.0.0.0:4954
                volumeMounts:
                - name: scan-results
                  mountPath: /results
              volumes:
              - name: scan-results
                emptyDir: {}
```

## Testing Mutations

Verify mutations before enforcement:

```bash
# Create test deployment
kubectl create deployment test-mutation --image=busybox:1.36 -- sleep 3600

# Check if mutations were applied to the Pods created by the Deployment
kubectl get pod -l app=test-mutation -o yaml | grep -A 30 securityContext
```

## Monitoring Mutation Activity

Track Kyverno mutations:

```bash
# View Kyverno logs
kubectl logs -n kyverno -l app.kubernetes.io/name=kyverno

# Check policy reports
kubectl get policyreports -A
```

## Conclusion

Kyverno mutating policies provide an automated, consistent way to inject security defaults into Kubernetes resources. By implementing mutation policies that add security contexts, resource limits, and required sidecars, you ensure that all workloads meet minimum security standards without manual intervention.

Start with basic security context injection, gradually add more sophisticated mutations, and use namespace-based exclusions for workloads that need different configurations. Monitor mutation activity with OneUptime to track policy effectiveness and ensure consistent security across your cluster.
