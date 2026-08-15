# Tune CoreDNS TTLs for Fast Headless Service Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS Cache, Headless Service, TTL, DNS Performance

Description: Tune authoritative, success, and denial TTLs while measuring convergence, CoreDNS load, client behavior, and stale-answer risk.

---

Lower DNS TTLs can make a headless Service converge faster after a Pod changes, but setting every cache to zero trades stale-answer risk for CPU, network, and synchronized query load. Tune from an explicit convergence objective and measure the complete resolver path.

CoreDNS has two separate controls that are often confused:

- the `kubernetes` plugin assigns a TTL to records generated from Kubernetes objects;
- the `cache` plugin decides how long CoreDNS stores successful and denial responses.

NodeLocal DNSCache and application resolvers can add more cache layers beyond both.

## Inspect the Current Corefile and Answers

Read the effective CoreDNS configuration:

~~~bash
kubectl -n kube-system get configmap coredns \
  -o jsonpath='{.data.Corefile}{"\n"}'
~~~

Query a representative headless Service repeatedly:

~~~bash
for i in 1 2 3 4; do
  dig +noall +answer members.data.svc.cluster.local. A
  sleep 1
done
~~~

Record:

- the TTL returned to clients;
- whether it counts down or resets;
- positive and negative query behavior;
- whether the Pod uses a node-local nameserver;
- when applications actually replace removed addresses;
- when existing connections stop using removed addresses.

The CoreDNS `kubernetes` plugin currently defaults to a five-second TTL and accepts values from 0 through 3600. A distribution or cluster operator can override that. Always treat the observed Corefile and answer as the local truth.

## Set the Kubernetes Record TTL Deliberately

The `ttl` directive belongs inside the `kubernetes` block:

~~~text
kubernetes cluster.local in-addr.arpa ip6.arpa {
    pods insecure
    fallthrough in-addr.arpa ip6.arpa
    ttl 5
}
~~~

This makes Kubernetes-plugin responses carry a five-second TTL. Setting it to `0` prevents those records from being cached according to the plugin contract, but it also removes an important protection against repeated queries. Some application resolvers can impose their own caching policy regardless, so TTL zero does not prove instant client convergence.

Keep the authoritative TTL short enough for the rollout objective and long enough to absorb ordinary request volume. Five seconds is an example starting point, not a universal recommendation.

## Bound Positive and Negative Caching Separately

The `cache` plugin supports separate `success` and `denial` caches. This aggressive example keeps both bounded while allowing upstream TTLs below the maximum:

~~~text
cache {
    success 9984 5 0
    denial 9984 2 0
    servfail 0
}
~~~

The arguments are:

~~~text
success CAPACITY MAX_TTL MIN_TTL
denial  CAPACITY MAX_TTL MIN_TTL
~~~

Here, successful responses are cached for at most five seconds and denial responses for at most two. A minimum of zero avoids extending a shorter source TTL. `9984` is divisible by 256, matching the cache's shard structure.

`servfail 0` disables the cache plugin's default short caching of `SERVFAIL`. That makes recovery visible sooner but can amplify queries during a DNS or API synchronization failure. Omit that override if the default failure dampening better matches the availability policy.

The top-level cache TTL and per-type TTLs are maximums. A maximum does not extend a record whose source TTL is already lower. By default, the success and denial minimum TTL is five seconds, so set the minimum explicitly when sub-five-second convergence is intentional.

Short denial caching matters for predictable StatefulSet names. If a client asks for `db-3.db-peers...` before the Pod exists, an `NXDOMAIN` answer can hide the new Pod until the denial cache expires.

## Treat `serve_stale` and `keepttl` as Policy Choices

The cache plugin's `serve_stale` option can return an expired entry for a configured duration. In default `immediate` mode, CoreDNS sends stale data and then refreshes it. In `verify` mode, CoreDNS checks the source first, adding potential latency but avoiding a stale response when fresh data is available.

Serving stale data can preserve name availability during a dependency failure, but a headless-Service answer can contain the IP of a terminated Pod. Do not enable it globally without deciding whether that failure mode is acceptable for Kubernetes service discovery.

`keepttl` returns the original TTL instead of an aged TTL while an entry is cached. CoreDNS documentation warns against it when caching non-authoritative data because downstream caches can retain stale answers. Even for a Kubernetes-authoritative server block, it works against rapid endpoint convergence and is usually a poor fit for this goal.

## Use Prefetch for Popular Names Carefully

Prefetch can refresh popular entries near expiration:

~~~text
cache {
    success 9984 10 0
    denial 9984 2 0
    prefetch 20 1m 10%
    servfail 0
}
~~~

In this example, an entry becomes popular after 20 queries with no gap of one minute or more, and it is prefetched near the final 10 percent of its TTL or near expiration according to the plugin rules.

Prefetch can smooth miss latency for hot names, but it does not reduce the number of distinct names clients request. With many unique StatefulSet Pod names, it can still produce substantial refresh work. CoreDNS's Kubernetes plugin answers from local watch state, so a DNS cache miss is not normally one Kubernetes API read, but it still costs DNS processing and memory.

## Estimate the Query Budget

If `N` independent application processes refresh every `T` seconds, the rough steady query rate for one record type is:

~~~text
QPS = N / T
~~~

Multiply by queried names, A and AAAA types, retries, search-path expansions, and environments. A thousand processes refreshing four names with A and AAAA every five seconds can generate roughly 1,600 planned queries per second before retries and search suffixes.

Reduce load by:

- using one shared resolver or discovery loop per process;
- coalescing simultaneous lookups;
- adding refresh jitter;
- using absolute names to avoid unnecessary search expansion;
- deploying NodeLocal DNSCache where appropriate;
- caching a complete endpoint set inside the client for a bounded period;
- avoiding DNS queries on every application request.

## Account for NodeLocal DNSCache

When NodeLocal DNSCache is installed, application Pods query a CoreDNS-based agent on their node. Its Corefile has its own cache configuration, commonly including cluster-domain handling and negative caching.

Inspect both layers:

~~~bash
kubectl -n kube-system get daemonset node-local-dns
kubectl -n kube-system get configmap node-local-dns -o yaml
kubectl -n data exec app-0 -- cat /etc/resolv.conf
~~~

Lowering only the central CoreDNS cache cannot beat a longer node-local or application cache. Conversely, disabling every central cache while node-local caching remains effective may add central work without changing client convergence.

## Apply Changes Safely

Manage the CoreDNS ConfigMap through the cluster's supported configuration path. Before a change, capture the current object:

~~~bash
kubectl -n kube-system get configmap coredns -o yaml \
  > coredns-before.yaml
~~~

After editing, validate behavior in a canary or staging cluster first. If the Corefile includes the `reload` plugin, CoreDNS periodically detects and gracefully loads changes. Check logs and the reload failure metric. Some cluster management paths instead require or document a Deployment restart:

~~~bash
kubectl -n kube-system rollout status deployment/coredns
kubectl -n kube-system logs deployment/coredns --tail=200
~~~

Do not assume a successful ConfigMap update means the new Corefile loaded. Query the service, inspect logs, and verify every CoreDNS replica. Remember that provider-managed clusters may reconcile or overwrite direct changes during upgrades.

## Monitor the Tradeoff

CoreDNS exposes useful metrics when the Prometheus plugin is enabled:

- cache requests and hits;
- success and denial evictions;
- prefetch operations;
- stale responses served;
- cache drops;
- Kubernetes DNS programming duration;
- failed Corefile reloads;
- request duration and response codes.

Correlate those with application metrics:

- age of the resolved endpoint set;
- time from EndpointSlice removal to last new connection;
- DNS timeout and `SERVFAIL` rate;
- connection failures to removed Pod IPs;
- retry volume during rollouts.

A low hit ratio is not automatically bad when the Kubernetes plugin answers cheaply from synchronized memory. Saturated CoreDNS CPU, rising tail latency, or client timeouts are stronger signs that the chosen TTL is too aggressive for current capacity.

## Roll Back on Measured Regressions

Predefine rollback thresholds, such as DNS error rate, CoreDNS CPU, p99 lookup latency, or stale-address connection failures. Keep the previous Corefile, and test restoration before a production incident.

TTL changes take time to propagate because clients can retain answers issued under the old TTL. Evaluate over at least the previous maximum cache horizon plus the connection-pool lifetime, not immediately after the edit.

## Official Documentation

- [CoreDNS kubernetes plugin TTL](https://coredns.io/plugins/kubernetes/)
- [CoreDNS cache plugin](https://coredns.io/plugins/cache/)
- [CoreDNS reload plugin](https://coredns.io/plugins/reload/)
- [Kubernetes DNS debugging and the CoreDNS ConfigMap](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)

## Conclusion

Tune the Kubernetes record TTL, positive cache, and denial cache as separate controls. Then include node-local and application caching in the same budget. Short TTLs improve discovery only when clients re-resolve and rotate connections; measure that end-to-end outcome while protecting CoreDNS with coalescing, jitter, capacity, and clear rollback thresholds.
