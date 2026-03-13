# How to Configure Flagger Load Tester with hey for HTTP Load

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, load testing, hey, http, kubernetes, progressive delivery, traffic generation

Description: Learn how to configure Flagger's load tester with the hey HTTP load generator to produce realistic traffic patterns for canary analysis.

---

## Introduction

The `hey` tool is a lightweight HTTP load generator included in the Flagger load tester image. It sends HTTP requests at a configurable rate and concurrency, making it ideal for generating the synthetic traffic that Flagger needs to evaluate canary health metrics.

When Flagger performs canary analysis, it queries metrics like request success rate and request duration. These metrics require actual HTTP traffic flowing to the canary. The `hey` tool, triggered through Flagger's webhook system, provides that traffic on demand. Understanding `hey`'s parameters lets you shape the load profile to match your production traffic patterns.

This guide covers how to configure `hey` within Flagger webhooks, explains its key parameters, and provides examples for common load testing scenarios.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- The Flagger load tester deployed in your cluster
- A Canary resource targeting an HTTP Deployment
- kubectl access to your cluster

## Basic hey Configuration

The simplest `hey` command sends requests at a fixed rate for a specified duration:

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
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

This generates 20 requests per second (10 QPS per worker times 2 workers) for 1 minute.

## Key hey Parameters

Understanding the `hey` flags helps you tune load generation:

- `-z duration`: Run for the specified duration (e.g., `1m`, `30s`, `2m`). Mutually exclusive with `-n`.
- `-n count`: Send a specific number of requests. Mutually exclusive with `-z`.
- `-q rate`: Rate limit per worker (queries per second per concurrent worker).
- `-c concurrency`: Number of concurrent workers sending requests.
- `-m method`: HTTP method (GET, POST, PUT, DELETE). Defaults to GET.
- `-H header`: Custom HTTP header. Can be specified multiple times.
- `-d body`: HTTP request body for POST/PUT requests.
- `-D file`: Read HTTP request body from file.
- `-T content-type`: Content-Type header value.
- `-t timeout`: Timeout per request in seconds.

## Duration-Based Load Testing

For canary analysis, duration-based testing with `-z` is preferred because it aligns with the analysis interval:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

Set the duration to match your analysis interval. If the interval is `1m`, use `-z 1m`. The load tester starts a new `hey` instance on each webhook call, so each analysis step gets its own load generation.

## Adjusting Request Rate

The total request rate is the product of `-q` and `-c`. Choose values that produce enough traffic for meaningful metrics without overwhelming the canary:

Low traffic (suitable for lightweight services):

```yaml
          cmd: "hey -z 1m -q 5 -c 1 http://my-app-canary.default:80/"
```

This generates 5 requests per second.

Medium traffic (suitable for most services):

```yaml
          cmd: "hey -z 1m -q 10 -c 5 http://my-app-canary.default:80/"
```

This generates 50 requests per second.

High traffic (for load-tested services):

```yaml
          cmd: "hey -z 1m -q 50 -c 10 http://my-app-canary.default:80/"
```

This generates 500 requests per second.

## Sending POST Requests with a Body

For services that require POST requests for meaningful evaluation, use `-m` and `-d`:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: >
            hey -z 1m -q 10 -c 2
            -m POST
            -H "Content-Type: application/json"
            -d '{"action":"test","value":42}'
            http://my-app-canary.default:80/api/process
```

This sends POST requests with a JSON body to a specific API endpoint.

## Adding Custom Headers

If your service requires authentication or specific headers:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: >
            hey -z 1m -q 10 -c 2
            -H "Authorization: Bearer test-token"
            -H "X-Request-Source: canary-test"
            http://my-app-canary.default:80/api/data
```

Multiple `-H` flags add multiple headers to each request.

## Testing Multiple Endpoints

To test multiple endpoints, define separate webhook entries:

```yaml
    webhooks:
      - name: load-test-api
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/api/v1/data"
      - name: load-test-health
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 5 -c 1 http://my-app-canary.default:80/healthz"
```

Both commands run in parallel during each analysis step, generating traffic to different endpoints simultaneously.

## Setting Request Timeouts

For services with known response time expectations, set a per-request timeout:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 -t 5 http://my-app-canary.default:80/"
```

The `-t 5` flag sets a 5-second timeout per request. Requests that exceed this timeout are counted as failures in `hey`'s output, though the canary metrics depend on what the service mesh or ingress reports to Prometheus.

## Matching Production Traffic Patterns

To get the most realistic canary evaluation, try to match your production traffic characteristics:

```yaml
    webhooks:
      - name: load-test-reads
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 40 -c 4 http://my-app-canary.default:80/api/items"
      - name: load-test-writes
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: >
            hey -z 1m -q 10 -c 2
            -m POST
            -H "Content-Type: application/json"
            -d '{"name":"test-item"}'
            http://my-app-canary.default:80/api/items
```

This approximates a 4:1 read-to-write ratio by running separate load tests for GET and POST requests.

## Conclusion

The `hey` HTTP load generator in the Flagger load tester provides flexible, configurable traffic generation for canary analysis. By tuning the rate (`-q`), concurrency (`-c`), duration (`-z`), HTTP method (`-m`), and headers (`-H`), you can shape the load profile to match your production traffic patterns. Set the duration to match your analysis interval, target the canary service URL, and combine multiple webhook entries to test different endpoints. This ensures Flagger has enough meaningful traffic to evaluate canary health metrics accurately.
