# How to Keep Slow Java gRPC onNext Handlers from Delaying Cancellation Callbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Java, Concurrency, Debugging

Description: Make Java gRPC cancellation responsive by shortening inbound callbacks, polling cancellation during bounded work, and controlling queued processing.

A client cancels its stream, but the server keeps working and the cancellation callback does not run until seconds later. That can be caused by the application spending those seconds inside its inbound `onNext()` method.

For a Java server stream, the cancellation handler is serialized with inbound observer callbacks. The [ServerCallStreamObserver documentation](https://grpc.github.io/grpc-java/javadoc/io/grpc/stub/ServerCallStreamObserver.html) explicitly distinguishes that delayed callback from `isCancelled()`, which can be polled while other work is still running.

## Measure callback occupancy

Record start and finish times for `onNext()`, along with the RPC ID and the point when the client cancels. If the cancellation handler consistently begins just after `onNext()` exits, investigate application work before changing server thread-pool sizes.

Typical blockers include waiting for a database call, joining a future, draining a large batch, or sleeping until another producer makes data available. Adding threads may help unrelated RPCs but does not make callbacks for this call execute concurrently where the API requires serialization.

## Poll while doing bounded work

The following is a fragment inside a generated service implementation. `Batch`, `Result`, `splitIntoSmallChunks()`, and `processChunk()` are application types and methods. The cast is applied to the response observer passed to the service.

```java
ServerCallStreamObserver<Result> output =
    (ServerCallStreamObserver<Result>) responseObserver;

output.setOnCancelHandler(() -> cancelApplicationWork());

return new StreamObserver<Batch>() {
    @Override
    public void onNext(Batch batch) {
        for (var chunk : splitIntoSmallChunks(batch)) {
            if (output.isCancelled()) return;
            processChunk(chunk);
        }
    }

    @Override
    public void onError(Throwable error) {
        cancelApplicationWork();
    }

    @Override
    public void onCompleted() {
        finishApplicationInput();
    }
};
```

Register the cancellation handler during the service's initial setup, before returning the inbound observer. Make cleanup idempotent because error handling and cancellation can reach the same application resources.

Polling only helps between chunks. If one chunk waits indefinitely in a database driver, it remains unresponsive. Give downstream calls their own bounded timeout and use the driver's cancellation mechanism where supported. Keep chunks small enough for the cancellation latency your service promises.

## Move slow processing behind a bounded handoff

For genuinely slow work, return from `onNext()` quickly after validating and accepting a bounded unit of input. A worker can process it outside the callback path.

Do not replace the blocked callback with an unbounded executor queue. Use an explicit admission limit. For client-streaming and bidirectional server handlers, manual inbound flow control can request another message only when processing capacity is available. Configure it during stream initialization and confirm the API used by your deployed gRPC Java version.

Design the asynchronous state transitions before wiring the executor:

| Event | Required application behavior |
| --- | --- |
| New input | Accept only if capacity exists and the call is active |
| Client half-close | Stop accepting input; finish already accepted work according to the contract |
| Cancellation | Stop queued work and signal running tasks |
| Worker completion | Emit through the single output owner if the call remains active |
| Worker failure | Terminate once and release queued resources |

`onCompleted()` on the inbound observer means no more requests are coming. It does not mean background processing has finished. Sending the response stream's completion immediately can discard outstanding results.

## Verify cancellation under load

Use an integration test with a controlled slow operation. Cancel the client during processing and measure both cancellation visibility and actual resource release. Also test a full input queue and cancellation immediately before worker completion.

A useful assertion is that no new downstream job starts after cancellation is observed. Do not require an already committed database transaction to disappear: cancellation is cooperative, and application side effects need their own idempotency or compensation design.

## Conclusion

Keep callbacks short, poll cancellation between bounded work units, and give offloaded work a bounded queue and an explicit shutdown path. This makes cancellation responsive without creating concurrent writes or premature stream completion.

## Official Documentation

- [Java server cancellation handlers and isCancelled](https://grpc.github.io/grpc-java/javadoc/io/grpc/stub/ServerCallStreamObserver.html)
- [Java StreamObserver callback contract](https://grpc.github.io/grpc-java/javadoc/io/grpc/stub/StreamObserver.html)
- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
