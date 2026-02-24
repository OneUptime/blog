# How to Test Istio Failover Scenarios

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Failover, Resilience, Kubernetes, High Availability

Description: How to test Istio failover scenarios including locality-based failover, endpoint health checking, and cross-cluster failover to verify high availability configurations.

---

Failover is one of those things that works perfectly in theory and falls apart in practice. You configure locality-based load balancing, set up outlier detection, maybe even have a multi-cluster mesh. But have you actually tested what happens when a zone goes down? Most teams have not, and that is a problem you want to fix before an outage forces you to.

This guide walks through practical techniques for testing Istio's failover mechanisms.

## Understanding Istio Failover Types

Istio supports several failover mechanisms:

- **Outlier detection**: Ejects unhealthy endpoints from the load balancing pool
- **Locality failover**: Routes traffic to endpoints in the same zone/region, failing over to other zones when local endpoints are unhealthy
- **Retry policies**: Automatically retries failed requests on different endpoints
- **Circuit breaking**: Stops sending traffic to overloaded or failing services

Each of these needs to be tested independently and in combination.

## Setting Up for Failover Testing

Deploy multiple replicas of a service across different nodes (simulating different zones):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: failover-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: hashicorp/http-echo
        args:
        - -text
        - "$(NODE_NAME)"
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        ports:
        - containerPort: 5678
```

Create the service and DestinationRule:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: failover-test
spec:
  selector:
    app: my-service
  ports:
  - port: 5678
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: failover-test
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

## Testing Outlier Detection

Outlier detection ejects endpoints that return too many errors. To test this, you need an endpoint that you can make fail on demand.

Deploy a service where you can control the failure rate:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaky-service
  namespace: failover-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
      version: flaky
  template:
    metadata:
      labels:
        app: my-service
        version: flaky
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
        ports:
        - containerPort: 80
```

Use Istio fault injection to make this specific version return errors:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-fault
  namespace: failover-test
spec:
  hosts:
  - my-service
  http:
  - match:
    - sourceLabels:
        app: sleep
    route:
    - destination:
        host: my-service
```

Now generate traffic and watch the outlier detection kick in:

```bash
for i in $(seq 1 100); do
  kubectl exec -n failover-test deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}\n" http://my-service:5678
done
```

Check whether the flaky endpoint was ejected:

```bash
kubectl exec -n failover-test deploy/sleep -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

Look for `outlier_detection.ejections_active` to see how many endpoints are currently ejected.

## Testing Locality Failover

Locality-aware failover sends traffic to the closest healthy endpoints first. Configure it in your DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: failover-test
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1
          to: us-west-2
```

To test locality failover, you need endpoints in multiple zones. On a cloud provider, your nodes should already have topology labels:

```bash
kubectl get nodes --show-labels | grep topology.kubernetes.io/zone
```

To simulate a zone failure, scale down the pods in one zone or use a pod disruption:

```bash
# Find pods in a specific zone
kubectl get pods -n failover-test -o wide

# Delete pods on a specific node to simulate zone failure
kubectl delete pod -n failover-test -l app=my-service \
  --field-selector spec.nodeName=node-in-zone-a
```

Then immediately check if traffic fails over to the remaining zone:

```bash
for i in $(seq 1 20); do
  kubectl exec -n failover-test deploy/sleep -c sleep -- \
    curl -s http://my-service:5678
  sleep 0.5
done
```

## Testing Retry Behavior

Retries are configured on VirtualServices. When an endpoint fails, Istio can automatically retry the request on a different endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: failover-test
spec:
  hosts:
  - my-service
  http:
  - retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,retriable-4xx
    route:
    - destination:
        host: my-service
```

To test retries, inject a partial failure rate and verify that the caller sees a higher success rate than the actual backend:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-fault
  namespace: failover-test
spec:
  hosts:
  - my-service
  http:
  - fault:
      abort:
        percentage:
          value: 30
        httpStatus: 503
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx
    route:
    - destination:
        host: my-service
```

With 30% failure rate and 3 retry attempts, the probability of all 3 attempts failing is 0.3^3 = 2.7%. So the caller should see a success rate of about 97%:

```bash
SUCCESS=0
FAIL=0
for i in $(seq 1 100); do
  CODE=$(kubectl exec -n failover-test deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://my-service:5678)
  if [ "$CODE" = "200" ]; then
    SUCCESS=$((SUCCESS+1))
  else
    FAIL=$((FAIL+1))
  fi
done
echo "Success: $SUCCESS, Fail: $FAIL"
```

## Testing Pod Failure and Recovery

Simulate a pod crash and verify traffic automatically shifts to healthy pods:

```bash
# Watch traffic distribution
watch -n 1 'kubectl exec -n failover-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678'

# In another terminal, kill a pod
kubectl delete pod -n failover-test $(kubectl get pods -n failover-test \
  -l app=my-service -o jsonpath='{.items[0].metadata.name}')
```

Traffic should seamlessly shift to the remaining pods with at most a brief interruption.

## Testing with Network Partitions

For more advanced failover testing, simulate a network partition using NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: partition-zone-a
  namespace: failover-test
spec:
  podSelector:
    matchLabels:
      app: my-service
      zone: a
  policyTypes:
  - Ingress
  ingress: []
```

This blocks all ingress to pods with `zone: a` label, simulating a network partition. Traffic should fail over to pods in other zones.

After testing, remove the NetworkPolicy:

```bash
kubectl delete networkpolicy partition-zone-a -n failover-test
```

## Scripting a Full Failover Test

Here is a comprehensive failover test script:

```bash
#!/bin/bash
set -e

NAMESPACE="failover-test"

echo "=== Failover Test Suite ==="

echo "Test 1: Baseline - all pods healthy"
SUCCESS=0
for i in $(seq 1 20); do
  CODE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://my-service:5678)
  [ "$CODE" = "200" ] && SUCCESS=$((SUCCESS+1))
done
echo "Baseline success rate: $((SUCCESS * 100 / 20))%"

echo ""
echo "Test 2: Kill one pod, verify failover"
POD=$(kubectl get pods -n $NAMESPACE -l app=my-service \
  -o jsonpath='{.items[0].metadata.name}')
kubectl delete pod -n $NAMESPACE $POD
sleep 5

SUCCESS=0
for i in $(seq 1 20); do
  CODE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://my-service:5678)
  [ "$CODE" = "200" ] && SUCCESS=$((SUCCESS+1))
done
echo "After pod kill success rate: $((SUCCESS * 100 / 20))%"

echo ""
echo "Test 3: Wait for recovery"
kubectl wait --for=condition=ready pod -l app=my-service \
  -n $NAMESPACE --timeout=120s
echo "All pods recovered"
```

## Wrapping Up

Testing failover is not something you do once and forget about. Run these tests regularly, especially after Istio upgrades or changes to your DestinationRule configurations. The combination of outlier detection, locality failover, and retries gives you multiple layers of resilience, but only if they are configured correctly and actually tested.
