# How to Prevent Knative Scale-to-Zero Cold Starts from Causing Event Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Serving, Knative Eventing, Scale to Zero, Cold Start, Retries, Autoscaling

Description: Keep event subscribers within their acknowledgement deadline by controlling minimum scale, warm retention, startup readiness, activation capacity, and retry timing.

---

Knative Serving can scale a Revision to zero. When a request arrives, the Activator works with the autoscaler to bring up Pods and route buffered traffic. A cold start becomes an Eventing retry when the subscriber does not produce a successful response before the applicable connection or request deadline.

Retries are still possible after any tuning because networks and processes fail. The goal is to make normal scale-from-zero behavior fit inside the delivery contract and keep duplicate handling safe.

## Prove the Retry Is a Cold Start

Correlate one CloudEvent `(source, id)` across Eventing and Serving:

```bash
kubectl get ksvc order-worker -n production
kubectl get revision -n production \
  -l serving.knative.dev/service=order-worker
kubectl get pods -n production -w
```

After the Revision reaches zero, send one known event and record:

- time of the first delivery attempt;
- time a Pod is scheduled;
- image-pull and container-start times;
- readiness time;
- subscriber start, commit, and response times;
- Eventing timeout, response code, and next attempt.

Cold start is confirmed when retries coincide with a zero-replica Revision and the first Pod becomes ready after the sender's usable deadline. If a ready Pod received the first request promptly, diagnose application latency, overload, mesh policy, or dependency failure instead.

## The Strongest Fix: Keep One Replica Ready

For latency-sensitive event consumers, set a Revision lower bound:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-worker
  namespace: production
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "1"
    spec:
      containers:
        - name: worker
          image: registry.example.com/order-worker@sha256:REPLACE_WITH_DIGEST
```

The annotation belongs under `spec.template.metadata.annotations`, so it applies to the Revision. With KPA and scale-to-zero enabled, the default minimum is zero; `min-scale: "1"` trades a small constant compute cost for a warm delivery target.

Use more than one minimum replica only for measured availability or baseline-throughput requirements. A warm Pod can still be unhealthy, so readiness, capacity, and dependency design remain important.

## Keep Warm for Expected Traffic Gaps

If traffic has short idle gaps but a permanent replica is too expensive, delay scale-down:

```yaml
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/scale-down-delay: "15m"
```

`scale-down-delay` is supported by the KPA autoscaler and can be configured from zero to one hour. The Revision can eventually reach zero, but a new event within the delay avoids a cold start.

Knative also provides:

```yaml
autoscaling.knative.dev/scale-to-zero-pod-retention-period: "5m"
```

That setting controls the minimum period the last Pod remains after the autoscaler decides to go to zero. Understand its interaction with the cluster-wide scale-to-zero grace period before combining it with scale-down delay. Choose values from observed inter-arrival times, not guesswork.

## Start Enough Capacity for a Burst

One cold Pod can become a second failure mode when a backlog arrives at once. The KPA annotation:

```yaml
autoscaling.knative.dev/activation-scale: "3"
```

sets the minimum target when a Revision scales up from zero. It does not keep Pods warm and it does not make an individual Pod start faster. It helps when the activation request represents the front of a burst that needs several replicas immediately.

Set container concurrency and resource requests from load tests. If concurrency is too high, the first Pod accepts more events than its dependencies can handle; if too low, the Activator queues more work and acknowledgement latency grows.

## Make Startup and Readiness Honest

Reduce work on the critical startup path:

- use small images and immutable digests;
- ensure nodes can pull the image without cold registry authentication;
- avoid long blocking initialization that can be lazy or cached;
- set realistic CPU and memory requests, and avoid CPU limits that throttle startup;
- remove unnecessary init containers;
- keep DNS, Secret, volume, and sidecar initialization observable.

Configure probes so traffic arrives only when the handler can succeed:

```yaml
spec:
  template:
    spec:
      containers:
        - name: worker
          image: registry.example.com/order-worker@sha256:REPLACE_WITH_DIGEST
          startupProbe:
            httpGet:
              path: /startup
              port: 8080
            periodSeconds: 1
            failureThreshold: 60
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 2
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            periodSeconds: 10
```

A probe that reports ready before database pools, credentials, or required state are usable converts a cold start into immediate `5xx` responses. A probe that waits forever for a nonessential dependency prevents all traffic. Define the contract precisely.

Knative advises including the same health check used for liveness in readiness, because the queue-proxy does not rewrite liveness probes; otherwise Kubernetes may restart a container while Knative still considers it ready.

## Align Delivery and Serving Deadlines

List every timer in the path:

```text
Broker/Channel delivery timeout
Serving request and response-start timeout
service-mesh or gateway timeout
application server timeout
downstream client timeout
```

The shortest effective deadline wins. It must exceed a high percentile of:

```text
activation + image pull + startup + readiness + request processing
```

Current Knative documentation classifies `DeliverySpec.timeout` (`delivery-timeout`) as Beta and enabled by default. It sets the timeout for each sent HTTP request. Still verify the installed Eventing release and the chosen Broker or Channel implementation before relying on it, because clusters can run older releases and delivery capabilities remain implementation-specific.

Increasing timeouts alone can hide an excessively slow startup and retain dispatcher work for longer. Prefer a warm minimum or startup optimization when low latency is an explicit requirement.

## Keep Retries as a Safety Net

Use bounded exponential backoff and a dead letter sink:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created
  namespace: production
spec:
  broker: orders
  filter:
    attributes:
      type: com.example.order.created.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-worker
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT2S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: order-dead-letter
```

Backoff should give activation time to finish instead of sending several attempts into the same cold interval. A dead letter sink prevents an unusually slow or broken Revision from holding the event indefinitely.

Do not use `retry: 100` as a warming mechanism. It amplifies load, increases duplicates, can block later events on ordered partitions, and delays operator visibility.

## Acknowledge Durably and Idempotently

A timeout is ambiguous: the subscriber may commit just before the sender gives up. The next attempt then sees a duplicate. Store the CloudEvent `(source, id)` with the business result in one transaction, and return `2xx` after commit.

For asynchronous work, durably enqueue the event and then return `202`; do not start an untracked background goroutine and acknowledge. For genuinely long-lived work, use a `JobSink` or a durable job orchestrator rather than keeping the Eventing HTTP request open.

## Validate the Cold Path Continuously

Run a canary test that deliberately waits for zero replicas, sends one event, and verifies:

1. activation completes within the chosen deadline;
2. the first attempt succeeds, or the expected single retry succeeds;
3. business state changes once;
4. backlog drains after a burst;
5. warm-retention and minimum-scale policies survive a new Revision rollout.

Track activation latency, ready-Pod count, subscriber response latency, Eventing retries, timeouts, duplicate hits, and dead letters together. That makes cold starts visible as a capacity decision instead of an unexplained delivery failure.

## Official Documentation

- [Knative Serving scale bounds, minimum scale, and activation scale](https://knative.dev/docs/serving/autoscaling/scale-bounds/)
- [Knative Serving scale-to-zero retention](https://knative.dev/docs/serving/autoscaling/scale-to-zero/)
- [Knative Serving request flow and Activator](https://knative.dev/docs/serving/request-flow/)
- [Knative Serving probe configuration](https://knative.dev/docs/serving/services/configure-probing/)
- [Knative Eventing delivery failure and retries](https://knative.dev/docs/eventing/event-delivery/)
- [Knative `DeliverySpec.timeout` field](https://knative.dev/docs/eventing/features/delivery-timeout/)
