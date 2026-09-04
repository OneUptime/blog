# How to Rate-Limit Kubernetes Event Floods Before They Saturate the API Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Event, Rate Limiting, Admission Control, Kubernetes API Server, Client-go, Monitoring

Description: Stop Kubernetes Event storms at their source, tune producer-side aggregation, and deploy the EventRateLimit admission controller as measured defense in depth.

---

Kubernetes Events are small, but a producer that creates or updates them on every retry can generate thousands of API writes per second. Those writes consume admission capacity, etcd proposals and revisions, watch bandwidth, and storage. If each retry creates a uniquely named Event or changes its message, normal aggregation becomes less effective.

Rate limiting should start at the producer. Server-side EventRateLimit can protect a self-managed kube-apiserver, but it is an alpha admission controller, disabled by default, and it intentionally rejects excess diagnostic data. API Priority and Fairness protects broader API availability; it does not correct an emitter whose retry loop is broken.

## Confirm That Events Are the Load Source

Graph Event requests by verb, response code, API-server replica, and authenticated identity:

```promql
sum by (instance, verb, code) (
  rate(apiserver_request_total{resource="events"}[5m])
)
```

Also correlate kube-apiserver request latency, admission latency, inflight and queued requests, APF rejections, etcd proposal rate and latency, database growth, and Event watch traffic. A large Event count without a high write rate may be a retention problem; a high PATCH or UPDATE rate with a stable count indicates continuously refreshed Event series.

Inspect a bounded sample to name the producer:

```bash
kubectl get events --all-namespaces -o json |
  jq -r '.items[] |
    [(.reportingController // .source.component // "unknown"),
     (.reportingInstance // .source.host // "unknown"),
     .metadata.namespace, .reason, .type,
     .regarding.kind // .involvedObject.kind,
     .regarding.name // .involvedObject.name,
     (.series.count // .deprecatedCount // .count // 1)] | @tsv' |
  sort | tail -200
```

API audit records at `Metadata` level can provide the username, source address, user agent, verb, and request URI. Keep the audit window narrow and avoid recording Event bodies globally. The reporting controller field is supplied by the client; authenticated identity and user agent are stronger attribution evidence.

## Fix the Retry Loop Before Tuning Buckets

An Event should describe an operator-relevant change, not every iteration of a loop. Emit once when a condition changes and, at most, periodically while it remains unresolved. Keep the reason and the aggregation key stable; putting timestamps, random IDs, attempt numbers, or raw errors into every message can defeat correlation.

Bad pattern:

```text
every 100 ms:
    try dependency
    on failure create a new Warning Event with current timestamp
```

Safer pattern:

```text
on condition transition to DependencyUnavailable:
    emit one Warning Event

while unavailable:
    retry with capped exponential backoff and jitter
    update metrics and structured logs
    emit only through a bounded, aggregating recorder

on transition to Available:
    emit one Normal recovery Event
```

Events are best-effort supplemental data. Put high-volume attempt details in rate-limited structured logs and metrics. Do not use Event objects as a message queue or as the only trigger for program logic.

## Use the Standard Event Recorder

The `client-go/tools/record` correlator filters, aggregates, counts, and deduplicates legacy core/v1 Events. Use one process-level broadcaster and recorder rather than directly creating a new Event object for every occurrence. Current clients can also report `events.k8s.io/v1` through `client-go/tools/events`.

If you customize `CorrelatorOptions`, test its `QPS`, `BurstSize`, cache size, aggregation key, and interval against real incidents. A key that is too broad hides distinct failures; a key that includes a changing message produces one bucket per retry. Pin `client-go` to versions compatible with the Kubernetes minors you support.

Also bound the controller's general REST client:

```go
cfg, err := rest.InClusterConfig()
if err != nil {
    return err
}
cfg.UserAgent = "image-controller/v1.8.0"
cfg.QPS = 10
cfg.Burst = 20
```

The REST limiter covers all requests from that config, not just Events. It is a backstop, not a replacement for semantic event suppression. A custom `RateLimiter` overrides `QPS` and `Burst`.

## Tune Built-In Producers Carefully

Some Kubernetes components have their own producer limits. For example, the current KubeletConfiguration API documents:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
eventRecordQPS: 25
eventBurst: 50
```

The values above are examples. The documented defaults are 50 creations per second and a burst of 100; zero QPS means no limit. Change the cluster's versioned kubelet configuration, not an obsolete command-line flag, and roll nodes through the normal management process.

Lowering a producer limit can discard warnings needed for diagnosis. First correct the noisy condition, then load-test normal node transitions, image failures, scheduling problems, and mass restarts to ensure useful Events still get through.

## Configure EventRateLimit as Defense in Depth

Kubernetes includes an alpha validating admission controller specifically for Event create and update requests. It supports four bucket types:

- `Server`: one bucket for all Event requests;
- `Namespace`: one bucket per namespace;
- `User`: one bucket per authenticated user; and
- `SourceAndObject`: one bucket per source and involved object combination.

Create a version-matched configuration file on every API-server host:

```yaml
apiVersion: eventratelimit.admission.k8s.io/v1alpha1
kind: Configuration
limits:
- type: Server
  qps: 200
  burst: 400
- type: Namespace
  qps: 50
  burst: 100
  cacheSize: 2000
- type: SourceAndObject
  qps: 2
  burst: 10
  cacheSize: 10000
```

Then reference it from the kube-apiserver admission configuration:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: EventRateLimit
  path: /etc/kubernetes/event-rate-limit.yaml
```

Enable the plugin and point kube-apiserver at the admission file:

```text
--enable-admission-plugins=EventRateLimit
--admission-control-config-file=/etc/kubernetes/admission.yaml
```

Do not copy the example rates into production. Derive them from observed healthy peaks, failure drills, namespace count, producer identities, API capacity, and the minimum diagnostic coverage you require.

`qps` is the sustained refill rate and `burst` is the maximum accumulated allowance. For per-key limits, `cacheSize` bounds the LRU bucket cache. When a bucket is evicted its allowance resets, so an undersized cache weakens protection under high cardinality. The Server type ignores cache size.

## Roll Out Without Making Admission Inconsistent

Validate the files and paths against the exact Kubernetes minor version. Back up manifests, confirm that the new files are mounted into static Pods, and roll one API-server replica at a time while maintaining etcd quorum and API availability. During a rolling change, clients may hit replicas with different admission behavior, so keep the transition short, monitored, and reversible.

Before production, exercise the plugin in an isolated cluster:

1. Measure normal Event traffic and legitimate bursts.
2. Generate a controlled flood from a dedicated namespace and service account.
3. Confirm excess Event writes are rejected while unrelated reads and critical mutations succeed.
4. Confirm the emitter backs off instead of retrying rejected Events in a tight loop.
5. Verify recovery as token buckets refill.

Alert on Event request codes after rollout. A falling Event count can mean either a healthy source or silent rejection; keep producer error metrics and structured logs.

## Use APF for Broader Isolation

API Priority and Fairness applies to ordinary Event writes and can prevent one service account from starving higher-priority control-plane flows. Match a noisy controller by authenticated identity and give it bounded queuing and concurrency. Inspect the FlowSchema and PriorityLevel UIDs returned in API response headers before changing policy.

APF and EventRateLimit act at different stages. APF manages API concurrency and fairness; EventRateLimit applies token buckets only to Events. ResourceQuota limits how many Event objects exist but does not rate-limit updates and is not a sufficient flood control.

Never classify an untrusted Event producer as exempt. Exempt traffic bypasses normal fairness protections.

## Verify the End-to-End Result

After the source fix and any boundary controls, repeat the failure condition and confirm:

- a stable incident produces a bounded Event series rather than unique objects;
- useful transition and recovery Events remain visible;
- the producer's retries use capped jittered backoff;
- Event write QPS, etcd proposal latency, and database growth stay within budget;
- API p99 latency and critical request success remain normal; and
- rejected Event writes are measured and do not trigger another retry storm.

## Conclusion

The best Event request is the redundant one never emitted. Record state transitions through a standard aggregating recorder, move repeated detail to logs and metrics, and bound component clients. Add the alpha EventRateLimit plugin and APF only as measured safety layers, with explicit acknowledgement that rejected Events are lost diagnostic information.

## Official Documentation

- [Kubernetes Admission Controllers: EventRateLimit](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#eventratelimit)
- [Kubernetes EventRateLimit Configuration v1alpha1](https://kubernetes.io/docs/reference/config-api/apiserver-eventratelimit.v1alpha1/)
- [Kubernetes Event API](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/)
- [client-go Event Recording Package](https://pkg.go.dev/k8s.io/client-go/tools/record)
- [Kubernetes Kubelet Configuration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubernetes API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
