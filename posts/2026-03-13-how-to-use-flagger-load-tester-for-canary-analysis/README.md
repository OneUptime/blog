# How to Use Flagger Load Tester for Canary Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, load testing, load tester, kubernetes, progressive delivery, traffic generation

Description: Learn how to deploy and use the Flagger load tester to generate synthetic traffic for canary analysis during progressive delivery.

---

## Introduction

Flagger evaluates canary health by querying metrics like success rate and request duration. These metrics require actual traffic flowing to the canary workload. In production environments with steady traffic, this happens naturally. But in staging environments, during off-peak hours, or for newly deployed services, there may not be enough organic traffic to produce meaningful metrics.

The Flagger load tester is a companion tool that generates synthetic traffic during canary analysis. It runs as a Deployment in your cluster and responds to webhook calls from Flagger. When Flagger triggers a rollout webhook, the load tester starts sending requests to the canary, ensuring there is enough traffic for metric evaluation.

This guide covers deploying the load tester, configuring it with Canary resources, and understanding its capabilities.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- Helm installed (for deploying the load tester)
- kubectl access to your cluster
- A Canary resource targeting a Deployment

## Deploying the Load Tester

The load tester is available as a Helm chart from the Flagger repository. Deploy it to the same namespace as your canary workloads or a dedicated testing namespace:

```bash
helm repo add flagger https://flagger.app
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

This creates a Deployment and Service named `flagger-loadtester` in the `test` namespace. The load tester listens on port 80 and accepts webhook calls from Flagger.

Verify the deployment:

```bash
kubectl -n test get deploy flagger-loadtester
```

## How the Load Tester Works

The load tester accepts POST requests from Flagger webhooks. Each request contains a command to execute. The load tester supports several built-in tools:

- `hey` for HTTP load generation
- `ghz` for gRPC load generation
- `curl` for simple HTTP requests
- Arbitrary shell commands via `bash` type

When Flagger calls a `rollout` type webhook pointing to the load tester, the load tester starts executing the specified command. The command runs for the duration specified in the load test parameters.

## Configuring a Basic HTTP Load Test

Add a rollout webhook to your Canary that points to the load tester:

```yaml
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
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

The `cmd` metadata field contains the load test command. In this example, `hey` generates HTTP traffic for 1 minute (`-z 1m`) at 10 queries per second (`-q 10`) with 2 concurrent workers (`-c 2`) targeting the canary service.

The URL `http://my-app-canary.default:80/` targets the canary ClusterIP service that Flagger creates. This ensures load test traffic only hits the canary version, not the primary.

## Understanding the Canary Service Name

Flagger creates several Kubernetes Services for each Canary:

- `my-app` - The primary service (receives production traffic after promotion)
- `my-app-canary` - The canary service (targets canary pods during analysis)
- `my-app-primary` - The primary service that Flagger manages

When configuring load tests, always target the `-canary` service to ensure traffic flows to the canary version being evaluated.

## Adjusting Load Test Parameters

The load test command parameters should match your analysis interval and expected traffic patterns:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 2m -q 50 -c 5 http://my-app-canary.default:80/"
```

Key `hey` parameters:

- `-z` duration: Should be at least as long as your analysis interval to ensure continuous traffic
- `-q` rate: Queries per second per worker
- `-c` concurrency: Number of concurrent workers
- Total QPS = `-q` multiplied by `-c`

If your analysis interval is 1 minute, set the load test duration to at least 1 minute. The load tester starts a new instance of the command on each webhook call, so overlapping runs may occur if the duration exceeds the interval.

## Using the Load Tester for Pre-rollout Checks

The load tester is not limited to generating traffic. It can run arbitrary commands for pre-rollout validation:

```yaml
    webhooks:
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
```

The `type: bash` metadata tells the load tester to execute the command as a shell command rather than interpreting it as a load test tool.

## Load Tester Gate Endpoints

The load tester includes built-in gate endpoints for manual approval workflows:

- `POST /gate/open` - Opens the gate (subsequent checks return 200)
- `POST /gate/close` - Closes the gate (subsequent checks return non-200)
- `GET /gate/approve` - Returns 200 if gate is open, non-200 if closed

These work with `confirm-rollout`, `confirm-promotion`, and `confirm-traffic-increase` webhook types.

## Scaling the Load Tester

For high-throughput load testing, you may need to increase the load tester resources:

```bash
helm upgrade flagger-loadtester flagger/loadtester \
  --namespace test \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=256Mi \
  --set resources.limits.cpu=1000m \
  --set resources.limits.memory=512Mi
```

If you need even higher throughput, deploy multiple load tester replicas, though be aware that each replica will execute the command independently.

## Complete Example

Here is a full Canary resource that uses the load tester for both pre-rollout checks and traffic generation:

```yaml
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
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

## Conclusion

The Flagger load tester is an essential companion for canary analysis in environments where organic traffic is insufficient or unreliable. It integrates with Flagger through webhook calls, supporting HTTP load generation with `hey`, gRPC load generation with `ghz`, arbitrary shell commands, and manual approval gates. Deploy it alongside Flagger and configure rollout webhooks in your Canary resources to ensure every canary deployment receives enough traffic for meaningful metric evaluation.
