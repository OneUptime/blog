# How to Test DNS Cutover, Traffic Draining, and TTLs Before a Regional Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Disaster Recovery, Failover, Testing

Description: Test DNS cache behavior, staged traffic cutover, connection draining, and rollback timing before regional failover.

---

A DNS record change is not an instantaneous traffic move. Recursive resolvers cache answers, clients may cache beyond the resolver, and a DNS change does not reroute established TCP, TLS, HTTP/2, WebSocket, or database connections. Clients generally use new DNS answers only when they open new or replacement connections.

Treat DNS propagation, new-connection routing, and old-connection draining as three different mechanisms.

## Understand What TTL Does

The DNS time to live (TTL) is the number of seconds a resource record may be cached before its source must normally be consulted again. RFC 8767 updates this model to permit resolvers to serve expired data under defined refresh-failure conditions. Therefore, a 60-second TTL is a cache-control input, not a promise that every client moves within 60 seconds.

Other factors include:

- caches populated before the TTL was lowered;
- application and operating-system DNS caches;
- Java or other runtime-specific cache policies;
- negative caching for names that previously did not exist;
- resolver minimum or maximum cache policies;
- multiple A/AAAA answers and client address selection;
- DNS-over-HTTPS resolvers outside corporate control;
- health-check evaluation and authoritative-provider update latency.

Measure representative clients rather than relying on an authoritative-server response alone.

## Prepare the Recovery Endpoint

Before touching production DNS:

1. provision and scale the recovery service;
2. restore data and validate RPO;
3. prove the old writer will be fenced before recovery writes;
4. issue certificates for the actual service hostname and test SNI;
5. configure firewalls, load balancers, health checks, and observability;
6. run synthetic transactions by overriding resolution locally or using a dedicated test hostname;
7. confirm the recovery endpoint does not call production write dependencies;
8. define traffic, error, latency, saturation, and data-integrity abort thresholds.

Never point a public record at a target merely because its process health check is green.

## Lower TTL Early Enough

If the current TTL is 3600 seconds and you change it to 60 seconds at 10:00, resolvers that cached the old answer at 09:59 may use it until nearly 10:59. Lower the TTL at least one full old-TTL interval before the planned cutover, plus operational margin, and verify through representative recursive resolvers.

Record:

- previous and new TTL;
- time the new TTL became authoritative;
- earliest safe cutover time after old caches should normally expire;
- resolvers and client populations tested;
- rollback TTL and how long split traffic may persist.

Restore a sustainable TTL after the stabilization period. Permanently tiny TTLs increase query load and still do not solve persistent connections.

## Test with a Delegated or Test Name

Exercise the exact provider, record type, health check, and automation without moving production traffic:

~~~bash
# Ask the authoritative server.
dig @ns-authoritative.example.net app-drill.example.com A +noall +answer

# Ask representative recursive resolvers.
dig @resolver-one.example app-drill.example.com A +noall +answer
dig @resolver-two.example app-drill.example.com A +noall +answer

# Test TLS and HTTP while forcing the intended address.
# Set RECOVERY_IP to the recovery endpoint's numeric IPv4 address.
curl --resolve "app.example.com:443:${RECOVERY_IP:?RECOVERY_IP is not set}" \
  https://app.example.com/health/critical
~~~

The curl override tests HTTP host and TLS SNI against a chosen address without relying on DNS. It does not test resolver behavior, so use both forms.

Where the provider supports weighted, latency, failover, or routing controls, verify its documented behavior. For Amazon Route 53 failover records, the primary and secondary records share a name and type. When health evaluation is configured for both records, Route 53 returns only the primary while the primary is healthy, returns the secondary when the primary is unhealthy and the secondary is healthy, and returns the primary if both are unhealthy. If the secondary has no health evaluation configured, Route 53 returns it whenever the primary is unhealthy, even if the secondary endpoint itself is unhealthy. Health evaluation therefore influences failover responses but does not guarantee that every returned endpoint is healthy. This is vendor-specific; other providers differ.

## Separate Cutover from Draining

DNS affects future resolutions. To handle existing sessions:

- stop assigning new connections to the old site through the load balancer or routing layer;
- keep old endpoints alive for a bounded drain window where safe;
- reduce keepalive or session duration in advance if the protocol allows;
- monitor active connections, long transactions, queue consumers, and streaming sessions;
- define behavior for clients that never reconnect;
- forcibly terminate only after business and data-safety review.

For a single-writer stateful service, do not keep the old site's write path open merely to drain. Fence or make it read-only, and return retriable errors where a safe proxy to the new writer is unavailable.

Connection draining is vendor and protocol specific. Test at least HTTP keepalive, HTTP/2 multiplexing, WebSockets, background workers, mobile clients, and database connection pools relevant to the workload.

## Execute a Staged Cutover

A controlled plan can use these gates:

~~~text
1. Freeze risky changes and record source watermark.
2. Confirm recovery acceptance and capacity.
3. Fence old writes.
4. Enable recovery writes and run a synthetic transaction.
5. Move a small controlled client or weighted share where supported.
6. Check integrity, error, latency, and saturation thresholds.
7. Shift new resolutions/routing to recovery.
8. Drain or reject old-site sessions according to protocol.
9. Observe until old-answer and session tails fall below criteria.
10. Raise TTL only after rollback risk is accepted.
~~~

Not every DNS service offers weighted traffic, and DNS weighting is not exact request weighting because resolvers cache answers for many clients. Use an application or edge routing layer when precise canary percentages are required.

## Measure the Long Tail

Instrument both sites with a cutover epoch:

~~~text
site
connection_created_at
request_at
client_or_resolver_cohort
dns_answer_epoch
writer_epoch
business_transaction_id
~~~

Graph new connections and requests reaching each site over time. Identify persistent source-site traffic rather than declaring success after the median client moves.

Test rollback before the event. A DNS rollback is subject to the same cache-expiry constraints as the forward change and may conflict with new data written in recovery. Traffic direction can be reversed quickly only when the stateful failback plan says it is safe.

## Failure Cases to Rehearse

- recovery health check passes while business transactions fail;
- authoritative update succeeds but one resolver serves the old answer;
- IPv4 points to recovery while IPv6 points to source;
- a certificate lacks the production hostname;
- negative cache delays a newly created recovery name;
- DNS control plane is unavailable;
- old HTTP/2 and WebSocket sessions persist;
- clients pin an IP address;
- both regions accept writes;
- automated rollback fires after recovery has accepted unique writes.

## Acceptance Criteria

The cutover plan is proven when:

- the recovery endpoint passes critical transactions using the production hostname and certificate;
- TTL is lowered and allowed to age for at least the previous cache interval before planned cutover;
- authoritative and representative recursive answers are recorded;
- IPv4, IPv6, private, public, and split-horizon views in scope agree;
- new-connection routing and existing-connection draining are tested separately;
- old writers are fenced before new writers enable;
- traffic movement, long-tail sessions, and resolver cohorts are observable;
- abort thresholds and routing safety rules work;
- rollback accounts for both DNS caches and data written after cutover;
- the complete exercise meets RTO and preserves RPO.

The goal is not “DNS updated.” It is a bounded, observable transition of clients and state.

## Official References

- [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767.html)
- [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308.html)
- [Amazon Route 53: How Route 53 chooses records when health checking is configured](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html)
- [Microsoft Azure: Failover and failback concepts](https://learn.microsoft.com/en-us/azure/reliability/concept-failover-failback)
- [Amazon Application Recovery Controller (ARC): Safety rules for routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.safety-rules.html)
