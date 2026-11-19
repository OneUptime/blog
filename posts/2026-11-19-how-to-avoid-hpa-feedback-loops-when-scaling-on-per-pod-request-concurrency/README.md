# How to Avoid HPA Feedback Loops When Scaling on Per-Pod Request Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Design per-Pod request-concurrency metrics that decrease as capacity increases and avoid double normalization, hidden queues, and downstream overload loops.

---

Request concurrency can reveal pressure before CPU saturates. It can also produce an unstable HPA if the metric is duplicated across Pods, divided twice, or dominated by a slow downstream service that extra replicas cannot fix.

A useful scaling signal needs a clear relationship with capacity: at fixed offered load, adding ready replicas should reduce the measured concurrency per replica.

## Define what one in-flight request means

Choose where a request enters and leaves the gauge. For example, increment when the application accepts a request and decrement when processing finishes or cancellation cleanup completes. Use a `finally` or equivalent cleanup path so exceptions do not leave the count permanently elevated.

Decide whether queued requests are included. A gauge limited to active worker slots can plateau while a hidden queue grows. Conversely, including abandoned work after clients time out can inflate demand. Document these semantics before configuring an adapter.

For a balanced service with four ready Pods carrying `[30, 50, 40, 40]` requests, the average is 40. With a target of 20, the basic recommendation is:

```text
ceil(4 × 40 / 20) = 8 replicas
```

If eight ready Pods can share the same 160 in-flight requests, their average becomes 20. This is the negative feedback the HPA expects. The [HPA API definition](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/autoscaling/v2/types.go) explicitly calls out the relationship between metric values and replica count.

## Expose one value per selected Pod

Use a Pods metric when the adapter can return a genuine value for each Pod:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  minReplicas: 4
  maxReplicas: 24
  metrics:
    - type: Pods
      pods:
        metric:
          name: requests_in_flight
        target:
          type: AverageValue
          averageValue: "20"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

This assumes an adapter already exposes `requests_in_flight` through the custom metrics API. The name is an example, not a built-in Kubernetes metric.

```bash
kubectl get --raw \
  '/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/requests_in_flight?labelSelector=app%3Dcheckout'
```

Use the API version your adapter serves. Check that each returned object identifies the intended Pod, timestamps advance, and values match application observations. A ready idle Pod should report a real zero; an unreachable Pod should not be silently converted to zero.

## Avoid normalizing the same measurement twice

If your source only provides service-wide concurrency, an External or Object metric with `AverageValue` may be appropriate. Send the total and let the HPA perform the per-replica interpretation.

Do not divide that total by replicas in the adapter and then configure `AverageValue` for the shared metric. That introduces a second division and can recommend too little capacity. Equally, do not attach the same global total to every Pod: HPA would interpret each value as that Pod's own concurrency.

Test normalization with a small, known dataset before deployment. For a total of 160 and a per-replica target of 20, the intended unconstrained answer is eight regardless of whether the current fleet contains four or six healthy replicas.

## Check whether extra replicas can relieve the pressure

Concurrency grows with arrival rate and time spent in the system. A slow database can therefore increase application concurrency even if request arrivals are unchanged. Adding application replicas may open more database connections and make the bottleneck worse.

Measure downstream latency, connection-pool waits, retries, and queue time alongside concurrency. Bound outstanding work, configure request deadlines, and choose a replica ceiling compatible with downstream capacity. A CPU metric can provide another signal, but multiple HPA metrics choose the largest recommendation; they do not implement a veto that protects the database.

Long-lived connections and sticky routing create another limitation. New Pods do not necessarily receive existing sessions, so average concurrency can remain uneven until clients reconnect. Inspect the busiest Pod as well as the average.

## Validate the loop under controlled traffic

Hold arrival rate steady and increase available capacity in a test environment. Confirm that per-Pod concurrency falls and useful throughput remains healthy. Then run a step increase, a downstream slowdown, a single hot Pod, a metrics interruption, and load removal.

The [HPA algorithm documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#algorithm-details) explains why missing samples and tolerance can change the simple arithmetic. Compare ready replicas and source timestamps before calling a delayed response a controller failure.

Success means more ready Pods reduce pressure without increasing errors or overwhelming dependencies. If the signal does not respond that way, change the measurement or workload distribution before making scale-up more aggressive.
