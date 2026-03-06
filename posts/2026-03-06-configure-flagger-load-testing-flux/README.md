# How to Configure Flagger Load Testing with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flagger, load-testing, canary, kubernetes, gitops, performance, testing

Description: Learn how to set up automated load testing for Flagger canary deployments using built-in and external load testing tools with Flux.

---

## Introduction

Load testing is a critical component of canary analysis. Without sufficient traffic to the canary version, metrics analysis becomes unreliable. Flagger provides built-in support for load testing through webhooks, allowing you to generate synthetic traffic during canary deployments. This ensures that your canary always receives enough requests to produce meaningful metrics.

This guide covers how to configure Flagger load testing using various tools including the Flagger load tester, hey, and Fortio, all managed through Flux GitOps workflows.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Flagger deployed in the cluster
- An application with a Flagger Canary resource
- kubectl and flux CLI tools

## Step 1: Deploy the Flagger Load Tester

Flagger provides a built-in load testing service that can generate HTTP and gRPC traffic. Deploy it using Flux.

```yaml
# load-tester-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flagger-loadtester
  namespace: flagger-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flagger-loadtester
  template:
    metadata:
      labels:
        app: flagger-loadtester
    spec:
      containers:
        - name: loadtester
          # Official Flagger load tester image
          image: ghcr.io/fluxcd/flagger-loadtester:0.31.0
          ports:
            - containerPort: 8080
              name: http
          # Command-line flags for the load tester
          command:
            - ./loadtester
            - -port=8080
            - -log-level=info
            - -timeout=1h
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: flagger-loadtester
  namespace: flagger-system
spec:
  selector:
    app: flagger-loadtester
  ports:
    - port: 80
      targetPort: 8080
```

Apply the deployment:

```bash
kubectl apply -f load-tester-deployment.yaml
```

## Step 2: Configure Basic HTTP Load Testing

Add a load testing webhook to your Canary resource. The load tester will generate traffic to the canary service during analysis.

```yaml
# canary-with-load-test.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      # Load test webhook using the built-in hey tool
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          # hey command to generate HTTP load
          # -q: queries per second per worker
          # -c: number of concurrent workers
          # -z: duration of the test
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

## Step 3: Configure Load Testing with Custom HTTP Headers

For applications that require authentication or custom headers, pass them to the load tester.

```yaml
# canary-with-custom-headers.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-api
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # Load test with custom headers
      - name: load-test-with-headers
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          # Include authorization and content-type headers
          cmd: >-
            hey -z 1m -q 5 -c 2
            -H "Authorization: Bearer test-token"
            -H "Content-Type: application/json"
            http://my-api-canary.default.svc.cluster.local:80/api/v1/health
```

## Step 4: Configure Load Testing with POST Requests

For APIs that need POST requests with a body, configure the load tester accordingly.

```yaml
# canary-with-post-load-test.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-api
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # POST request load test
      - name: load-test-post
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          # Use -m for method and -d for request body
          cmd: >-
            hey -z 1m -q 5 -c 2
            -m POST
            -H "Content-Type: application/json"
            -d '{"action":"test","timestamp":"2026-03-06"}'
            http://my-api-canary.default.svc.cluster.local:80/api/v1/events
```

## Step 5: Configure Load Testing with Fortio

Fortio is another load testing tool supported by the Flagger load tester. It provides more detailed histograms and percentile reporting.

```yaml
# canary-with-fortio.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # Fortio-based load testing
      - name: load-test-fortio
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          type: cmd
          # Fortio load test command
          # -qps: queries per second
          # -c: concurrent connections
          # -t: duration
          # -loglevel: reduce output noise
          cmd: >-
            fortio load -qps 20 -c 4 -t 60s -loglevel Warning
            http://my-app-canary.default.svc.cluster.local:80/
```

## Step 6: Configure gRPC Load Testing

For gRPC services, use the built-in gRPC load testing support.

```yaml
# canary-grpc-load-test.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-grpc-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-grpc-app
  service:
    port: 9090
    targetPort: 9090
    appProtocol: grpc
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # gRPC load testing with ghz
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          type: cmd
          # ghz gRPC benchmarking tool
          cmd: >-
            ghz --insecure
            --proto /tmp/protos/service.proto
            --call mypackage.MyService/MyMethod
            -d '{"key":"value"}'
            -c 5 -n 1000
            my-grpc-app-canary.default.svc.cluster.local:9090
```

## Step 7: Run Custom Test Scripts

The Flagger load tester can run arbitrary shell commands and scripts.

```yaml
# canary-with-custom-script.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      # Run a bash command for custom testing
      - name: custom-test-script
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 60s
        metadata:
          type: bash
          # Custom bash script for validation
          cmd: >-
            curl -s -o /dev/null -w '%{http_code}'
            http://my-app-canary.default.svc.cluster.local:80/health
            | grep -q '200' && echo 'Health check passed' || exit 1
```

## Step 8: Multiple Load Test Profiles

Configure multiple load test webhooks to simulate different traffic patterns.

```yaml
# canary-multi-load-test.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # Light load on the homepage
      - name: load-test-homepage
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 20 -c 4 http://my-app-canary.default.svc.cluster.local:80/"
      # Moderate load on the API
      - name: load-test-api
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/api/v1/items"
      # Low load on search endpoint
      - name: load-test-search
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 2 -c 1 http://my-app-canary.default.svc.cluster.local:80/api/v1/search?q=test"
```

## Step 9: Verify Load Testing

Confirm that load testing is working during canary deployments.

```bash
# Check load tester pod is running
kubectl get pods -n flagger-system -l app=flagger-loadtester

# View load tester logs
kubectl logs -n flagger-system deployment/flagger-loadtester -f

# Trigger a canary deployment
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Watch canary progression
kubectl get canary my-app -n default -w
```

## Troubleshooting

Common load testing issues:

- **Load tester pod OOM**: Increase memory limits on the load tester deployment
- **Connection refused to canary**: Ensure the canary service exists and the port is correct
- **Timeout errors**: Increase the webhook timeout or reduce the load test duration
- **No metrics generated**: Verify the service mesh or ingress is correctly routing traffic and collecting metrics

```bash
# Check load tester health
kubectl exec -n flagger-system deployment/flagger-loadtester -- wget -qO- http://localhost:8080/healthz

# View Flagger logs for load test activity
kubectl logs -n flagger-system deployment/flagger --tail=50 | grep -i "load\|webhook"
```

## Conclusion

Load testing is essential for reliable canary analysis. By deploying the Flagger load tester and configuring webhooks, you ensure that every canary deployment receives sufficient traffic to produce meaningful metrics. Whether you use simple HTTP load testing with hey, advanced load testing with Fortio, gRPC benchmarking with ghz, or custom scripts, Flagger's webhook system provides the flexibility to match your testing needs. Combined with Flux GitOps, your load testing configuration is version-controlled and reproducible.
