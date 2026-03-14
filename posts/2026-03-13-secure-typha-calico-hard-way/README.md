# How to Secure Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Security, TLS, mTLS, Hard Way

Description: A guide to securing Typha with mTLS, RBAC, network policies, and certificate rotation in a manually installed Calico cluster.

---

## Introduction

Typha sits in the data path for all Calico policy updates. A compromised Typha could deliver false policy state to Felix agents, causing incorrect network policy enforcement across the cluster. Securing Typha requires mutual TLS authentication between Felix and Typha (so only authorized Felix agents can connect), restrictive RBAC (so Typha has only the permissions it needs), and NetworkPolicy to limit what can reach the Typha service.

## Step 1: Enforce mTLS Between Felix and Typha

mTLS requires both sides to present valid certificates signed by the shared CA. This prevents unauthorized clients from connecting to Typha.

Verify mTLS is configured on the Typha side.

```bash
kubectl get deployment calico-typha -n calico-system -o yaml | grep -A5 "TYPHA_CA\|TYPHA_SERVER"
```

Expect:
- `TYPHA_CAFILE` pointing to the CA certificate
- `TYPHA_SERVERCERTFILE` pointing to the Typha server certificate
- `TYPHA_SERVERKEYFILE` pointing to the Typha server key

Verify on the Felix side.

```bash
calicoctl get felixconfiguration default -o yaml | grep -i typha
```

Expect `typhaCAFile`, `tymphaCertFile`, and `typhaKeyFile` to be set.

## Step 2: Restrict Typha RBAC to Minimum Permissions

Typha needs read-only access to specific resource types. Audit the ClusterRole.

```bash
kubectl get clusterrole calico-typha -o yaml
```

Remove any write permissions (`create`, `update`, `delete`, `patch`) if present.

```bash
kubectl edit clusterrole calico-typha
# Verify only "watch", "list", "get" verbs are present
```

## Step 3: Apply NetworkPolicy to Restrict Typha Access

Only Felix agents (running on nodes as DaemonSets) should be able to reach the Typha service on port 5473. Apply a NetworkPolicy.

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-typha-access
  namespace: calico-system
spec:
  podSelector:
    matchLabels:
      app: calico-typha
  ingress:
  - from:
    - podSelector:
        matchLabels:
          k8s-app: calico-node
    ports:
    - port: 5473
      protocol: TCP
  - ports:
    - port: 9093
      protocol: TCP
  policyTypes: [Ingress]
EOF
```

## Step 4: Rotate Certificates Before Expiry

Certificates generated for Typha have a limited validity period. Rotate them before expiry.

```bash
# Check certificate expiry
kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -enddate -noout
```

When rotation is needed, generate new certificates, update the secret, and restart Typha.

```bash
# Generate new certs (same commands as initial setup)
# Update the secret
kubectl create secret generic calico-typha-tls \
  --from-file=ca.crt=typha-ca.crt \
  --from-file=tls.crt=typha-server.crt \
  --from-file=tls.key=typha-server.key \
  -n calico-system --dry-run=client -o yaml | kubectl apply -f -

# Restart Typha
kubectl rollout restart deployment/calico-typha -n calico-system
kubectl rollout status deployment/calico-typha -n calico-system
```

## Step 5: Run Typha as Non-Root

Configure the Typha container to run as a non-root user.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "calico-typha",
          "securityContext": {
            "runAsNonRoot": true,
            "runAsUser": 1000,
            "allowPrivilegeEscalation": false,
            "readOnlyRootFilesystem": true
          }
        }]
      }
    }
  }
}'
```

## Step 6: Disable Anonymous Connections

Verify Typha does not accept unauthenticated connections.

```bash
# Attempt an unauthenticated connection to Typha (should fail)
kubectl run tls-test --image=busybox --restart=Never -- \
  wget --timeout=5 typha-svc.calico-system.svc.cluster.local:5473 || echo "Correctly rejected"
kubectl delete pod tls-test
```

## Conclusion

Securing Typha in a hard way installation requires mTLS enforcement for Felix connections, minimum-privilege RBAC, NetworkPolicy to restrict access to the Typha service, certificate rotation before expiry, and non-root execution. These controls ensure that Typha cannot be used as a vector to inject false policy state into the cluster, maintaining the integrity of Calico's network policy enforcement.
