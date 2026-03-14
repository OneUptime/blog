# How to Choose the Right Calico API Server Configuration for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, API Server, Production, Architecture, Kubernetes

Description: Evaluate Calico API server deployment options and choose the right configuration for production workloads based on availability, security, and operational requirements.

---

## Introduction

The Calico API server exposes Calico resources as native Kubernetes API extensions, allowing you to manage NetworkPolicy, BGPPeer, IPPool, and other Calico resources using standard `kubectl` commands. Choosing the right configuration for production requires balancing high availability, RBAC security, and resource overhead.

Many teams deploy the Calico API server with default settings that work for development but are insufficient for production. The default configuration may run a single replica, use permissive RBAC, and lack resource limits — all of which must be addressed before the API server handles production traffic.

This post walks through the decision points for a production Calico API server deployment, covering replica count, RBAC configuration, and TLS settings.

## Prerequisites

- Kubernetes cluster with Calico installed via the Tigera operator
- `kubectl` with cluster-admin access
- `calicoctl` CLI configured
- Understanding of Kubernetes RBAC

## Step 1: Evaluate the Default API Server Deployment

Start by understanding what the Tigera operator deploys by default and identify gaps for production.

```bash
# Check the current Calico API server deployment
kubectl get deployment calico-apiserver -n calico-apiserver

# Review replica count and resource limits
kubectl describe deployment calico-apiserver -n calico-apiserver

# Check current RBAC configuration
kubectl get clusterroles | grep calico
kubectl get clusterrolebindings | grep calico
```

## Step 2: Configure High Availability with Multiple Replicas

For production, run at least two API server replicas to survive node failures.

```yaml
# calico-apiserver-ha.yaml
# Patch the APIServer resource to enable HA configuration
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec:
  # Set resource limits appropriate for production load
  apiServerDeployment:
    spec:
      replicas: 2
      template:
        spec:
          containers:
            - name: calico-apiserver
              resources:
                requests:
                  cpu: "100m"
                  memory: "128Mi"
                limits:
                  cpu: "500m"
                  memory: "512Mi"
```

Apply the configuration using kubectl.

```bash
# Apply the HA configuration
kubectl apply -f calico-apiserver-ha.yaml

# Verify both replicas are running and ready
kubectl get pods -n calico-apiserver -w
```

## Step 3: Configure Production RBAC

Restrict API server access to only the roles that need it, following least-privilege principles.

```yaml
# calico-readonly-role.yaml
# Creates a read-only ClusterRole for Calico network resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-network-readonly
rules:
  - apiGroups: ["projectcalico.org"]
    resources:
      - networkpolicies
      - globalnetworkpolicies
      - ippools
      - bgppeers
    verbs: ["get", "list", "watch"]
---
# Bind the read-only role to network operators
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-network-readonly-binding
subjects:
  - kind: Group
    name: network-operators
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: calico-network-readonly
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Apply the RBAC configuration
kubectl apply -f calico-readonly-role.yaml

# Verify the API server is healthy after RBAC changes
kubectl get tigerastatus apiserver
```

## Step 4: Validate the Production API Server

Run a comprehensive validation to confirm the API server is ready for production traffic.

```bash
# Verify the API server is registered as an API extension
kubectl api-resources | grep projectcalico.org

# Test creating and reading a Calico resource through the API server
calicoctl get networkpolicies --all-namespaces

# Check API server audit logs are enabled
kubectl logs -n calico-apiserver \
  -l app=calico-apiserver --tail=50

# Confirm TigeraStatus shows API server as Available
kubectl get tigerastatus apiserver -o jsonpath='{.status.conditions}' | jq .
```

## Best Practices

- Run at least 2 API server replicas in production with pod anti-affinity rules
- Set CPU and memory requests/limits based on your cluster's policy object count
- Use dedicated RBAC roles that grant only the verbs each team needs
- Enable Kubernetes audit logging to capture all Calico API server interactions
- Monitor API server latency and error rates with OneUptime synthetic checks

## Conclusion

Choosing the right Calico API server configuration for production means going beyond default settings to ensure high availability, proper resource limits, and least-privilege RBAC. By running multiple replicas, setting appropriate resource bounds, and restricting access through RBAC, you get a production-grade Calico API server that is both resilient and auditable.
