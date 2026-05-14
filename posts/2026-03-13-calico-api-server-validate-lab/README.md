# How to Validate the Calico API Server in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, API Server, CNI, Lab

Description: Step-by-step validation tests for the Calico API server in a lab cluster, confirming API registration, resource management, validation, and RBAC enforcement.

---

## Introduction

Validating the Calico API server requires confirming four things: the API server pods are running, the API group is registered with Kubernetes, resource operations work correctly through `kubectl`, and validation rules are enforced. Each of these is independently testable.

## Prerequisites

- A Calico lab cluster with the API server deployed (Enterprise, or Open Source with the deprecated aggregated API server installed)
- `kubectl` and `calicoctl` configured
- A test service account for RBAC validation
- The namespace where the API server is installed (`calico-system` for operator-managed installs, or `calico-apiserver` for manifest installs)

## Validation 1: API Server Pod Health

```bash
CALICO_APISERVER_NAMESPACE=calico-system
# For manifest-based installations, use: CALICO_APISERVER_NAMESPACE=calico-apiserver

kubectl get pods -n "$CALICO_APISERVER_NAMESPACE" -l k8s-app=calico-apiserver
# Expected: All pods in Running state

kubectl logs -n "$CALICO_APISERVER_NAMESPACE" -l k8s-app=calico-apiserver | tail -20
# Expected: No error messages; server startup logs visible

```

## Validation 2: API Service Registration

```bash
kubectl get apiservice v3.projectcalico.org
# Expected: Available=True

kubectl api-resources | grep projectcalico
# Expected: List of Calico resource types in the projectcalico.org API group
# networkpolicies, globalnetworkpolicies, ippools, bgpconfigurations, etc.
```

## Validation 3: kubectl Resource Operations

Test CRUD operations on Calico resources via `kubectl`:

```bash
# Create a GlobalNetworkPolicy via kubectl
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: api-server-test
spec:
  order: 999
  selector: test == 'true'
  ingress:
  - action: Pass
EOF

# Read the created resource
kubectl get globalnetworkpolicies.projectcalico.org api-server-test -o yaml
# Expected: Resource returned with full Calico v3 schema

# Compare with calicoctl output
calicoctl get globalnetworkpolicy api-server-test -o yaml
# Expected: Same resource, same content

# Update the resource
kubectl patch globalnetworkpolicies.projectcalico.org api-server-test \
  --type merge -p '{"spec":{"order":900}}'

# Verify update
kubectl get globalnetworkpolicies.projectcalico.org api-server-test \
  -o jsonpath='{.spec.order}'
# Expected: 900

# Delete the resource
kubectl delete globalnetworkpolicies.projectcalico.org api-server-test
```

## Validation 4: Input Validation

The Calico API server should reject invalid resources:

```bash
# Test: Invalid selector syntax (should be rejected)
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: invalid-policy
  namespace: default
spec:
  selector: "this is not valid selector syntax!!"
  ingress:
  - action: Allow
EOF
# Expected: Error from API server: invalid selector syntax
```

```bash
# Test: Invalid action value (should be rejected)
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: invalid-action-policy
  namespace: default
spec:
  selector: all()
  ingress:
  - action: PERMIT  # Should be Allow, Deny, Log, or Pass
EOF
# Expected: Error from API server: invalid action value
```

## Validation 5: RBAC Enforcement

Test that Kubernetes RBAC controls access to Calico resources via the API server:

```bash
# Create a read-only role for Calico resources
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-reader
rules:
- apiGroups: ["projectcalico.org"]
  resources: ["globalnetworkpolicies", "networkpolicies"]
  verbs: ["get", "list", "watch"]
EOF

# Create a service account and bind the role
kubectl create serviceaccount calico-reader
kubectl create clusterrolebinding calico-reader \
  --clusterrole=calico-reader \
  --serviceaccount=default:calico-reader

# Test read access works
kubectl auth can-i get globalnetworkpolicies.projectcalico.org \
  --as=system:serviceaccount:default:calico-reader
# Expected: yes

# Test write access is denied
kubectl auth can-i create globalnetworkpolicies.projectcalico.org \
  --as=system:serviceaccount:default:calico-reader
# Expected: no

# Clean up
kubectl delete clusterrolebinding calico-reader
kubectl delete clusterrole calico-reader
kubectl delete serviceaccount calico-reader
```

## Validation 6: API Server Failure Resilience

Verify that policy enforcement continues when the API server is unavailable:

```bash
# Deploy test pods and apply a policy
kubectl run test-server --image=nginx --labels=app=test-server
kubectl run test-client --image=nicolaka/netshoot --labels=app=test-client -- sleep 3600
kubectl wait --for=condition=Ready pod/test-server --timeout=120s
kubectl wait --for=condition=Ready pod/test-client --timeout=120s

kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: deny-test-server
  namespace: default
spec:
  selector: app == 'test-server'
  types:
  - Ingress
  ingress:
  - action: Deny
EOF

# Verify policy is enforced
kubectl exec test-client -- wget --timeout=5 -qO- http://$(kubectl get pod test-server -o jsonpath='{.status.podIP}')
# Expected: timeout (policy enforced)

# Scale API server to 0 (simulate failure)
CALICO_APISERVER_NAMESPACE=calico-system
# For manifest-based installations, use: CALICO_APISERVER_NAMESPACE=calico-apiserver
ORIGINAL_REPLICAS=$(kubectl get deployment calico-apiserver -n "$CALICO_APISERVER_NAMESPACE" -o jsonpath='{.spec.replicas}')
kubectl scale deployment calico-apiserver -n "$CALICO_APISERVER_NAMESPACE" --replicas=0

# Verify policy enforcement still works (Felix doesn't need API server for enforcement)
kubectl exec test-client -- wget --timeout=5 -qO- http://$(kubectl get pod test-server -o jsonpath='{.status.podIP}')
# Expected: timeout (enforcement still active - Felix doesn't use API server for enforcement)

# Restore API server
kubectl scale deployment calico-apiserver -n "$CALICO_APISERVER_NAMESPACE" --replicas="$ORIGINAL_REPLICAS"
```

## Validation Checklist

| Test | Expected |
|---|---|
| API server pods running | All Running |
| API service registered | Available=True |
| kubectl CRUD works | Resources managed successfully |
| Invalid selector rejected | Error returned |
| Invalid action rejected | Error returned |
| RBAC read allowed | yes |
| RBAC write denied | no |
| Enforcement survives API server failure | Policy still enforced |

## Best Practices

- Run RBAC validation after any role changes to confirm permissions are correctly configured
- Test API server failure resilience annually to confirm your team knows enforcement is independent of the API server
- Monitor API server pod health as a separate metric from Felix health - they have independent failure modes

## Conclusion

Calico API server validation covers pod health, API registration, CRUD operations, input validation, RBAC enforcement, and failure resilience. The most important validation is the last one - confirming that policy enforcement continues when the API server is unavailable. This test confirms that the API server is in the management path, not the enforcement path, which is the correct separation of concerns.
