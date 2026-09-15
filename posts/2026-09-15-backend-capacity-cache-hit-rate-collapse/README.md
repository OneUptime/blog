# How to Calculate Backend Capacity When Cache Hit Rates Collapse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Caching, Redis, Performance, Monitoring

Description: Calculate origin load across normal, degraded, and cold-cache states, including fan-out, retries, and a bounded fallback policy.

---

A cache hit rate falling from 95% to 50% does not merely make the backend twice as busy. The miss fraction rises from 5% to 50%, multiplying cache-miss traffic by ten. If the backend was sized around warm-cache behavior, ordinary user traffic can become an overload event.

Build a separate capacity scenario for degraded hits and complete cache loss. The following model is a planning calculation; the safe backend rate must come from representative measurement.

## Define the cache and backend boundaries

Suppose an API receives 10,000 cacheable read requests per second. Each request makes one relevant cache lookup. A hit serves the response without database work; a miss executes two database operations. Uncached endpoints and writes independently consume 500 database operations per second.

Define:

```text
R = cacheable first-attempt requests per second
h = fraction of those requests served by the cache
f = mean backend operations per miss
U = independent uncached backend operations per second

backend demand = R * (1 - h) * f + U
```

The units must match. If `h` measures successful key lookups but a request looks up ten keys, it is not automatically the fraction of requests that avoid database work. Instrument request-level fallback outcomes or model each lookup path separately.

Redis exposes `keyspace_hits` and `keyspace_misses` in `INFO`. These count successful and unsuccessful key lookups in Redis's main dictionary, not completed application requests. [Redis INFO reference](https://redis.io/docs/latest/commands/info/).

## Calculate three operating states

With `R = 10,000`, `f = 2`, and `U = 500`:

| State | Hit rate | Miss requests/s | Backend operations/s |
| --- | ---: | ---: | ---: |
| Warm | 95% | 500 | 1,500 |
| Degraded | 50% | 5,000 | 10,500 |
| Cold | 0% | 10,000 | 20,500 |

The total cold demand is about 13.7 times warm demand. It is less than the 20-fold increase in misses because the independent 500 operations/s do not change.

This small calculation produces the table:

```python
read_rps = 10_000
operations_per_miss = 2
uncached_ops = 500

for hit_rate in [0.95, 0.50, 0.0]:
    misses = read_rps * (1 - hit_rate)
    demand = misses * operations_per_miss + uncached_ops
    print(f"hits={hit_rate:.0%}, misses/s={misses:.0f}, backend/s={demand:.0f}")
```

Use separate rows for expensive and cheap objects when their miss costs differ. A 50% hit rate concentrated on the cheapest keys can consume substantially more backend CPU or I/O than a uniformly distributed 50% hit rate.

## Derive the maximum safe fallback rate

Assume load testing established 6,000 backend operations/s as sustainable for this exact query mix and latency objective. The available cacheable-read allowance is:

```text
R_allowed = (6,000 - U) / ((1 - h) * f)
```

At 50% hits, this gives 5,500 cacheable requests/s. With a cold cache, it gives 2,750/s. Continuing to accept all 10,000 reads would exceed the tested backend budget.

Choose the overload response before a cache failure: serve eligible stale values, reject or defer lower-priority reads, or reserve backend capacity for critical operations. A concurrency limit also needs bounded waiting; otherwise it can protect the database while users accumulate in an unbounded API queue.

Do not substitute current completed backend throughput for sustainable capacity. During saturation, throughput can flatten while latency and outstanding work continue rising.

## Include retries and duplicate fills explicitly

If each cache miss produces an average of `a` backend attempts per planned operation, extend the model:

```text
backend attempt demand = R * (1 - h) * f * a + U
```

This expression assumes `U` already counts its own attempts. Count costs of failed attempts when they are material, and avoid applying amplification twice to measurements that already include retries.

Cold-cache bursts can also trigger many simultaneous fills for the same key. AWS describes request coalescing as a way to reduce concurrent fetches for an uncached resource. Its effect depends on where coordination occurs; one coalesced request per API process can still mean many fetches across a large fleet. [AWS caching challenges and strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/).

Measure backend operations per miss during a simultaneous-key test before claiming that coalescing eliminates the spike. Bound lock wait, fill duration, and fallback retries so a slow fill does not hold unlimited work.

## Measure the transition, not only the endpoints

Capture one-minute rates for normal behavior and finer data around failure and recovery:

- application requests served from cache, stale cache, or origin;
- cache lookup misses, errors, and timeouts as separate outcomes;
- database attempts, useful completions, query latency, and pool wait;
- fill writes and backend operations per original read;
- rejected or deferred requests;
- latency from first request attempt through final outcome.

A cache outage is not necessarily a miss. A client may spend its timeout waiting for Redis and then call the database, increasing in-flight API work even when database RPS matches the cold model. Verify the actual fallback path and timeout policy.

For a Redis interval hit ratio, use changes in hit and miss counters over the same window, handling resets and zero activity. Avoid a lifetime ratio that hides the current collapse. Combine application metrics across the relevant cache shards and tenants; unrelated Redis traffic can obscure the service's behavior.

## Verify controlled cold and recovery scenarios

In an isolated test environment, use a separate cache namespace or test deployment to reproduce cold keys. Replay the same request mix under warm, partially cold, unavailable, and recovered-cache states. Observe the complete interval until the cache is useful again.

Check that admitted backend load stays within the budget, critical endpoints retain capacity, and refill traffic does not prolong overload. Rehearse a rolling application replacement if caches are local to each process. The capacity plan is complete when it states both the backend rate required for a cold cache and the explicit traffic policy used when that rate exceeds available capacity.
