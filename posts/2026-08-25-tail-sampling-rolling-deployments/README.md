# How to Handle Pending Tail-Sampling Decisions During Collector Shutdowns and Rolling Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Kubernetes, Graceful Shutdown

Description: Choose explicit pending-trace shutdown behavior and design rollouts around partial decisions, lost in-memory state, trace-ID remapping, and exporter drain time.

---

Tail sampling is stateful. During a rollout, each Collector can hold thousands of trace IDs whose decision time has not arrived. There is no automatic migration of that state to a replacement replica.

Current Collector Contrib gives shutdown two explicit behaviors through `drop_pending_traces_on_shutdown`.

## Understand the Default Drain

The default is false:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    drop_pending_traces_on_shutdown: false
    decision_wait: 20s
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

With the default `trace-complete` strategy, a normal processor shutdown closes the work channel, stops adding decision batches, and runs the decision path until the queued batches are consumed. It makes the best decision it can from data already ingested. It does **not** wait out the remaining `decision_wait` for more spans.

That means a probabilistic rule can still decide consistently, and an error already present can retain the trace. A later error, final duration, span-count maximum, or drop attribute is absent from the partial view. A sampled output can therefore be incomplete or receive a different classification than it would after the full wait.

The Collector service shuts receivers down before processors in the normal lifecycle, so accepted work can drain. A crash, forced kill, expired termination deadline, or process context cancellation does not provide the same guarantee.

`span-ingest` has different pending semantics in the current implementation. Traces already given a terminal sampled or dropped decision are no longer pending. On timer or default shutdown cleanup, an unresolved pending trace is finalized as not sampled without another policy evaluation. Test this separately if you opt into `sampling_strategy: span-ingest`.

## Choose Drop-All-Pending Deliberately

Setting the option true skips policy evaluation for pending trace batches during shutdown:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    drop_pending_traces_on_shutdown: true
    decision_wait: 20s
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

This avoids exporting traces decided from known-partial state, but it intentionally loses every pending trace, including errors already received. It is appropriate only when partial exports are worse than shutdown-window loss and that loss is measured and accepted.

Neither setting waits for application exporters that have not yet delivered their spans.

## Account for Trace-ID Remapping

The recommended scaled topology uses an upstream load-balancing exporter that routes by trace ID to downstream tail samplers. When the backend endpoint set changes, consistent hashing remaps some trace IDs. A trace can then have early spans on a draining pod and later spans on a new pod.

The old pod's decision cache is not available to the new pod. The new instance can treat the later spans as a new trace, producing a conflicting decision. Adding a replica can remap routes as surely as removing one, so max-surge alone does not eliminate splits.

Reduce the exposure by:

- keeping rollout concurrency low and enough spare capacity for skew;
- giving upstream discovery time to converge and monitoring backend-set changes;
- avoiding frequent autoscaling of the stateful tail tier;
- using stable endpoint membership where practical;
- staggering Collector and policy changes; and
- considering upstream `groupbytrace` when atomically dispatching each buffered trace group after a bounded wait is worth its buffering cost, provided spans for the trace reach the same upstream Collector instance, as suggested by the load-balancing exporter documentation for routing stability.

There is no zero-loss rolling procedure based solely on a termination grace period when spans for one trace can still arrive after its route changes.

## Give Graceful Shutdown Enough Time

Kubernetes `terminationGracePeriodSeconds` starts before any `preStop` hook and must cover:

1. `preStop` hook execution and any routing-drain delay;
2. receiver shutdown and queued ingestion calls;
3. pending-trace evaluation chosen by the shutdown policy;
4. processors after tail sampling;
5. batch flush and any in-memory exporter queue drain; and
6. in-flight and final export attempts up to their configured timeout.

Observe real shutdown duration at peak pending volume. A large forced drain can create a burst of sampled traces and overwhelm the exporter just as the pod is terminating.

A PodDisruptionBudget limits simultaneous eviction-based voluntary disruptions but does not constrain Deployment or StatefulSet rolling upgrades. Separately, waiting for each old pod to finish terminating before starting the next replacement reduces simultaneous state loss. Readiness and endpoint-removal hooks need to be coordinated with the upstream load-balancing resolver; a fixed sleep without evidence of route convergence is not a guarantee.

## Do Not Rely on Tail Storage for Restart Recovery

The alpha Pebble tail-storage extension currently clears its configured database on startup. It can move pending batches off heap during a process lifetime but does not restore them after restart. Decision caches are also in-memory and restart empty.

If restart durability is a requirement, use a replayable durable buffer before the stateful tier and design retention, acknowledgment, and replay semantics explicitly; a normal upstream persistent sending queue cannot reconstruct spans that the tail tier already acknowledged before restarting. Replaying spans after restart still needs stable trace-ID routing and protection against duplicates; current `tail_storage` does not supply that workflow.

## Test Rollouts as a Data-Correctness Event

Use fixed trace IDs and send early and late batches across a controlled pod replacement. Measure:

- final sampled, not-sampled, and dropped decisions;
- exported spans per trace before, during, and after rollout;
- late-span age and cache releases;
- early evictions and policy evaluation errors;
- receiver refusals and exporter failures; and
- pod shutdown duration versus the grace deadline.

Test both shutdown settings. Include an error only in the late batch, a trace that becomes slow only when its final span arrives, and a hard-drop attribute that arrives last. These fixtures expose the exact policy compromises of partial drain.

## Official Documentation

- [Tail-sampling shutdown option and statefulness warning](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [`drop_pending_traces_on_shutdown` configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Tail-sampling shutdown and pending-decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Load-balancing exporter routing and membership behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)
- [Pebble tail-storage restart limitation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/tailstorage/pebbletailstorageextension/README.md#limitations)

## Conclusion

The default shutdown drains pending traces immediately using partial data; `drop_pending_traces_on_shutdown: true` discards them instead. Neither migrates state or waits for future spans. Slow the rollout, budget real exporter drain time, minimize trace-ID remapping, and test policy outcomes across pod replacement as carefully as application data migrations.
