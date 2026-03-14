# How to Secure Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Security, Hard Way

Description: A guide to securing a Typha HA deployment including NetworkPolicy for Typha communication, RBAC for the autoscaler, and PodSecurityContext for Typha pods.

---

## Introduction

Securing a Typha HA deployment adds security controls specific to the multi-replica setup: NetworkPolicy to restrict Felix-to-Typha communication to the known pod IP ranges, RBAC restrictions for the autoscaling service account, and ensuring that Typha pods run with a restrictive security context. The goal is to maintain the security properties of a single-replica Typha while extending them to the HA configuration.

## Step 1: NetworkPolicy for Typha Pods

Restrict inbound connections to Typha to only Felix agents and the Prometheus scraper.

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: calico-typha-ha-netpol
  namespace: calico-system
spec:
  podSelector:
    matchLabels:
      k8s-app: calico-typha
  ingress:
  - from:
    - podSelector:
        matchLabels:
          k8s-app: calico-node
    ports:
    - port: 5473
      protocol: TCP
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: monitoring
    ports:
    - port: 9093
      protocol: TCP
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: calico-system
    ports:
    - port: 9098  # Health endpoint
      protocol: TCP
  policyTypes: [Ingress]
EOF
```

## Step 2: Restrict Autoscaler RBAC

The Typha autoscaler CronJob needs only the ability to list nodes and scale the Typha Deployment.

```bash
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: typha-autoscaler
rules:
- apiGroups: [""]
  resources: [nodes]
  verbs: [list]
- apiGroups: [apps]
  resources: [deployments]
  verbs: [get]
- apiGroups: [apps]
  resources: [deployments/scale]
  verbs: [patch, update]
EOF
```

Verify the role does not grant broader permissions.

```bash
kubectl auth can-i create pods --as=system:serviceaccount:calico-system:typha-autoscaler
# Should return: no
```

## Step 3: Pod Security Context for Typha Replicas

Apply a restrictive security context to all Typha pods.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "securityContext": {
          "runAsNonRoot": true,
          "runAsUser": 1000,
          "fsGroup": 1000,
          "seccompProfile": {
            "type": "RuntimeDefault"
          }
        },
        "containers": [{
          "name": "calico-typha",
          "securityContext": {
            "allowPrivilegeEscalation": false,
            "readOnlyRootFilesystem": true,
            "capabilities": {
              "drop": ["ALL"]
            }
          }
        }]
      }
    }
  }
}'
```

## Step 4: Audit Typha Pod-to-Pod Communication

In a multi-replica HA setup, Typha replicas do not need to communicate with each other (they are stateless). Verify no Typha-to-Typha traffic is occurring.

```bash
# Check if any Typha pod is connecting to another Typha pod
kubectl exec -n calico-system $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name | head -1) -- \
  ss -tnp | grep 5473
```

Typha-to-Typha connections indicate a misconfiguration.

## Step 5: Secrets Access Restriction

Each Typha replica needs access to the TLS Secret. Limit Secret access to only the Typha service account.

```bash
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: calico-typha-secret-access
  namespace: calico-system
rules:
- apiGroups: [""]
  resources: [secrets]
  resourceNames: [calico-typha-tls]
  verbs: [get]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: calico-typha-secret-access
  namespace: calico-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: calico-typha-secret-access
subjects:
- kind: ServiceAccount
  name: calico-typha
  namespace: calico-system
EOF
```

## Step 6: Verify PDB Is Not Bypassable

Verify that the PodDisruptionBudget is enforced during drain operations.

```bash
# This command should show the PDB would be violated if the node were drained
kubectl get pdb calico-typha-pdb -n calico-system

# Check if eviction is allowed
kubectl auth can-i create evictions --as=system:node:<node-name> -n calico-system
```

## Step 7: Review Security Context with kubectl-neat

```bash
kubectl get deployment calico-typha -n calico-system -o yaml | \
  grep -A20 "securityContext:"
```

Confirm all security context fields are set as expected.

## Conclusion

Securing a Typha HA deployment requires restricting inbound NetworkPolicy to only Felix and monitoring traffic, limiting the autoscaler RBAC to minimum necessary permissions, applying a non-root restrictive pod security context to all Typha replicas, auditing for unexpected Typha-to-Typha communication, and ensuring the PDB is enforced during maintenance. These controls maintain a strong security posture for the fan-out layer as it scales from one to multiple replicas.
