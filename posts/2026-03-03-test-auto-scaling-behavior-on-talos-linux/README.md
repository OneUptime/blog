# How to Test Auto-Scaling Behavior on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Autoscaling, Load Testing, Performance Testing, HPA

Description: A practical guide to testing and validating autoscaling behavior on Talos Linux using load testing tools and systematic verification approaches.

---

Setting up autoscaling is one thing. Knowing that it actually works under real conditions is another. Before relying on autoscaling in production, you should test it thoroughly. On Talos Linux, testing autoscaling behavior involves generating controlled load, observing the scaling response, measuring reaction times, and verifying that your application stays healthy throughout the process.

This guide provides a structured approach to testing autoscaling on Talos Linux clusters.

## What to Test

A thorough autoscaling test covers several scenarios:

- Scale-up under increasing load
- Scale-down when load decreases
- Behavior during sudden traffic spikes
- Response to gradual load increases
- Scale-up latency (how long from overload to new pods serving traffic)
- Behavior at maximum replica count
- Recovery from burst traffic
- Pod health during scaling events

## Setting Up a Test Application

First, deploy a simple application with known resource characteristics:

```yaml
# test-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  labels:
    app: test-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: app
        image: registry.k8s.io/hpa-example
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "200m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: test-app
spec:
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: test-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: test-app
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

```bash
kubectl apply -f test-app.yaml

# Wait for everything to be ready
kubectl rollout status deployment test-app
kubectl get hpa test-app-hpa
```

## Test 1: Basic Scale-Up and Scale-Down

The first test validates that scaling works at all.

### Generate Load

```bash
# Start a load generator pod
kubectl run load-generator \
  --image=busybox:1.36 \
  --restart=Never \
  -- /bin/sh -c "while true; do wget -q -O- http://test-app.default.svc.cluster.local; done"
```

### Monitor the Response

Open multiple terminals to watch different aspects:

```bash
# Terminal 1: Watch HPA status
kubectl get hpa test-app-hpa -w

# Terminal 2: Watch pod count
kubectl get pods -l app=test-app -w

# Terminal 3: Watch CPU metrics
watch -n 5 'kubectl top pods -l app=test-app'

# Terminal 4: Watch events
kubectl get events -w --field-selector involvedObject.name=test-app-hpa
```

### Measure Scale-Up Time

Record when load starts and when new pods become ready:

```bash
# Log timestamps of scaling events
kubectl get events --field-selector reason=SuccessfulRescale \
  --sort-by='.lastTimestamp' -o custom-columns=TIME:.lastTimestamp,MESSAGE:.message
```

### Stop Load and Observe Scale-Down

```bash
# Remove the load generator
kubectl delete pod load-generator

# Watch the HPA scale down over the next few minutes
kubectl get hpa test-app-hpa -w
```

## Test 2: Sudden Traffic Spike

This tests how the HPA handles a sudden burst of traffic:

```bash
# Create a massive sudden load
kubectl run spike-test \
  --image=busybox:1.36 \
  --restart=Never \
  -- /bin/sh -c "
    # Spawn 20 parallel workers
    for i in \$(seq 1 20); do
      while true; do
        wget -q -O- http://test-app.default.svc.cluster.local
      done &
    done
    wait
  "
```

Measure:
- How quickly the HPA detects the overload
- How many pods are added per minute
- Whether any requests fail during the scaling event
- Total time to reach sufficient capacity

```bash
# Track response times during the spike
kubectl run latency-checker \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- /bin/sh -c "
    while true; do
      START=\$(date +%s%N)
      curl -s -o /dev/null http://test-app.default.svc.cluster.local
      END=\$(date +%s%N)
      ELAPSED=\$(( (END - START) / 1000000 ))
      echo \"\$(date +%H:%M:%S) Response time: \${ELAPSED}ms\"
      sleep 1
    done
  "

# View latency checker output
kubectl logs latency-checker -f
```

Clean up:

```bash
kubectl delete pod spike-test latency-checker
```

## Test 3: Gradual Load Increase

This tests whether the HPA scales smoothly with gradually increasing traffic:

```yaml
# gradual-load.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: gradual-load
spec:
  template:
    spec:
      containers:
      - name: loader
        image: busybox:1.36
        command: ['sh', '-c']
        args:
        - |
          echo "Starting gradual load test"

          # Phase 1: Light load (2 minutes)
          echo "Phase 1: Light load"
          for i in $(seq 1 120); do
            wget -q -O- http://test-app.default.svc.cluster.local > /dev/null 2>&1
            sleep 0.5
          done

          # Phase 2: Medium load (2 minutes)
          echo "Phase 2: Medium load"
          for i in $(seq 1 120); do
            for j in $(seq 1 5); do
              wget -q -O- http://test-app.default.svc.cluster.local > /dev/null 2>&1 &
            done
            sleep 0.5
            wait
          done

          # Phase 3: Heavy load (2 minutes)
          echo "Phase 3: Heavy load"
          for i in $(seq 1 120); do
            for j in $(seq 1 20); do
              wget -q -O- http://test-app.default.svc.cluster.local > /dev/null 2>&1 &
            done
            sleep 0.5
            wait
          done

          # Phase 4: Cool down (5 minutes)
          echo "Phase 4: Cool down"
          sleep 300

          echo "Load test complete"
      restartPolicy: Never
  backoffLimit: 1
```

```bash
kubectl apply -f gradual-load.yaml
kubectl logs job/gradual-load -f
```

## Test 4: Using Hey for HTTP Load Testing

For more realistic HTTP load testing, use the `hey` tool:

```yaml
# hey-load-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hey-load-test
spec:
  containers:
  - name: hey
    image: williamyeh/hey:latest
    command: ['sh', '-c']
    args:
    - |
      echo "=== Test 1: Moderate sustained load ==="
      hey -z 120s -c 50 -q 10 http://test-app.default.svc.cluster.local/

      echo "=== Test 2: High burst load ==="
      hey -z 60s -c 200 -q 50 http://test-app.default.svc.cluster.local/

      echo "=== Test 3: Recovery period ==="
      sleep 300

      echo "=== Tests complete ==="
  restartPolicy: Never
```

```bash
kubectl apply -f hey-load-test.yaml
kubectl logs hey-load-test -f
```

## Test 5: Max Replica Behavior

Test what happens when the HPA reaches the maximum replica count:

```bash
# Generate load that exceeds capacity even at max replicas
kubectl run max-test --image=busybox:1.36 --restart=Never -- /bin/sh -c "
  for i in \$(seq 1 50); do
    while true; do
      wget -q -O- http://test-app.default.svc.cluster.local
    done &
  done
  wait
"

# Watch for the HPA hitting the ceiling
kubectl get hpa test-app-hpa -w
# Look for: "REPLICAS" reaching maxReplicas
# Look for events about being unable to scale further
```

This test helps you understand:
- Whether your maxReplicas setting is high enough
- How your application behaves under overload
- Whether you need to increase limits or optimize your application

## Automated Test Script

Create a comprehensive test script:

```bash
#!/bin/bash
# autoscale-test.sh

DEPLOYMENT="test-app"
HPA="test-app-hpa"
SERVICE="test-app.default.svc.cluster.local"

echo "=== Autoscaling Test Suite ==="
echo "Start time: $(date)"
echo ""

# Record initial state
echo "--- Initial State ---"
kubectl get hpa $HPA
kubectl get pods -l app=$DEPLOYMENT --no-headers | wc -l
echo ""

# Start load
echo "--- Starting Load ---"
kubectl run test-load --image=busybox:1.36 --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://$SERVICE; done" 2>/dev/null

# Monitor scaling for 5 minutes
echo "--- Monitoring Scale-Up (5 minutes) ---"
for i in $(seq 1 20); do
  REPLICAS=$(kubectl get hpa $HPA -o jsonpath='{.status.currentReplicas}')
  CPU=$(kubectl get hpa $HPA -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')
  echo "$(date +%H:%M:%S) Replicas: $REPLICAS, CPU: ${CPU}%"
  sleep 15
done

# Stop load
echo ""
echo "--- Stopping Load ---"
kubectl delete pod test-load 2>/dev/null

# Monitor scale-down for 10 minutes
echo "--- Monitoring Scale-Down (10 minutes) ---"
for i in $(seq 1 40); do
  REPLICAS=$(kubectl get hpa $HPA -o jsonpath='{.status.currentReplicas}')
  CPU=$(kubectl get hpa $HPA -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')
  echo "$(date +%H:%M:%S) Replicas: $REPLICAS, CPU: ${CPU}%"
  sleep 15
done

echo ""
echo "--- Final State ---"
kubectl get hpa $HPA
echo "End time: $(date)"
```

## Analyzing Results

After running tests, analyze the data:

```bash
# Get all scaling events with timestamps
kubectl get events --field-selector reason=SuccessfulRescale \
  --sort-by='.lastTimestamp' \
  -o custom-columns=TIME:.lastTimestamp,MESSAGE:.message

# Calculate scale-up latency
# (time from first pending pod to all pods ready)
kubectl get events --sort-by='.lastTimestamp' \
  -o custom-columns=TIME:.lastTimestamp,REASON:.reason,MESSAGE:.message | \
  grep -E "ScalingReplicaSet|SuccessfulRescale|Scheduled|Started|Ready"
```

## Wrapping Up

Testing autoscaling on Talos Linux is not optional - it is essential. Untested autoscaling configurations can fail in surprising ways under real load. Run through each test scenario, measure the response times, and verify that your application stays healthy during scaling events. Record your results, tune your HPA behavior settings based on the data, and re-test after any configuration changes. A well-tested autoscaling setup gives you confidence that your cluster can handle whatever traffic comes its way.
