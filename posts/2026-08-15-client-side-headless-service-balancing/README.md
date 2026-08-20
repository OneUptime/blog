# Why Headless Services Do Not Load-Balance Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, Client-Side Load Balancing, DNS, EndpointSlice, Service Discovery

Description: Understand the direct-endpoint contract of a headless Service and build client selection, retry, pooling, and health behavior around it.

---

A headless Service is discovery, not a virtual load balancer. Setting `clusterIP: None` prevents Kubernetes from allocating a Service IP; kube-proxy does not handle the Service, and the platform does not proxy or load-balance its connections.

Cluster DNS instead returns the addresses of published endpoints. The client chooses an address and connects to that Pod directly.

## Compare the Two Connection Paths

For a normal ClusterIP Service:

~~~text
client -> Service ClusterIP -> kube-proxy or equivalent -> ready endpoint
~~~

For a headless Service:

~~~text
client -> DNS A/AAAA RRset -> client chooses one Pod IP -> Pod
~~~

The headless manifest is intentionally small:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: workers
  namespace: compute
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: worker
  ports:
    - name: rpc
      protocol: TCP
      port: 9000
      targetPort: rpc
~~~

A query can return several direct addresses:

~~~bash
dig +noall +answer workers.compute.svc.cluster.local. A
~~~

Kubernetes documentation expects clients to consume the set or use ordinary round-robin selection from it. Returning an RRset does not mean that Kubernetes observes load, preserves sessions, retries failures, or assigns one answer to each request.

## Do Not Treat the First DNS Answer as a Load Balancer

Several layers may preserve or reorder an RRset. CoreDNS can use its `loadbalance` plugin to randomize answer order, a node-local cache can reuse an answer, and an application resolver can retain its own copy. Even a well-shuffled list can become skewed when every client opens one long-lived connection to its first address.

Avoid this pattern:

~~~text
resolve once at process startup
choose addresses[0]
open one permanent connection
never re-resolve
~~~

It concentrates traffic, misses replacements, and turns one Pod replacement into a client outage.

## Choose an Algorithm That Matches the Workload

For equivalent stateless backends, useful client-side choices include:

- random selection from the current healthy candidate set;
- round-robin selection across new connections;
- least-loaded or power-of-two selection when trustworthy live load data exists;
- latency-aware selection with slow, bounded adaptation;
- consistent or rendezvous hashing when a key should remain near one member.

These policies have different failure behavior. Consistent hashing reduces remapping when membership changes, but it can overload a reduced set unless capacity and replicas are modeled. Latency-only selection can amplify a transient advantage and starve other replicas. Round robin is predictable but does not account for unequal work.

For stateful peers, arbitrary balancing may be wrong. A database driver may need to distinguish primary and replicas, while a quorum client may need to contact a specific member. Use DNS to discover candidates, then apply the system's protocol and role semantics.

## Refresh Membership Without Creating a DNS Storm

A discovery loop should retain the last usable set while refreshing at a controlled interval:

~~~text
on startup:
  resolve A and AAAA
  require at least one usable endpoint

periodically and after meaningful failures:
  resolve again
  add new addresses to the candidate set
  stop assigning new work to removed addresses
  drain removed-address connections within a bound

for each new connection:
  choose from usable candidates
  connect with a deadline
  try a different candidate after a retryable failure
~~~

Respect the DNS TTL as an upper hint for when cached data expires, but do not make every request query DNS. Add jitter so thousands of clients do not refresh simultaneously. Coalesce concurrent refreshes inside one process.

When a refresh fails temporarily, keeping a recently working set is often safer than replacing it with an empty set. Bound how long stale state remains eligible, and distinguish `NXDOMAIN`, `NOERROR`/`NODATA` (no A or AAAA answers), timeout, and `SERVFAIL` in metrics and logs.

## Make Connection Pools Membership-Aware

DNS selection happens when a connection is opened. Protocols with pooling or multiplexing can send many requests over that connection:

- HTTP keep-alive keeps sequential requests on a socket;
- HTTP/2 and gRPC multiplex concurrent streams;
- database drivers maintain per-host pools;
- message clients can keep sessions for hours.

Balance new connections, not just name lookups. Give pools a maximum connection lifetime or another rebalancing policy, stop adding work to removed endpoints, and let in-flight operations finish when safe.

Do not churn every healthy connection at each DNS refresh. Membership-aware draining should react to actual set changes and preserve enough overlap to avoid synchronized reconnects.

## Retry Across Endpoints Safely

When a connection attempt fails, retry a different endpoint rather than repeatedly selecting the same cached first address. Track attempted candidates for the operation and re-resolve after exhausting the current set.

Application requests need stricter rules:

- carry one overall deadline across all attempts;
- retry only errors the protocol defines as retryable;
- use idempotency keys for operations that can be duplicated;
- cap attempts and use jittered backoff;
- apply per-endpoint circuit breaking without permanently hiding recovered Pods;
- avoid retrying every request into the remaining replicas during a rollout.

A TCP connection failure is normally safe to retry before a request is sent. A connection loss after bytes were accepted can have an ambiguous outcome. The client needs application-level semantics, not just a new IP.

## Use SRV When the Client Supports It

A named Service port produces an SRV record:

~~~bash
dig +noall +answer \
  _rpc._tcp.workers.compute.svc.cluster.local. SRV
~~~

For a headless Service, each SRV answer includes an endpoint target and port. This is useful when the client library supports SRV discovery. It still does not turn DNS into an active health checker or load monitor, and many libraries ignore SRV entirely.

Test the actual client implementation. Do not assume a configuration field labeled `host` will issue SRV queries.

## Prefer a ClusterIP Service for Ordinary Clients

Use a normal Service when:

- backends are interchangeable;
- clients should not implement endpoint selection;
- stable virtual addressing is more important than member identity;
- Kubernetes readiness should govern new connections centrally;
- every language-specific client should share the same routing contract.

Use a headless Service when clients genuinely need individual addresses, stable StatefulSet Pod names, protocol-native discovery, or application-aware selection.

It is common to use both: a headless Service for peer identity and a ClusterIP Service for ordinary client traffic.

## Observe Distribution and Convergence

Measure behavior at both client and server:

- connections and requests per endpoint;
- candidate-set size and DNS refresh outcome;
- address age and time since last successful refresh;
- connection attempts, failures, and retry targets;
- pool size and connection lifetime per endpoint;
- endpoint additions and removals;
- traffic skew and saturation during rollouts.

Test with long-lived connections. A short request benchmark that opens a new socket every time can make DNS rotation look much more balanced than production.

## Official Documentation

- [Kubernetes headless Service behavior](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes DNS A, AAAA, and SRV records](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes virtual IPs and Service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [CoreDNS loadbalance plugin](https://coredns.io/plugins/loadbalance/)

## Conclusion

A headless Service publishes endpoint addresses and leaves connection choice to the client. Consume the full RRset, refresh it without synchronized polling, make pools react to membership, and retry different endpoints with application-safe semantics. If clients do not need that responsibility, give them a normal ClusterIP Service instead.
