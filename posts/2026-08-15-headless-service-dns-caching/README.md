# Handle DNS Caching During Headless Service Rolls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, DNS Cache, CoreDNS, NodeLocal DNSCache, Rolling Update

Description: Trace every DNS and connection cache that can retain old Pod IPs, then design headless Service rollouts for bounded convergence.

---

When a Pod behind a headless Service changes, Kubernetes can update its EndpointSlice quickly while a client still uses the old IP. The stale value can live in CoreDNS, a node-local DNS agent, an operating-system resolver, an application cache, or an already-open connection.

Treat DNS convergence as a chain of caches, not one cluster-wide timer.

## Map the Resolution Path

A common path is:

~~~text
application cache
  -> language or OS resolver
  -> NodeLocal DNSCache, if installed
  -> CoreDNS cache plugin
  -> CoreDNS kubernetes plugin watch state
  -> Service and EndpointSlice objects
~~~

The DNS response then feeds a connection pool, which can retain a destination beyond DNS expiry. Each layer has separate refresh, failure, and observability behavior.

## Measure the Authoritative Answer First

From a Pod that uses cluster DNS:

~~~bash
dig +noall +answer members.data.svc.cluster.local. A
dig +noall +answer members.data.svc.cluster.local. AAAA
~~~

The number in the answer before `IN` is the remaining TTL seen by that client. Repeat the query to see whether it counts down or resets.

Inspect the CoreDNS configuration rather than assuming a default:

~~~bash
kubectl -n kube-system get configmap coredns \
  -o jsonpath='{.data.Corefile}{"\n"}'
~~~

Keep two CoreDNS settings distinct:

- the `kubernetes` plugin's `ttl` controls the TTL on Kubernetes records; its current plugin default is 5 seconds and allowed values range from 0 through 3600;
- the `cache` plugin stores responses and has separate maximum and minimum TTL controls for successful and denial responses.

Kubernetes StatefulSet documentation also describes installations where negative answers are cached for about 30 seconds. That operational example is not the same as the current CoreDNS `kubernetes` plugin default. The deployed Corefile and the observed answer are authoritative for your cluster.

## Find Node-Local and Pod-Level Caches

Check the resolver used by an application Pod:

~~~bash
kubectl -n data exec app-0 -- cat /etc/resolv.conf
~~~

If the nameserver is a node-local address and the cluster runs the `node-local-dns` DaemonSet, a second CoreDNS-based cache sits in front of the central DNS Service:

~~~bash
kubectl -n kube-system get daemonset node-local-dns
kubectl -n kube-system get configmap node-local-dns -o yaml
~~~

NodeLocal DNSCache improves latency and reduces connection-tracking pressure, but its success and negative cache settings contribute to convergence time. Tune it together with central CoreDNS, not independently.

Finally, inspect the application runtime. Some libraries honor DNS TTLs, some impose minimums, some resolve only when opening a connection, and some cache indefinitely unless configured. Verify behavior with the exact runtime and connection library version used in production.

## Account for Negative Caching

Positive caching retains an old Pod IP. Negative caching creates the opposite failure: a client asks for `db-2.db-peers...` before the Pod exists, caches `NXDOMAIN`, and continues reporting no such host after the Pod starts.

This is especially visible with predictable StatefulSet names. Do not use an aggressive loop that repeatedly queries a not-yet-created ordinal. Use bounded backoff, and ensure denial-cache TTLs match the required bootstrap convergence.

If peer discovery must react faster than the acceptable DNS cache horizon, Kubernetes recommends watching the API directly. An API watch supplies state changes but also requires RBAC, reconnection, resource-version handling, and EndpointSlice aggregation.

## Roll Pods with Readiness and Drain Time

DNS caching cannot be made perfectly instantaneous, so make the rollout tolerant:

1. mark an endpoint ineligible for new client work;
2. keep the old process alive long enough for normal discovery propagation and connection draining;
3. let clients stop assigning new work to addresses removed from refreshed RRsets;
4. bound the lifetime of existing connections;
5. terminate only after in-flight work has completed or reached a safe deadline.

For Pod deletion, Kubernetes marks the EndpointSlice endpoint `terminating: true` and `ready: false`. Default readiness-gated headless DNS stops publishing it, but cached answers remain possible. Do not enable `publishNotReadyAddresses` on a client discovery Service because that setting deliberately keeps unready endpoints publishable.

A fixed sleep equal to one observed TTL is not a proof of safety. Cache refreshes are asynchronous, clients can begin their TTL window at different times, negative and positive settings can differ, and existing sockets ignore DNS entirely.

## Make Clients Reconcile Sets

A headless-aware client should periodically reconcile the newly resolved set with its current candidate and connection sets:

~~~text
added address:
  make eligible after connection and protocol checks

unchanged address:
  retain healthy pools

removed address:
  stop assigning new operations
  drain and close pools within a configured bound

resolution failure:
  retain last-known-good endpoints briefly
  retry with bounded jitter
  alert when stale age exceeds policy
~~~

Avoid resolving on every request. Cache locally for a controlled interval, coalesce refreshes, and add jitter across replicas. A five-second TTL can still create a query storm when thousands of processes refresh on the same boundary.

Long-lived connections need their own rotation controls. Maximum connection age, idle timeout, server drain notices, and failure-triggered eviction often determine convergence more than DNS TTL does.

## Compare API, Central DNS, and Client DNS

During a test rollout, record timestamps for each layer.

First watch endpoint state:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=members -w
~~~

Get the central DNS Service IP and query it directly from a routable Pod:

~~~bash
DNS_SERVICE_IP=$(kubectl -n kube-system get service kube-dns \
  -o jsonpath='{.spec.clusterIP}')

dig @"${DNS_SERVICE_IP}" +noall +answer \
  members.data.svc.cluster.local. A
~~~

Then query through the application's configured nameserver and log the addresses actually chosen by the application. This separates:

- EndpointSlice programming delay;
- CoreDNS watch and cache delay;
- node-local cache delay;
- application resolution delay;
- connection-pool retirement delay.

The CoreDNS kubernetes plugin exposes a DNS programming duration metric, and the cache plugin exposes request, hit, eviction, prefetch, and served-stale metrics. Use those signals with application-side address-age metrics.

## Watch for `serve_stale`

The CoreDNS cache plugin can serve expired entries when `serve_stale` is enabled. This can improve availability during a backend lookup failure, but it intentionally permits stale answers for a configured duration. In `immediate` mode it sends the stale response before refreshing; in `verify` mode it checks the source first, which can add latency.

Review whether serving stale Kubernetes endpoint data matches the failure policy. A stale external name may be acceptable while a stale terminated Pod IP is not. CoreDNS configuration applies at the selected server block and zones, so scope and test the behavior deliberately.

## Test More Than the Happy Path

Exercise:

- one Pod replacement with all other replicas healthy;
- replacement while another replica is unready;
- a lookup before a new StatefulSet ordinal exists;
- CoreDNS restart and delayed Kubernetes watch synchronization;
- NodeLocal DNSCache enabled and disabled;
- long-lived HTTP/2, gRPC, or database connections;
- an application resolver that ignores or floors TTL;
- a DNS timeout while the last-known-good set is still usable.

Measure time from EndpointSlice change to the last new connection using the old IP. That is the operational convergence objective, not merely the DNS answer TTL.

## Official Documentation

- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes StatefulSet DNS and negative caching](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
- [CoreDNS kubernetes plugin TTL](https://coredns.io/plugins/kubernetes/)
- [CoreDNS cache plugin](https://coredns.io/plugins/cache/)

## Conclusion

Headless-Service rollout safety depends on every cache between EndpointSlice and the connection pool. Measure the deployed TTLs, include positive and negative caching, reconcile endpoint sets in the client, and drain old connections. Optimize for the last new connection to a removed IP, not for one fast `dig` response.
