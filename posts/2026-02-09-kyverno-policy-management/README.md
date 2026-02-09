# How to Deploy Kyverno for Kubernetes Policy Management and Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kyverno, Kubernetes, Policy Management

Description: Deploy Kyverno for Kubernetes policy management using native YAML syntax, implementing validation, mutation, and generation policies without learning specialized policy languages.

---

Kyverno is a Kubernetes-native policy engine that uses standard YAML for policy definition, making it accessible without learning domain-specific languages like Rego. Kyverno supports validation, mutation, and generation policies, providing comprehensive policy management for Kubernetes clusters.

## Installing Kyverno

Install using kubectl:

```bash
kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.11.0/install.yaml
```

Or use Helm:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno --namespace kyverno --create-namespace
```

Verify installation:

```bash
kubectl get pods -n kyverno
kubectl get crd | grep kyverno
```

## Understanding Kyverno Policies

Kyverno uses three policy types:

- **Validation**: Accept or reject resources
- **Mutation**: Modify resources before creation
- **Generation**: Create related resources automatically

## Creating Validation Policies

Require labels on all pods:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-for-labels
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Pods must have 'app' and 'team' labels"
        pattern:
          metadata:
            labels:
              app: "?*"
              team: "?*"
```

Test the policy:

```bash
# Fails validation
kubectl run nginx --image=nginx

# Passes validation
kubectl run nginx --image=nginx --labels=app=nginx,team=platform
```

## Container Image Validation

Block unapproved container registries:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Images must come from approved registries"
        foreach:
          - list: "request.object.spec.containers[]"
            pattern:
              image: "gcr.io/* | myregistry.azurecr.io/*"
```

## Mutation Policies

Add default resource limits:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-resources
spec:
  rules:
    - name: add-default-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                resources:
                  limits:
                    +(memory): "512Mi"
                    +(cpu): "500m"
                  requests:
                    +(memory): "128Mi"
                    +(cpu): "100m"
```

The `+()` syntax adds fields only if they don't exist.

## Generation Policies

Automatically create network policies for new namespaces:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-network-policy
spec:
  rules:
    - name: default-deny-ingress
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-ingress
        namespace: "{{request.object.metadata.name}}"
        synchronize: true
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
```

## Enforce vs Audit Mode

Control policy enforcement:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: audit-required-labels
spec:
  validationFailureAction: Audit  # or Enforce
  rules:
    - name: check-labels
      match:
        any:
          - resources:
              kinds:
                - Deployment
      validate:
        message: "Deployments should have owner label"
        pattern:
          metadata:
            labels:
              owner: "?*"
```

Audit mode logs violations without blocking.

## Policy Exceptions

Exempt specific resources:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: allow-privileged-monitoring
  namespace: monitoring
spec:
  exceptions:
    - policyName: restrict-privileged
      ruleNames:
        - deny-privileged-containers
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - monitoring
          names:
            - node-exporter-*
```

## Viewing Policy Reports

Check policy compliance:

```bash
# View policy reports
kubectl get policyreport -A

# Get detailed report
kubectl describe policyreport -n default

# View cluster-wide report
kubectl get clusterpolicyreport -o yaml
```

Report shows violations:

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: polr-ns-default
  namespace: default
results:
  - policy: require-labels
    rule: check-for-labels
    resources:
      - kind: Pod
        name: nginx
        namespace: default
    result: fail
    message: "Pods must have 'app' and 'team' labels"
```

## Background Scanning

Kyverno scans existing resources automatically. View background scan results:

```bash
kubectl get clusterpolicyreport

kubectl describe clusterpolicyreport clusterpolicyreport
```

## Monitoring Policies

Check policy status:

```bash
kubectl get clusterpolicy

kubectl describe clusterpolicy require-labels
```

View Kyverno metrics:

```bash
kubectl port-forward -n kyverno svc/kyverno-svc-metrics 8000:8000

curl http://localhost:8000/metrics
```

Kyverno provides Kubernetes-native policy management using familiar YAML syntax, making policy creation accessible to all Kubernetes users without requiring specialized policy language expertise.
