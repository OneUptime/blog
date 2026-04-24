# How to Configure Kubernetes Cluster Policies in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Policies, Resource Management, DevOps

Description: Learn how to configure Kubernetes cluster policies in Portainer including resource quotas, limit ranges, and deployment restrictions.

## Introduction

Portainer provides cluster-level setup and security controls for Kubernetes environments, and it can work alongside Kubernetes-native policy objects such as `ResourceQuota`, `LimitRange`, `NetworkPolicy`, and Gatekeeper constraints. This guide covers the available Portainer settings and how to configure the related Kubernetes policies.

## Prerequisites

- Portainer BE with a Kubernetes environment
- Portainer administrator access to the environment
- Cluster-admin access if you will install Gatekeeper or apply cluster-scoped resources

## Step 1: Access Cluster Policy Settings

1. Select your Kubernetes environment in Portainer
2. For environment-specific controls, expand **Cluster** and open **Setup** or **Security constraints**
3. If the environment is managed by a Portainer policy, view it under **Cluster → Policies** and edit it as an admin under **Environment-related → Policies**

## Step 2: Configure Deployment Restrictions

Portainer BE allows restricting how users deploy applications. Deployment restrictions are configured under **Cluster → Setup**:

```text
Deployment options:
  [ ] Enforce code-based deployment              - Hide form-based deployment and editing
  [x] Allow web editor and custom template use   - Allow raw YAML and custom templates
  [x] Allow specifying of a manifest via a URL   - Allow manifest deployment from a URL
```

To block privileged containers, enable **Restrict running privileged containers** under **Cluster → Security constraints**.

## Step 3: Configure Namespace Resource Quotas

Portainer can manage CPU and memory resource assignment per namespace, or you can apply a standard `ResourceQuota` manifest:

```yaml
# Apply a ResourceQuota to a namespace

apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: new-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 4Gi
    limits.cpu: "8"
    limits.memory: 8Gi
    pods: "20"
    services: "10"
    persistentvolumeclaims: "10"
    secrets: "20"
    configmaps: "20"
```

## Step 4: Configure LimitRanges

LimitRanges enforce per-container resource constraints:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    # Default limits for containers without specified limits
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi

    # Limits for pods
    - type: Pod
      max:
        cpu: "8"
        memory: 8Gi
```

## Step 5: Configure Pod Disruption Budgets

Ensure high availability during updates and maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
  namespace: production
spec:
  minAvailable: 2    # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: web-frontend
```

Or using maxUnavailable:

```yaml
spec:
  maxUnavailable: 1   # Allow at most 1 pod to be unavailable
  selector:
    matchLabels:
      app: api
```

## Step 6: Configure Network Policies

If your CNI supports `NetworkPolicy`, apply network policies to each namespace where you want these defaults enforced:

```yaml
# Apply per namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow egress on DNS ports
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Step 7: Enforce Resource Policies with OPA/Gatekeeper

For custom policy enforcement beyond Portainer's built-in security constraints, deploy OPA Gatekeeper and install the required `ConstraintTemplate`:

```bash
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.22.1/deploy/gatekeeper.yaml

# Install the ConstraintTemplate used below
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/containerresources/template.yaml
```

Example constraint to require CPU and memory requests and limits on all Pod containers:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - kube-public
  parameters:
    limits:
      - cpu
      - memory
    requests:
      - cpu
      - memory
```

## Step 8: Portainer BE Cluster Setup Options

Configure these under **Cluster → Setup** or through a Kubernetes setup/security policy:

Resource Over-commit

```text
Allow resource over-commit:  [ ] disabled
# When disabled: Portainer won't let namespace allocations exceed cluster capacity
# Helps reduce over-allocation across namespaces
```

### Default Namespace Isolation

```text
Restrict access to the default namespace: [x] enabled
# Limits use of the `default` namespace to admins and explicitly granted users
# Helps keep workloads in dedicated namespaces
```

## Step 9: Monitor Policy Compliance

```bash
# Check for pods without resource limits
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(any(.spec.containers[]?; (.resources.limits | type) == "null")) |
  "\(.metadata.namespace)/\(.metadata.name)"'

# Check for pods not enforcing `runAsNonRoot`
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | . as $pod |
  select(any($pod.spec.containers[]?;
    ((.securityContext.runAsNonRoot // $pod.spec.securityContext.runAsNonRoot // false) != true))) |
  "\($pod.metadata.namespace)/\($pod.metadata.name)"'
```

## Conclusion

Kubernetes cluster policies in Portainer help administrators maintain consistency and safety across deployments. Start with resource quotas and limit ranges to prevent resource exhaustion, add Pod Disruption Budgets for availability guarantees, and use OPA Gatekeeper for complex policy requirements. Portainer BE's cluster settings complement these Kubernetes-native policies with UI-level controls.
