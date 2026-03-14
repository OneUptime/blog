# How to Troubleshoot Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Troubleshooting, Hard Way

Description: A guide to diagnosing and resolving common Typha issues in a manually installed Calico cluster including connection failures, TLS errors, and policy propagation delays.

---

## Introduction

Typha failures in hard way installations are typically caused by TLS misconfiguration (most common), RBAC permission gaps, or resource exhaustion. The symptoms often appear as slow policy propagation rather than a hard failure — Felix continues operating with stale state if Typha is unavailable, masking the underlying issue until a policy change fails to take effect.

## Issue 1: Felix Cannot Connect to Typha

**Symptom:** Felix logs show repeated connection failures to Typha.

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i "typha\|error" | tail -20
```

**Check 1:** Is the Typha Service resolvable from the node?

```bash
kubectl run dns-test --image=busybox --restart=Never -- nslookup calico-typha.calico-system.svc.cluster.local
kubectl delete pod dns-test
```

**Check 2:** Is the Typha pod running and endpoints populated?

```bash
kubectl get pods -n calico-system -l app=calico-typha
kubectl get endpoints calico-typha -n calico-system
```

**Resolution:** If Typha pod is in CrashLoopBackOff, check its logs.

```bash
kubectl logs -n calico-system deployment/calico-typha --previous
```

## Issue 2: TLS Authentication Failure

**Symptom:** Typha logs show rejected connections.

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "tls\|rejected\|cert" | tail -20
```

**Check:** Verify certificate validity.

```bash
kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -text | grep -A2 "Validity\|Subject"

kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -text | grep -A2 "Validity\|Subject"
```

**Check:** Verify CA cert matches on both sides.

```bash
TYPHA_CA=$(kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
FELIX_CA=$(kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
[ "$TYPHA_CA" = "$FELIX_CA" ] && echo "CA certs match" || echo "CA cert MISMATCH"
```

**Resolution:** Regenerate certificates with a shared CA and update both secrets.

## Issue 3: Policy Updates Not Propagating

**Symptom:** NetworkPolicy applied but not enforced on some nodes.

```bash
# Check if Typha is fanning out updates
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep typha_updates_sent
```

**Check:** Is the update rate non-zero after policy changes?

```bash
# Apply a policy and watch the metric
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: typha-debug-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

curl -s http://localhost:9093/metrics | grep typha_updates_sent
kubectl delete networkpolicy typha-debug-test
```

**Resolution:** If update count does not increase, check Typha's RBAC permissions.

```bash
kubectl auth can-i watch networkpolicies --as=system:serviceaccount:calico-system:calico-typha
```

## Issue 4: Typha Running Out of Memory

**Symptom:** Typha pod OOMKilled.

```bash
kubectl describe pod -n calico-system -l app=calico-typha | grep -A3 "OOMKilled\|Last State"
```

**Resolution:** Increase memory limit.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {"template": {"spec": {"containers": [{
    "name": "calico-typha",
    "resources": {"limits": {"memory": "1Gi"}}
  }]}}}
}'
```

## Issue 5: Too Many Felix Connections Per Typha Replica

**Symptom:** High CPU on Typha, slow policy propagation.

```bash
curl -s http://localhost:9093/metrics | grep typha_connections_active
```

**Resolution:** Scale Typha replicas.

```bash
NODES=$(kubectl get nodes --no-headers | wc -l)
REPLICAS=$(( (NODES + 199) / 200 ))
kubectl scale deployment calico-typha -n calico-system --replicas=$REPLICAS
```

## Conclusion

Typha troubleshooting in hard way installations follows a layered approach: confirm the Typha pod is running and its Service has endpoints, verify TLS certificates are valid and signed by the same CA, check RBAC permissions for Typha's service account, and monitor Prometheus metrics for update rate and connection counts. The most frequent root cause is TLS misconfiguration — verifying CA cert consistency between the Typha and Felix secrets resolves the majority of connection failures.
