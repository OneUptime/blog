# How to Configure Kubernetes Cluster Policies in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Cluster Policies, Security, Governance

Description: Learn how to configure Kubernetes cluster policies in Portainer to enforce resource quotas, deployment standards, and security constraints.

## What Are Cluster Policies?

Portainer supports Kubernetes setup policies and security policies for governance. Setup policies control cluster settings such as ingress, storage classes, and metrics-related options, while security policies can enforce pod security constraints using OPA Gatekeeper.

## Accessing Cluster Policies

1. Select your Kubernetes environment in Portainer.
2. Use **Cluster > Setup** for cluster configuration such as ingress, storage classes, and metrics settings.
3. Use **Cluster > Security constraints** for pod security restrictions such as privileged containers and `hostPath` usage.
4. Use **Cluster > Policies** to view policies that are already applied to the environment.
5. To create reusable policies, administrators use **Environment-related > Policies**.

## Available Policy Options

### Restrict Running Privileged Containers

When enabled, Portainer applies a security constraint that rejects pods using `privileged: true` in a container security context:

```yaml
# This spec would be blocked when the privileged container restriction is enabled

spec:
  containers:
    - name: app
      securityContext:
        privileged: true  # Rejected by the security constraint
```

### Restrict `hostPath` Volumes

In Kubernetes, host filesystem access is controlled through `hostPath` volumes rather than Docker-style bind mounts. Portainer lets you restrict allowed volume types and the host filesystem paths that can be used:

```yaml
# This volume can be blocked when `hostPath` volumes or paths are restricted
volumes:
  - name: host-path
    hostPath:
      path: /etc  # Can be rejected by the security constraint
```

### Restrict Host Networking Ports

Portainer's Kubernetes security constraints do not expose a simple `hostNetwork` allow/deny toggle. Instead, they let you define which host networking ports pods are allowed to use.

## Namespace-Level Resource Quotas

Namespace quotas are enforced by Kubernetes, not by a Portainer toggle. Apply a `ResourceQuota` in the target namespace to prevent resource exhaustion:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: my-namespace
spec:
  hard:
    # Limit total CPU and memory in the namespace
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    # Limit number of resources
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
```

```bash
# Apply the quota
kubectl apply -f resource-quota.yaml

# Check quota usage in a namespace
kubectl describe resourcequota -n my-namespace
```

## LimitRange for Default Pod Resources

Use Kubernetes `LimitRange` objects to set default resource requests and limits for containers in a namespace:

```yaml
# limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: my-namespace
spec:
  limits:
    - type: Container
      # Default limits applied if not specified by the user
      default:
        cpu: 200m
        memory: 256Mi
      # Default requests if not specified
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Hard caps per container
      max:
        cpu: "2"
        memory: 2Gi
```

```bash
kubectl apply -f limit-range.yaml
```

## Enforcing Policies via Portainer

In Portainer:
- Configure cluster settings under **Cluster > Setup** and pod security restrictions under **Cluster > Security constraints**.
- Administrators can create reusable **Kubernetes Setup** and **Kubernetes Security** policies under **Environment-related > Policies**.
- Reusable policies are a Portainer Business Edition feature and apply to Edge (Standard) Agent environments running Portainer 2.37.0 or later.
- Pod security constraints are enforced through OPA Gatekeeper, while `ResourceQuota` and `LimitRange` are enforced by the Kubernetes API server.

## Conclusion

Portainer setup and security policies provide a first layer of governance for Kubernetes workloads. Combine them with native Kubernetes constructs such as `ResourceQuota` and `LimitRange` for resource governance, and use Portainer's Gatekeeper-backed security constraints for pod-level enforcement.
