# How to Prevent Bidirectional gRPC Streams from Deadlocking Under Backpressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Streaming, Python, Concurrency

Description: Keep bidirectional gRPC reads and writes progressing independently, with bounded queues and coordinated cancellation.

A bidirectional stream can hang even when the connection is healthy. One common pattern is that both endpoints try to finish sending a large batch before either begins reading. Once transport buffers fill, both writers wait for the other side to consume data.

The [gRPC flow-control guide](https://grpc.io/docs/guides/flow-control/) describes this deadlock risk. Increasing buffer sizes can postpone it, but the durable fix is to keep both directions progressing and bound the application's own queues.

## Draw the dependency cycle

```mermaid
flowchart LR
    CW[Client write waits] --> SR[Server must read]
    SR --> SW[Server waits to finish writing]
    SW --> CR[Client must read]
    CR --> CW
```

Look for `send all; receive all` code, a lock held across a blocking write that the reader also needs, or manual flow-control code that never grants the next read. A small-message test often passes because the full exchange fits into buffers.

## Run one reader alongside one writer

This Python AsyncIO example assumes a raw-byte bidirectional diagnostic endpoint at `/demo.Echo/Chat`. Use your generated streaming stub for a protobuf application. It uses explicit `read()` and `write()` consistently, rather than mixing those APIs with an async request iterator.

```python
import asyncio
import grpc

async def exchange(messages):
    async with grpc.aio.insecure_channel("127.0.0.1:50051") as channel:
        call = channel.stream_stream("/demo.Echo/Chat")(timeout=10)

        async def send():
            for message in messages:
                await call.write(message)
            await call.done_writing()

        async def receive():
            count = 0
            while True:
                message = await call.read()
                if message is grpc.aio.EOF:
                    return count
                # Process or persist here; do not accumulate indefinitely.
                count += 1

        tasks = [asyncio.create_task(send()),
                 asyncio.create_task(receive())]
        try:
            _, received = await asyncio.gather(*tasks)
            return received
        finally:
            call.cancel()
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
```

The ten-second deadline bounds this finite demonstration. A long-lived subscription needs a deliberate lifetime and reconnect policy instead of an arbitrary short deadline. Plaintext here is for loopback diagnostics only.

There is one writer and one reader. Creating ten sender tasks that all call `write()` concurrently is not a replacement for this structure. If several producers supply messages, merge them through a bounded queue consumed by the one writer.

## Keep protocol dependencies in mind

Concurrency does not fix a protocol that requires an impossible exchange. For example, if the server will not read another request until its acknowledgement has been consumed, the client reader must keep running even while the producer waits for more local data.

Half-closing the client's outgoing direction with `done_writing()` does not close the response direction. Continue reading until completion so that final responses and failure status are observed. If either task fails, cancel the stream and await cleanup of both tasks; otherwise a failed sender can leave a receiver waiting forever.

## Bound memory before tuning HTTP/2

Measure application queue depth, bytes waiting to send, and time spent waiting for reads and writes. A bounded transport cannot protect an unbounded Python list or executor queue ahead of it.

Use an overload policy that belongs to the business protocol. A telemetry stream might drop explicitly lossy samples; a payment stream must reject or durably queue work. Do not silently drop messages to make memory charts look better.

## Reproduce the pressure deliberately

Test payloads larger than the normal buffering window and have the server emit a response for each request. Slow the client reader, then the server reader, separately. Verify that the exchange still completes, queues stay bounded, cancellation unwinds both tasks, and the final status is checked.

If progress stops, capture both endpoints' stacks and queue depths at the same time. A writer waiting is often normal backpressure; a cycle in which neither side can read is the bug.

## Conclusion

Give each stream one reader and one writer that can progress independently. Combine that with bounded queues, explicit half-close behavior, and coordinated cancellation so that slow consumers cause controlled waiting instead of deadlock.

## Official Documentation

- [gRPC flow control and deadlock warning](https://grpc.io/docs/guides/flow-control/)
- [gRPC Python AsyncIO streaming APIs](https://grpc.github.io/grpc/python/grpc_asyncio.html)
- [Python task cancellation and gather](https://docs.python.org/3/library/asyncio-task.html)
