# Choose One Retry Owner Across SDK, Mesh, and Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retries, Service Mesh, SDK, Istio, gRPC, Reliability

Description: Prevent multiplicative attempts by assigning retry ownership to one layer while preserving semantic safety, one deadline, and end-to-end observability.

---

Retries at multiple layers do not merely add. They multiply. If an application makes three attempts, an SDK makes three attempts for each call, and a service mesh makes three upstream attempts for each SDK attempt, one logical operation can create as many as:

~~~text
3 application attempts x 3 SDK attempts x 3 mesh attempts = 27 sends
~~~

That is the worst case before counting retries deeper in the service graph. During an outage, this hidden amplification consumes connections, worker capacity, rate quota, and the caller's deadline while making each layer believe it is being modest.

Assign one layer ownership of policy-driven retries for a dependency call. Other layers may still perform narrowly defined transparent transport recovery, but their behavior must be known, bounded, and visible.

## Inventory Every Attempt-Creating Layer

Trace one representative request from caller to final dependency and list:

- application retry loops and job-framework redelivery;
- generated API clients and cloud SDK defaults;
- HTTP client transports and redirect behavior;
- gRPC configured retries and transparent retries;
- sidecar, gateway, ingress, and egress proxy policies;
- load balancers or database drivers with reconnect behavior;
- server-side queues that redeliver unacknowledged work.

Do not infer behavior from source code alone. Service configuration, environment variables, resolver-provided gRPC service config, and mesh routing rules can change it at deployment time.

Capture attempt evidence in a controlled test. Istio and Envoy can expose attempt information through proxy telemetry and headers when configured; gRPC provides per-attempt metrics; many SDKs expose attempt metadata in debug logging. Keep these diagnostics away from sensitive production payloads.

## Choose the Owner by Required Knowledge

The best owner is the highest practical layer that has enough information to decide replay safety, while still being close enough to apply the policy consistently.

| Layer | What it knows well | Appropriate use | Main limitation |
| --- | --- | --- | --- |
| Application or domain client | business idempotency, outcome reconciliation, end-to-end deadline | POST commands, workflows, fallbacks, conditional writes | policy can be duplicated across applications |
| Service-specific SDK | operation models, service error codes, signing, pagination | documented transient API failures and provider guidance | may be invisible to application telemetry |
| Service mesh or proxy | endpoints, connection failures, upstream health | uniform retries for carefully selected replay-safe routes | usually cannot know business side effects or request intent |
| Transport | whether a connection was reused and some bytes were written | tightly specified transparent recovery | cannot decide general operation semantics |

A mesh retry is attractive because it requires no application change. It is unsafe as a generic policy for endpoints whose method or payload can create effects. An application retry is semantically informed, but it should not wrap an SDK that already performs a complete retry policy without adjusting the SDK.

## Budget Attempts End to End

Define an operation-level maximum and allocate it, rather than giving every layer its own maximum. If the allowed total is four sends, one possible configuration is:

~~~text
application policy attempts: 1
SDK policy attempts:         4
mesh policy attempts:        1
~~~

Another operation might require application-owned reconciliation:

~~~text
application policy attempts: 3
SDK policy attempts:         1
mesh policy attempts:        1
~~~

These allocations count total sends; they are not literal settings to copy into every product. In the current Istio <code>HTTPRetry</code> API, for example, <code>retries.attempts</code> counts retries after the initial request, so <code>attempts: 0</code> disables route retries. Other products count total attempts. Verify each setting before translating the allocation into configuration.

All layers must remain under one overall deadline. A proxy's <code>perTryTimeout</code> is not an end-to-end budget, and an SDK timeout restarted for every application attempt can exceed the caller's objective. Propagate the deadline and stop before the next sleep or attempt when insufficient time remains.

## Avoid Competing Backoff Controllers

Only the retry owner should schedule policy backoff. If an inner SDK sleeps and an outer loop also sleeps, callers see stacked delays and the outer layer cannot accurately reserve time. If a service supplies <code>Retry-After</code> or gRPC retry pushback, the layer that understands that signal should apply it within the overall deadline.

Share these invariants across boundaries:

- one stable idempotency identity for the logical operation;
- the same conditional write preconditions where required;
- one absolute deadline or propagated remaining timeout;
- a bounded total send count;
- cancellation of active attempts when the caller abandons the result.

An outer retry must not create a new idempotency key. An inner retry must not continue after the parent request is canceled.

## Configure the Mesh Deliberately

Istio documents that application and mesh failure-recovery policies operate independently and can conflict. A virtual service can set both route timeout and retry attempts:

~~~yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: inventory
spec:
  hosts:
    - inventory
  http:
    - route:
        - destination:
            host: inventory
      retries:
        attempts: 2
        perTryTimeout: 400ms
      timeout: 900ms
~~~

With the current Istio API, this example allows at most one initial request plus two retries; the route timeout and per-try timeout can reduce the number actually sent. Setting <code>attempts: 0</code> disables retries for the route. Omitting the route retry block does not necessarily mean zero retries because Istio can apply a cluster-wide default retry policy. Check <code>MeshConfig.defaultHttpRetryPolicy</code> and the generated Envoy configuration for the deployed version.

Apply the route only to an operation whose replay is safe, and make sure the application and SDK do not independently repeat it.

If policy cannot be narrowed safely by route or method, disabling mesh retries for that call is preferable to guessing from a broad <code>5xx</code> class.

## Account for gRPC Transparent Retries

gRPC can perform transparent retries even without a configured retry policy. If an RPC never leaves the client, the library can transparently retry until success or the call deadline. If it reaches the gRPC server library but not application logic, gRPC performs at most one transparent retry. Configured retry policies separately add status-based attempts, exponential backoff, and throttling.

Treat transparent recovery as part of the transport's documented contract, not as permission to add another unaware loop. Once response headers are received, gRPC commits the RPC and no further gRPC retry is attempted. An outer application still needs to decide whether repeating the complete RPC after its final result is semantically valid.

## Make Logical Calls and Attempts Observable

Record separate counters for logical operations and wire attempts. Then compute retry amplification:

~~~text
attempt amplification = total sends / logical operations
~~~

Also record the owner that scheduled the retry, final outcome, attempt number, cumulative retry delay, deadline exhaustion, and retry-budget rejection. Use low-cardinality route or method labels; do not put request IDs or raw error messages in metric labels.

In a trace, show the logical client operation and the individual send attempts. This makes a 900-millisecond call with six hidden sends visibly different from one slow attempt.

## Roll Out Ownership Changes Safely

Changing from layered retries to one owner can lower success probability if the new total budget is accidentally smaller. Compare before and after using fault injection:

- transient connection failure before server processing;
- retryable status from one endpoint;
- slow response that consumes the outer deadline;
- unsafe operation whose response is lost after commit;
- broad dependency outage that exhausts retry tokens.

Assert both the logical success rate and the exact number of backend invocations. A migration is complete only when the maximum observed sends matches the intended end-to-end budget.

## Official Documentation

- [Istio traffic management and failure recovery](https://istio.io/latest/docs/concepts/traffic-management/)
- [Istio Virtual Service HTTPRetry reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/#HTTPRetry)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)

## Conclusion

Retry ownership is an architectural decision, not a default to accept independently in every layer. Give the policy to the layer that understands replay safety and server errors, configure other layers for no policy retries using each product's counting semantics, preserve narrowly documented transparent recovery, and enforce one deadline and send budget from caller to dependency.
