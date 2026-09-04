# How to Benchmark Kubernetes API Server Capacity with Realistic LIST, WATCH, and Mutation Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Benchmark, Load Testing, Performance, Capacity Planning, Observability

Description: Build a reproducible Kubernetes API benchmark that preserves production cardinality, object sizes, client behavior, flow control, and failure recovery while protecting live clusters.

---

An API-server benchmark is useful only if its workload resembles the clients the cluster will run. A tight loop of GET requests measures a client, connection pool, and hot cache; it says little about controllers that warm informers with LIST, hold WATCH streams, update status, execute admission webhooks, and reconnect after a failure.

Define capacity as the highest **offered** workload at which the complete control plane still meets an explicit latency, error, availability, memory, and recovery objective. Run destructive capacity discovery in an isolated cluster with production-like topology, not against the production API endpoint.

## Write the Pass Criteria First

Choose service objectives before looking at results. At minimum specify:

- p50, p95, and p99 end-to-end latency by verb, resource, and scope;
- maximum unexpected error rate, with 409, 410, 429, and 5xx classified separately;
- `/readyz` availability and allowed API-server replica loss;
- maximum kube-apiserver and etcd CPU, memory, disk latency, and network use;
- watch delivery lag and maximum recovery time after disconnect;
- allowed APF queue wait and rejection rate by priority level; and
- cleanup completion and return to the pre-test resource baseline.

Do not use averages as the only gate. A control plane can have good average latency while p99 writes time out. Do not count expected optimistic-concurrency conflicts or intentionally induced 429 responses as success; report them distinctly.

## Reproduce the Production Shape

Inventory the intended cluster:

- Kubernetes, etcd, client-go, and admission component versions;
- number of API-server and etcd replicas, zones, CPU/memory, and disk class;
- object counts and encoded-size distributions per resource;
- namespaces, CRDs, conversion and admission webhooks, encryption at rest, and audit policy;
- APF FlowSchemas and priority levels;
- controller replicas, service accounts, user agents, client QPS/burst, and selectors; and
- load-balancer connection reuse, timeouts, and backend distribution.

Populate the test cluster before measuring. LIST cost depends on existing cardinality and object size, while mutation cost depends on admission, encryption, etcd, and watch fan-out. Ten empty ConfigMaps do not predict 100,000 custom resources with large status fields.

Use generated non-secret payloads. Never clone production Secrets, tokens, customer objects, certificates, or audit logs into a performance environment.

## Use ClusterLoader2 for Repeatable Cluster Load

Kubernetes' `perf-tests` repository provides ClusterLoader2, the official scalability and performance framework. Pin a reviewed commit or release, record the Go toolchain, and keep the test configuration in source control. From the checked-out repository's `clusterloader2` directory, a basic invocation is:

```bash
go run ./cmd/clusterloader.go \
  --testconfig=/bench/config.yaml \
  --provider=kind \
  --kubeconfig=/bench/kubeconfig \
  --report-dir=/bench/results/run-001 \
  --v=2
```

Use the provider appropriate to the isolated cluster. The upstream load configuration creates and scales Deployments, Jobs, StatefulSets, Services, Secrets, and ConfigMaps and includes API responsiveness measurements when Prometheus is available. Treat it as a calibrated baseline, then add modules for your CRDs, sizes, admission paths, and traffic mix.

ClusterLoader2 phases can use QPS or stepped load and can start/gather measurements around them. Keep the exact config and overrides with each result; a throughput number without its object templates and initial state is not reproducible.

## Model LIST Traffic Explicitly

Include several list shapes with independent client identities:

| Pattern | Example purpose | Important variables |
| --- | --- | --- |
| Initial informer state | Controller startup | GVR, namespace, selectors, replicas, object bytes |
| Paginated unfiltered LIST | Inventory job | `limit`, page count, encoding, client think time |
| Filtered LIST | Scheduler or node-like client | field/label selector and fetched-to-returned ratio |
| Metadata-only LIST | Discovery/index job | negotiated media type and object count |
| Human wide/YAML LIST | Operational burst | response size, compression, slow consumer behavior |

Follow Kubernetes API semantics. A paginated client must reuse each exact `continue` token while keeping group/version/resource, namespace, selectors, and limit semantics unchanged. If the token expires with 410, restart the collection instead of joining snapshots.

For metadata-only clients, negotiate `PartialObjectMetadataList`. For built-in resources, test Kubernetes Protobuf with JSON fallback; CRDs and aggregated APIs do not universally support Protobuf. Record `Accept`, `Accept-Encoding`, `resourceVersion`, `limit`, and selectors in the result.

Run fixed-rate arrival schedules as well as closed-loop workers. A closed-loop client waits for each response before sending the next and therefore reduces offered load when the server slows, hiding queue growth through coordinated omission.

## Model WATCH Lifecycles, Not Just Open Connections

A realistic watch actor should:

1. establish initial state using the client version's normal LIST or streaming-list path;
2. continue from the returned resource version;
3. request bookmarks where appropriate without assuming a fixed delivery interval;
4. consume events at a realistic rate and update its local cache;
5. reconnect from the last observed version after an ordinary disconnect; and
6. relist with jittered backoff after a genuine `410 Gone`.

Measure active streams, events delivered per second, bytes, decode CPU, time from committed mutation to observer, reconnect attempts, relists, and missed recovery objectives. Include quiet watches and high-churn resources. A thousand idle watches stress different paths from a hundred watches receiving every Pod update.

Test synchronized failure deliberately in isolation: terminate connections, withdraw one API-server backend, and restore it. Do not force resource-version expiration or kill control-plane members in production. Confirm clients spread recovery through jitter and do not cause a relist storm.

## Model Mutations and Conflicts

Mix operations in proportions taken from production telemetry:

- CREATE and DELETE for short-lived objects;
- PATCH or UPDATE of controller-owned spec and status fields;
- server-side apply by distinct field managers;
- Lease renewals and Event updates where representative; and
- admission-allowed and intentionally denied writes.

Use stable object-size distributions, including realistic managed fields. Exercise mutating and validating webhooks, CRD conversion, quotas, authorization, encryption at rest, and audit logging exactly as capacity planning requires.

Measure client latency from before request submission through body consumption, not only server handler duration. Record conflicts and retry count separately: automatic retries can make a benchmark look successful while multiplying offered traffic. Include think time and per-client QPS/burst that match real libraries.

Use dedicated namespaces, service accounts, and labels so cleanup and attribution are exact. Never benchmark with `system:masters` credentials or classify load-generator traffic as APF exempt.

## Ramp Through Defined Phases

A useful run has explicit phases:

1. **Baseline:** no generated traffic; capture steady resource use and background API rate.
2. **Warm-up:** populate objects and allow caches, admission endpoints, and Go runtimes to stabilize.
3. **Steady state:** hold the expected production mix long enough to include compaction, snapshots, certificate checks, and garbage collection.
4. **Ramp:** increase offered LIST/WATCH/mutation load in small fixed steps.
5. **Burst:** simulate a rollout, operator action, or controller restart within an approved maximum.
6. **Failure and recovery:** remove one backend or interrupt watches, then measure convergence.
7. **Cool-down and cleanup:** stop clients, delete test namespaces through the API, and verify resource use returns near baseline.

Repeat each point enough times to quantify run-to-run variation. Randomize safe actor start offsets while keeping a seed for reproducibility. Stop a run immediately if etcd loses quorum, storage approaches quota, the API loses its safety availability floor, or cleanup identity escapes the dedicated scope.

## Observe Every Bottleneck

From kube-apiserver, collect at least:

- `apiserver_request_total`, request duration, SLI duration, and response sizes;
- current inflight and long-running requests;
- APF in-queue, seat, queue-wait, dispatch, and rejected-request metrics;
- admission webhook duration and rejection metrics;
- watch events, cache LIST fetched/returned objects, and cache initialization metrics;
- process CPU, resident/working-set memory, Go heap/GC, goroutines, and restarts; and
- `/readyz` per replica plus load-balancer backend state.

From etcd, collect proposal pending/failed/applied counters, gRPC rates, peer failures and bytes, leader changes, database total and in-use size, quota alarms, and histograms for `etcd_disk_wal_fsync_duration_seconds` and `etcd_disk_backend_commit_duration_seconds`. etcd documents network round-trip and durable disk sync as fundamental consensus latency bounds.

From the load generator, collect offered rate, completed rate, full latency histograms, response bytes, connection/TLS behavior, error bodies/statuses, retry count, watch lag, and client CPU/memory. Ensure Prometheus scraping itself does not become a material part of the test.

## Locate Capacity and Preserve Headroom

At each step, compare offered rate with completed throughput. Capacity is near the first sustained point where an objective fails or backlog grows without recovering, not where the process finally crashes. Common knees include:

- APF queue wait rising before 429 rejections;
- mutation latency tracking etcd fsync or backend commits;
- memory rising with concurrent large LIST responses;
- admission webhook p99 dominating write latency;
- client-side throttling limiting offered traffic; and
- load-balancer concentration on one API-server replica.

Repeat around the knee with smaller steps. Report capacity for the tested mix, then apply organizational failure and growth headroom. A result such as 800 requests per second is meaningless without the verb/resource distribution, object set, watch fan-out, SLO, and failure state.

## Compare Changes One at a Time

Use the same seed and populated snapshot when comparing API-server CPU, memory, replica count, Kubernetes versions, feature gates, APF rules, storage media type, or admission changes. Record whether current streaming collection encoding, streaming lists, and cache features are enabled; these can materially change LIST memory and etcd traffic.

Do not tune the benchmark until it passes. If the test is unrealistic, revise the workload model and rerun both baseline and candidate. Keep raw results, configuration, component manifests, image digests, and dashboards long enough to reproduce decisions.

## Conclusion

Real API capacity is the interaction of object state, LIST representation, watch recovery, mutation durability, admission, flow control, and client behavior. Build the test from production telemetry, use ClusterLoader2 for a repeatable base, add explicit LIST/WATCH actors, ramp fixed offered load, and declare capacity at the first SLO breach with failure headroom. Keep every destructive run isolated and exactly scoped.

## Official Documentation

- [Kubernetes ClusterLoader2](https://github.com/kubernetes/perf-tests/tree/master/clusterloader2)
- [Kubernetes ClusterLoader2 Getting Started](https://github.com/kubernetes/perf-tests/blob/master/clusterloader2/docs/GETTING_STARTED.md)
- [Kubernetes Upstream Load Test Configuration](https://github.com/kubernetes/perf-tests/blob/master/clusterloader2/testing/load/config.yaml)
- [Kubernetes API Concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [etcd Metrics](https://etcd.io/docs/v3.6/metrics/)
- [etcd Performance](https://etcd.io/docs/v3.6/op-guide/performance/)
