# Handle gRPC Retry Pushback Without Fighting Client Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Retries, Retry Pushback, Backoff, Service Config, Deadlines

Description: Interpret gRPC retry pushback as server control of the next eligible attempt while retaining client attempt limits, throttling, and the call deadline.

---

gRPC retry pushback lets a server influence the timing of a client's next retry. It is not an extra sleep to add after exponential backoff, and it is not permission to exceed the retry policy. It replaces the normal backoff delay for the next eligible attempt or tells the client not to retry.

In the gRPC retry design, the server sends response metadata named <code>grpc-retry-pushback-ms</code>. The value represents milliseconds as a signed decimal integer:

- a valid non-negative value schedules the next retry after that delay;
- a negative value tells the client not to retry;
- an invalid or unparsable value is treated as a request not to retry.

Normally the gRPC library implements this behavior. Application code should not parse the metadata and start a second retry loop around a client that already honors it.

## Apply Pushback Inside Retry Eligibility

Pushback matters only after all ordinary retry checks pass:

1. The RPC has not committed by receiving response headers or exceeding the client's replay buffer.
2. The final status is included in the configured retryable status codes.
3. The configured maximum attempts has not been reached.
4. Retry throttling permits another attempt.
5. The call deadline leaves enough time.
6. The server pushback allows retry and supplies the next delay, or normal backoff computes it.

Receiving response headers commits a gRPC RPC for retry purposes. The official guide states that gRPC does not perform further retries after that point. An application-level repetition after a committed RPC is a new semantic decision and may duplicate side effects.

Pushback never expands <code>maxAttempts</code>, resets the attempt counter, refills retry-throttling tokens, or extends the deadline.

## Do Not Stack Pushback and Backoff

Suppose normal exponential backoff produces 800 milliseconds and the server sends:

~~~text
grpc-retry-pushback-ms: 2500
~~~

The next retry delay is 2.5 seconds under the gRPC policy. It is not 3.3 seconds, and it should not receive a second application jitter calculation. The server is taking control of that attempt's timing.

A zero value allows an immediate next retry, but it still passes through the maximum-attempt, throttling, and deadline gates. A large positive value can make the retry useless: when it leaves insufficient time before the call deadline, the client should finish with the deadline outcome rather than extending the call.

After the pushed-back attempt, a later retry without new pushback restarts at the configured <code>initialBackoff</code> and grows from there. It does not continue the exponential step that preceded the server signal.

Malformed pushback must not silently become zero. Treating invalid control metadata as an immediate retry creates exactly the overload risk the signal is intended to prevent.

## Configure the Base Retry Policy First

Pushback supplements a method-level retry policy published through gRPC Service Config:

~~~json
{
  "methodConfig": [
    {
      "name": [
        {
          "service": "inventory.v1.Inventory",
          "method": "Reserve"
        }
      ],
      "retryPolicy": {
        "maxAttempts": 4,
        "initialBackoff": "0.2s",
        "maxBackoff": "2s",
        "backoffMultiplier": 2,
        "retryableStatusCodes": [
          "UNAVAILABLE"
        ]
      }
    }
  ]
}
~~~

This is an example, not a universal policy. <code>maxAttempts</code> counts the original attempt. Choose retryable status codes from the method contract. <code>UNAVAILABLE</code> is commonly transient; broadening to statuses such as <code>RESOURCE_EXHAUSTED</code> or <code>DEADLINE_EXCEEDED</code> requires understanding whether the operation reached application logic and whether repetition is safe.

Language and release support for service-config features varies. Check the current gRPC language support table and verify that the deployed resolver actually supplies the intended service config. A configuration file that is never resolved does not change client behavior.

## Keep One Overall Deadline

The gRPC call deadline covers the full sequence of attempts and backoff waits. If 1.8 seconds remain and the server pushes back for 2 seconds, the client must not create a new 2-second budget.

Servers should choose pushback values based on useful recovery information, such as an overload controller's admission window. Do not send an arbitrary large delay to retain client work indefinitely. A negative value is the explicit way to suppress further retries for this RPC.

Clients still need an overall deadline even when servers provide pushback. A missing or broken server signal must not leave calls alive without a bound.

## Coordinate Pushback with Retry Throttling

gRPC retry throttling maintains a token count per server name. Failed RPCs reduce tokens, successes restore them by a configured ratio, and policy retries stop when the count reaches the threshold described by the retry design. This protects a service during broad failure.

The controls are complementary:

- pushback controls the timing or cancellation of the next retry for one call;
- backoff supplies timing when no valid pushback is present;
- retry throttling suppresses retries when failures are widespread;
- the call deadline bounds the complete operation.

Do not interpret a positive pushback as an instruction to bypass throttling. Do not restore tokens merely because the client waited.

## Avoid an Outer Retry Loop

An outer application loop can undo server intent:

~~~text
gRPC library receives negative pushback
gRPC library stops and returns UNAVAILABLE
application loop sees UNAVAILABLE
application starts a brand-new RPC
~~~

If the application must own retries for business reconciliation, disable configured policy retries for that method and implement server guidance through a documented application protocol. Otherwise, allow the gRPC library to be the single retry owner and return its final result.

A service mesh can add yet another retry layer. Make sure proxy retries are disabled or reduced for gRPC methods with client retry policies, especially for mutating RPCs.

## Observe Pushback Outcomes

Record or expose:

- attempts per logical call;
- cumulative retry delay;
- retries stopped by negative or invalid pushback;
- positive pushback delay distribution;
- retries suppressed by throttling;
- calls whose deadline expired during pushback;
- final status and whether the RPC had committed.

Do not attach arbitrary pushback values as metric labels. Use histograms for delays and bounded reason labels for stop decisions. gRPC's OpenTelemetry integration defines stable per-attempt instruments and experimental per-call retry instruments, including retry count and cumulative retry delay. The experimental instruments are disabled by default, and language support differs, so explicitly verify and enable them in the deployed implementation.

## Test the Wire Behavior

Use an integration server that returns:

- <code>UNAVAILABLE</code> with positive pushback, then success;
- <code>UNAVAILABLE</code> with zero pushback;
- negative pushback;
- alphabetic, overflowing, and otherwise invalid values;
- a positive delay longer than the call deadline;
- pushback on a non-retryable status;
- initial response headers followed by an error.

Assert the exact number and timing of server invocations. A unit test that only checks the final status will not catch stacked delays or an application loop that defeats negative pushback.

## Official Documentation

- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC client retry design gRFC A6](https://github.com/grpc/proposal/blob/master/A6-client-retries.md)
- [gRPC Service Config guide](https://grpc.io/docs/guides/service-config/)
- [gRPC OpenTelemetry metrics](https://grpc.io/docs/guides/opentelemetry-metrics/)

## Conclusion

Treat <code>grpc-retry-pushback-ms</code> as the server's decision for the next policy retry: a non-negative value replaces normal backoff, while a negative or invalid value stops retries. The client still enforces status eligibility, attempt limits, throttling, and one deadline, and no outer loop should erase that decision.
