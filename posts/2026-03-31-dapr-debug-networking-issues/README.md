# How to Debug Dapr Networking Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debug, Networking, Kubernetes, Troubleshooting

Description: Learn how to diagnose and fix Dapr networking issues including sidecar connectivity, mTLS failures, service invocation errors, and DNS resolution problems.

---

## Common Dapr Networking Issues

Dapr networking problems typically fall into four categories: sidecar injection failures (the sidecar container is not running), service invocation failures (the sidecar cannot reach the target), mTLS certificate errors, and DNS resolution failures. Each has a distinct diagnosis path.

## Step 1 - Verify Sidecar Injection

Check that the Dapr sidecar is running in your pod:

```bash
# List containers in the pod
kubectl get pod order-service-abc123 -o jsonpath='{.spec.containers[*].name}'
# Expected output includes 'daprd'

# Check sidecar logs
kubectl logs order-service-abc123 -c daprd --tail=50

# Verify sidecar is ready
kubectl get pod order-service-abc123 -o jsonpath='{.status.containerStatuses[?(@.name=="daprd")].ready}'
```

## Step 2 - Test the Dapr HTTP API

From inside the pod, test the sidecar API directly:

```bash
kubectl exec -it order-service-abc123 -c order-service -- sh

# Check sidecar health (returns HTTP 204 when healthy)
curl -o /dev/null -w "%{http_code}\n" -s http://localhost:3500/v1.0/healthz
# Expected: 204

# List registered components
curl http://localhost:3500/v1.0/metadata | python3 -m json.tool

# Test service invocation
curl http://localhost:3500/v1.0/invoke/payment-service/method/health
```

## Step 3 - Diagnose mTLS Failures

mTLS errors appear in sidecar logs as certificate validation failures:

```bash
# Look for mTLS errors in sidecar logs
kubectl logs order-service-abc123 -c daprd | grep -E "(mtls|cert|tls|x509)"
```

To enable debug-level logging for more detail, patch the deployment as shown in Step 6.

Check certificate expiry:

```bash
# Check Dapr root certificate expiry using the CLI
dapr mtls expiry

# Or export and inspect certificates directly
dapr mtls export -o ./certs
openssl x509 -in ./certs/ca.crt -noout -dates
```

## Step 4 - DNS Resolution Debugging

If service invocation fails with "host not found":

```bash
# Test DNS from within the cluster
kubectl exec -n orders order-service-abc123 -- nslookup payment-service.payments.svc.cluster.local

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=30

# Verify the target service exists
kubectl get svc -n payments payment-service
```

## Step 5 - Network Policy Conflicts

Network policies may block Dapr ports (3500 HTTP API, 50001 gRPC API, 50002 internal gRPC for sidecar-to-sidecar):

```bash
# List network policies in namespace
kubectl get networkpolicies -n orders

# Test connectivity on Dapr internal gRPC port (sidecar-to-sidecar)
kubectl exec order-service-abc123 -- nc -zv payment-service.payments 50002
```

Allow Dapr ports explicitly:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-ports
  namespace: orders
spec:
  podSelector:
    matchLabels:
      dapr.io/enabled: "true"
  ingress:
  - ports:
    - port: 3500
    - port: 50001
    - port: 50002
  egress:
  - ports:
    - port: 3500
    - port: 50001
    - port: 50002
```

## Step 6 - Enable Full Debug Logging

For persistent issues, enable full debug mode:

```bash
# Patch the deployment to add debug logging
kubectl patch deployment order-service -p \
  '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/log-level":"debug"}}}}}'

# Stream sidecar logs
kubectl logs -f deployment/order-service -c daprd | grep -v "healthz"
```

## Summary

Debugging Dapr networking issues follows a systematic path: verify sidecar injection, test the HTTP API from within the pod, check mTLS certificate validity, test DNS resolution, and audit network policy rules. Enabling debug logging on the Dapr sidecar reveals the full detail of name resolution, mTLS handshakes, and component initialization needed to pinpoint most networking failures.
