# Choose Sequential Retries or Hedged Requests for Tail Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hedged Requests, Retries, Tail Latency, gRPC, Backoff, Load Shedding

Description: Choose sequential retry for observed failures or bounded hedging for rare slow attempts using replay safety, deadline, backend diversity, and load evidence.

---

A sequential retry starts after an attempt fails or times out, normally with backoff. A hedge starts another attempt while the first is still in flight and uses the first acceptable result. Both can improve completion probability, but only hedging targets a slow tail before failure is known, and it does so by adding concurrent load.

Choose from the latency pathology. Do not turn every retry into a hedge because the median is easy to improve in a benchmark.

## Compare the Attempt Timelines

Sequential retry:

~~~text
attempt 1 -------- failure
                      backoff
                              attempt 2 -------- success
~~~

Hedging:

~~~text
attempt 1 -------------------------------- canceled
                 hedge delay
                 attempt 2 -------- success
~~~

Sequential retry conserves backend work while an attempt remains viable. It helps with explicit transient failures and connection races. Hedging spends extra work to escape a rare slow endpoint, queue, network path, or execution.

The common deadline covers the complete chain in both designs.

## Require Replay Safety First

A hedge can execute concurrently with the original. Cancellation of the loser does not undo server work that already committed. Therefore hedge only when:

- the operation is naturally idempotent;
- or the service provides a strong deduplication key shared by every attempt;
- and duplicate reads or computations are acceptable;
- and response selection cannot combine incompatible partial results.

A non-idempotent payment, email send, or resource creation is not made safe by canceling the slower request. Even idempotent writes may double lock, replication, or compute cost.

For streaming RPCs, large uploads, and operations whose request history is expensive to buffer, hedging is usually unsuitable. gRPC must preserve outbound history for another attempt, and an RPC commits for retry purposes once response headers arrive.

## Hedge Only the Tail

Set the hedge delay from a healthy latency distribution, not from the mean. A delay near a high percentile allows most requests to finish once and duplicates only the slow tail.

If the delay is zero, all configured attempts launch together. That is request duplication, not a selective tail hedge. It can multiply normal load.

Track:

~~~text
hedge issue rate
hedge win rate
extra backend work from losing hedges
latency saved when a hedge wins
percentage of losers canceled before server execution
~~~

A high issue rate with a low win rate means the delay is too short, the slow attempts are correlated, or hedging does not address the bottleneck.

## Send Hedges to an Independent Path

A second attempt helps only if its latency is not perfectly correlated with the first. The client or load balancer should be able to select another healthy backend or path. Sending both attempts through the same saturated connection pool, proxy queue, shard, or database lock can double pressure without improving latency.

Independence is not guaranteed by a different IP address. Two endpoints may share the same zone, storage system, or rate limiter. Conversely, a load balancer can route attempts to distinct replicas while keeping one service authority.

Do not use hedging to conceal capacity saturation. If most attempts are slow, almost every request will hedge and increase the overload. Admission control, concurrency limits, or load shedding must restore spare capacity first.

## Use gRPC Hedging Policy Deliberately

gRPC Service Config can define hedging per method:

~~~json
{
  "methodConfig": [
    {
      "name": [
        {
          "service": "catalog.v1.Catalog",
          "method": "GetItem"
        }
      ],
      "hedgingPolicy": {
        "maxAttempts": 3,
        "hedgingDelay": "0.050s",
        "nonFatalStatusCodes": [
          "UNAVAILABLE"
        ]
      }
    }
  ]
}
~~~

The official gRPC guide states that values above five for hedging <code>maxAttempts</code> are treated as five. Support varies by language, and the resolver must actually deliver the service config.

For a non-fatal status, the next unsent hedge can be issued immediately instead of waiting through its remaining hedge delay. A fatal status cancels outstanding hedges and ends the call. A successful response cancels outstanding attempts and is returned.

The call deadline applies to the entire hedge sequence. Server retry pushback can delay or suppress further hedges. gRPC retry throttling limits extra attempts when failures become widespread.

## Choose Sequential Retry for Explicit Failure

Sequential retry is the safer default when:

- the server quickly returns a documented transient error;
- dependency recovery benefits from backoff;
- duplicate concurrent load is expensive;
- the attempt is a write whose idempotency contract permits repetition but not concurrent execution;
- endpoints share the same bottleneck;
- the caller can tolerate waiting for failure detection.

Use bounded exponential backoff with jitter or valid server timing. Add retry tokens so a large failure wave cannot sustain repeat traffic at the cap.

An aggressive per-attempt timeout is not a free substitute for hedging. If normal tail requests are canceled too early, sequential retries can produce the same duplicate work after timeout while also waiting longer. Tune from healthy latency and server cancellation behavior.

## Use a Shared Extra-Attempt Budget

Retries and hedges should consume a common amplification budget. If a call launches two hedges and all fail, do not automatically start a separate multi-attempt sequential loop unless the total policy explicitly allows it.

At fleet level, cap:

- maximum attempts per logical call;
- fraction of calls allowed to hedge;
- concurrent extra attempts;
- retry or hedge tokens per destination;
- total deadline and payload bytes duplicated.

Prefer adaptive suppression when a service is unhealthy. gRPC retry throttling is designed to pause retries or hedges as failures consume tokens and successes restore them gradually.

## Run a Controlled Experiment

Compare three policies under the same traffic:

1. one attempt;
2. sequential retry after explicit failure;
3. one delayed hedge for eligible reads.

Measure logical p50, p95, p99, success rate, attempts per call, backend CPU, queue time, bytes, cancellations, and downstream work completed after client cancellation. Include healthy operation, one slow replica, correlated regional slowdown, and full overload.

Hedging is justified when tail latency falls materially, added load remains within budget, and the improvement survives correlated-failure tests. Disable it automatically or operationally when the backend loses spare capacity.

## Official Documentation

- [gRPC request hedging guide](https://grpc.io/docs/guides/request-hedging/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC Service Config guide](https://grpc.io/docs/guides/service-config/)
- [gRPC OpenTelemetry metrics](https://grpc.io/docs/guides/opentelemetry-metrics/)

## Conclusion

Sequential retries react to known transient failure and normally create less concurrent load. Hedging can cut rare tail latency when attempts are safe to duplicate and reach independent capacity, but it must start late enough to affect only the tail and share a strict extra-attempt budget with all other retries.
