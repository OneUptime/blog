# How to Test mTLS Configuration Correctness

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Testing, Security, Kubernetes

Description: Comprehensive testing strategies to verify that your Istio mTLS configuration is correct, including automated tests, manual verification, and common edge cases.

---

Configuring mTLS in Istio is one thing. Knowing it actually works correctly is another. You might think strict mTLS is enforced across your mesh, but without proper testing, there could be gaps: services accepting plaintext, policies not applied to certain ports, or exceptions that are wider than intended.

This guide covers practical testing strategies to verify your mTLS configuration is doing what you think it is doing.

## Test 1: Verify mTLS is Active Between Services

The most basic test is confirming that traffic between two mesh services is encrypted. Deploy a test client:

```bash
kubectl apply -f samples/sleep/sleep.yaml
```

Call a service and check the connection security:

```bash
kubectl exec deploy/sleep -- curl -s http://my-service:8080/headers | grep -i "x-forwarded"
```

But this does not really tell you if mTLS is active. A better approach is to check the Istio metrics:

```bash
kubectl exec deploy/sleep -- curl -s "http://my-service:8080" > /dev/null
```

Then query the metrics:

```promql
istio_requests_total{
  source_workload="sleep",
  destination_workload="my-service",
  connection_security_policy="mutual_tls"
}
```

If `connection_security_policy` is `mutual_tls`, the connection is encrypted. If it is `none`, the traffic is plaintext.

## Test 2: Verify Plaintext is Rejected (Strict Mode)

When strict mTLS is configured, plaintext connections should be rejected. To test this, you need to send a request that bypasses the sidecar. Create a pod without a sidecar:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-sidecar-test
  labels:
    sidecar.istio.io/inject: "false"
spec:
  containers:
  - name: curl
    image: curlimages/curl
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f no-sidecar-test.yaml
```

Now try to call a service with strict mTLS from this pod:

```bash
kubectl exec no-sidecar-test -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080
```

With strict mTLS, this should fail. You will get a connection reset or an empty response because the service's sidecar expects an mTLS handshake that the plaintext client cannot provide.

If the call succeeds and returns a 200, your strict mTLS policy is not being enforced.

## Test 3: Use istioctl to Check Policy Application

istioctl has built-in tools for checking mTLS status:

```bash
istioctl x describe pod my-service-pod-abc123
```

This command shows:
- Which PeerAuthentication policies apply to the pod
- Whether the pod is in strict or permissive mode
- Any DestinationRules affecting traffic to this pod

For a broader view:

```bash
istioctl x authz check deploy/my-service
```

This shows the authorization and authentication policies in effect.

## Test 4: Check the Proxy Configuration Directly

Look at what the Envoy proxy is actually configured to do:

```bash
istioctl proxy-config listeners deploy/my-service --port 8080 -o json | \
  jq '.[].filterChains[].transportSocket'
```

If mTLS is active, the transport socket configuration will show TLS settings. If it is null, the listener accepts plaintext.

For the client side:

```bash
istioctl proxy-config clusters deploy/sleep --fqdn my-service.default.svc.cluster.local -o json | \
  jq '.[].transportSocket'
```

This shows whether the client sidecar is configured to use mTLS when connecting to `my-service`.

## Test 5: Verify Certificate Identity

Check that the certificate presented by a workload has the correct SPIFFE identity:

```bash
istioctl proxy-config secret deploy/my-service -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep "URI:"
```

The output should show:

```
URI:spiffe://cluster.local/ns/default/sa/my-service-account
```

This confirms the workload has a valid SPIFFE identity matching its namespace and service account.

## Test 6: Port-Level mTLS Testing

If you have port-level mTLS exceptions, test each port individually:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mixed-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

Test the strict port from a non-mesh pod (should fail):

```bash
kubectl exec no-sidecar-test -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080
```

Test the permissive port from a non-mesh pod (should succeed):

```bash
kubectl exec no-sidecar-test -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8081
```

## Test 7: Cross-Namespace mTLS

Verify mTLS works across namespace boundaries:

```bash
# From namespace-a to namespace-b
kubectl exec -n namespace-a deploy/sleep -- curl -s http://my-service.namespace-b:8080
```

Check the security policy in the metrics to confirm mTLS is active.

## Test 8: Automated mTLS Testing with a Script

Create a test script that runs through all your critical mTLS scenarios:

```bash
#!/bin/bash
PASS=0
FAIL=0

echo "=== mTLS Configuration Tests ==="

# Test 1: mesh traffic should use mTLS
echo -n "Test 1: Mesh-to-mesh mTLS... "
RESULT=$(kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080 2>/dev/null)
if [ "$RESULT" = "200" ]; then
  echo "PASS"
  ((PASS++))
else
  echo "FAIL (got $RESULT)"
  ((FAIL++))
fi

# Test 2: non-mesh plaintext should be rejected
echo -n "Test 2: Plaintext rejection (strict mode)... "
RESULT=$(kubectl exec no-sidecar-test -- curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://my-service:8080 2>/dev/null)
if [ "$RESULT" = "000" ] || [ "$RESULT" = "056" ]; then
  echo "PASS (connection rejected)"
  ((PASS++))
else
  echo "FAIL (got $RESULT, expected rejection)"
  ((FAIL++))
fi

# Test 3: permissive port should accept plaintext
echo -n "Test 3: Permissive port accepts plaintext... "
RESULT=$(kubectl exec no-sidecar-test -- curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://my-service:8081 2>/dev/null)
if [ "$RESULT" = "200" ]; then
  echo "PASS"
  ((PASS++))
else
  echo "FAIL (got $RESULT)"
  ((FAIL++))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Test 9: Verify mTLS Metrics in Prometheus

Run a Prometheus query to check the ratio of mTLS to plaintext traffic across your entire mesh:

```promql
sum(rate(istio_requests_total{connection_security_policy="mutual_tls"}[5m]))
/
sum(rate(istio_requests_total[5m]))
```

This gives you the percentage of requests using mTLS. In a fully strict mesh, this should be close to 1.0 (100%).

For a per-service breakdown:

```promql
sum(rate(istio_requests_total[5m])) by (destination_workload, connection_security_policy)
```

Any service showing `connection_security_policy="none"` traffic needs investigation.

## Test 10: Periodic Compliance Checks

Set up a CronJob that runs mTLS tests periodically:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mtls-compliance-check
  namespace: istio-test
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            sidecar.istio.io/inject: "true"
        spec:
          containers:
          - name: checker
            image: curlimages/curl
            command:
            - /bin/sh
            - -c
            - |
              echo "Checking mTLS compliance..."
              curl -s http://critical-service.production:8080 > /dev/null
              if [ $? -eq 0 ]; then
                echo "OK: critical-service reachable via mTLS"
              else
                echo "FAIL: critical-service unreachable"
              fi
          restartPolicy: OnFailure
```

## Common Testing Pitfalls

**Testing too soon after policy changes**: PeerAuthentication changes take a few seconds to propagate to all sidecars. Wait at least 10-15 seconds after applying a change before testing.

**Not testing from the right context**: Testing from a pod with a sidecar tells you if mesh traffic works. Testing from a pod without a sidecar tells you if plaintext is rejected. You need both tests.

**Assuming DestinationRules override PeerAuthentication**: They do not. PeerAuthentication controls what the server accepts. DestinationRules control what the client sends. They work together but serve different purposes.

**Forgetting about cached connections**: Envoy reuses TCP connections. A policy change might not affect an existing connection until it is closed and a new one is opened. For reliable testing, delete and recreate the test pods.

Thorough mTLS testing catches configuration gaps before they become security incidents. Build these tests into your CI/CD pipeline and run them regularly against your production mesh.
