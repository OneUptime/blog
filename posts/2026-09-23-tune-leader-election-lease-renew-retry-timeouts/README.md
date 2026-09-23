# How to Tune Leader-Election Lease, Renew, and Retry Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Leader Election, Go, High Availability

Description: Tune client-go leader-election timing from API latency and shutdown behavior, and keep lease expiry separate from resource fencing.

---

An election that takes twenty seconds to recover can miss an availability target. An election that changes leaders every twenty seconds can be worse. Tune the lease around the delays the system actually experiences, then measure the complete interruption seen by a client.

This walkthrough uses Kubernetes client-go leader election. Patroni and Raft have different timing models; similarly named settings cannot be copied between them.

## Understand the three clocks

In client-go, `LeaseDuration` governs how long a candidate waits without observing the lease record change before attempting takeover. `RenewDeadline` limits how long the current leader retries renewal before giving up. `RetryPeriod` controls the interval between attempts. These meanings come from the [client-go configuration reference](https://pkg.go.dev/k8s.io/client-go/tools/leaderelection#LeaderElectionConfig).

A useful starting configuration fragment is:

```go
LeaseDuration: 30 * time.Second,
RenewDeadline: 20 * time.Second,
RetryPeriod:    4 * time.Second,
```

These are illustrative values, not recommended defaults for every cluster. They allow several renewal opportunities while reserving a gap between the leader's renewal deadline and another participant's takeover window.

The library's [configuration validation](https://github.com/kubernetes/client-go/blob/master/tools/leaderelection/leaderelection.go) requires positive durations, `LeaseDuration > RenewDeadline`, and `RenewDeadline > RetryPeriod * JitterFactor`. In the referenced implementation, `JitterFactor` is 1.2. A configuration can satisfy those inequalities and still fail under actual API delays.

## Measure the renewal path

Collect the latency distribution for Lease GET and UPDATE requests from the worker's location, including authentication, admission, API Priority and Fairness queueing, and storage latency. Record failed requests as failures instead of excluding them from a successful-request percentile.

Also measure runtime pauses, CPU starvation, node scheduling delays, and time spent in the client's rate limiter. A fast API server cannot renew a lease on behalf of a process that has stopped running. Correlate leader transitions with those measurements before attributing them to network latency.

Build a small timing budget:

| Component | Example observed delay | Investigation |
| --- | --- | --- |
| API request | 1.5 seconds at a high percentile | Separate server and client queueing |
| Process pause | 3 seconds during CPU contention | Check limits and runtime pauses |
| Retry opportunity | 4 seconds between attempts | Allow multiple attempts in the deadline |
| Shutdown | 6 seconds for current work | Ensure work stops before handover |

Do not add unrelated percentile values and call the sum a proven percentile. Use traces or a fault drill to observe combined delays. Tail events can be correlated during control-plane incidents.

## Keep recovery time separate from lease duration

Application recovery includes failure detection, acquisition, initialization, readiness propagation, and a client retry. The lease duration is only one input. A thirty-second lease does not promise recovery in exactly thirty seconds: a contender may have observed the last renewal at a different time, and acquisition itself requires an available API server.

Shortening the retry period increases the number of opportunities but also increases coordination traffic. Shortening the renewal deadline makes the current leader abandon its role sooner during a temporary outage. Lengthening both deadlines reduces spurious transitions while increasing the period during which work may be unavailable after a real crash.

Keep configuration consistent across participants. Roll out timing changes deliberately and inspect the mixed-configuration period rather than assuming every Pod switches simultaneously.

## Make the loss-of-leadership path correct

The [package overview](https://pkg.go.dev/k8s.io/client-go/tools/leaderelection) explicitly states that this implementation does not provide fencing. A paused former leader may resume after another participant acquires the lease. External writes need a destination-enforced fencing epoch, transactional ownership check, or an operation design that tolerates duplicate attempts.

Cancel leader work promptly when leadership is lost. Do not continue accepting new tasks while waiting for a long operation to finish. An operation that ignores cancellation still needs protection at the resource it changes.

When `ReleaseOnCancel` is enabled, the API contract requires protected work to finish before cancellation releases the lock. Keep graceful application drain and election cancellation as distinct lifecycle steps. A signal handler that immediately cancels everything can release leadership while work is still running.

## Test before shortening the values

In staging, delay Lease requests, pause the process, saturate a node, and interrupt API connectivity independently. Check the old leader's last accepted effect and the new leader's first effect, not just the log messages announcing the transition.

Record interruption duration, failed renewals, duplicate attempts, stale-epoch rejections, and recovery after connectivity returns. Keep the shortest settings that satisfy both your observed delay envelope and the required recovery objective with headroom.

If the system is Patroni instead, use its documented [dynamic configuration rule](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html): `loop_wait + 2 * retry_timeout <= ttl`, along with its minimum values and watchdog policy. That is a separate algorithm, not a translation of the client-go example.
