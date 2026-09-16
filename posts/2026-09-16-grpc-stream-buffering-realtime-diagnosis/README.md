# How to Diagnose gRPC Streams That Buffer Messages Instead of Delivering Them in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Streaming, Troubleshooting, HTTP/2, Performance

Description: Find where gRPC streaming messages accumulate by measuring production, send, receive, and rendering timestamps across native and translated routes.

---

A gRPC server logs one event every second, but the client displays ten events at once. That symptom does not identify the buffering layer. The server may build one large response, the client may wait for completion, or a JSON gateway may collect output before flushing it.

Start by locating the first boundary where message timing changes. Changing HTTP/2 windows or proxy buffers before that measurement can hide the original cause and increase memory consumption.

## Confirm That the API Actually Streams

Check the service definition:

```protobuf
syntax = "proto3";
package acme.events.v1;

message WatchRequest {}
message Event {
  uint64 sequence = 1;
  string value = 2;
}

service Events {
  rpc Watch(WatchRequest) returns (stream Event);
}
```

A unary response containing `repeated Event` is still one response message. Likewise, a server-streaming method that waits for all work to finish before calling `Send` will deliver a burst by design.

Inspect the producer loop and the generated method type. Fetching an entire database result, collecting an iterator into a list, or accumulating an application batch can delay the first message before gRPC sees anything. The protobuf service declaration defines which direction can contain multiple messages. [Protocol Buffers service definitions](https://protobuf.dev/programming-guides/proto3/#services).

## Instrument Four Boundaries

Use a short-lived diagnostic stream with a sequence number and a predictable interval. Log:

1. When the application creates each event.
2. Immediately before and after its gRPC send call.
3. Immediately after the client receives each event.
4. When the consumer renders or persists it.

For a Go handler, wrap the existing send operation:

```go
started := time.Now()
err := stream.Send(event)
log.Printf("sequence=%d send_duration=%s send_error=%v",
    event.GetSequence(), time.Since(started), err)
if err != nil {
    return err
}
```

Compare durations within each process. Cross-machine timestamp differences also include clock skew, so correlate sequence numbers and local intervals before concluding that a network hop introduced a particular number of milliseconds.

A quick return from `Send` means gRPC accepted the work; it is not a remote delivery acknowledgment. The framework can buffer bytes before writing them to the network. Conversely, a long send duration can indicate flow control pressure. [gRPC flow control](https://grpc.io/docs/guides/flow-control/).

## Read Continuously on the Client

A diagnostic Go receiver should process each result as it arrives:

```go
for {
    event, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        return err
    }
    log.Printf("received sequence=%d at=%s",
        event.GetSequence(), time.Now().Format(time.RFC3339Nano))
}
```

This fragment belongs inside a function returning `error`; add a final `return nil` after the loop. It uses `io`, `log`, and `time`.

Temporarily remove expensive business processing from this receiver. If timing becomes smooth, inspect the consumer's database writes, synchronous callbacks, queue capacity, and UI batching. If a separate worker is necessary, use a bounded queue with an explicit overload policy.

In a bidirectional stream, keep receiving while sending. Two peers that fill their send paths and both postpone reading can stall each other. In Go, use one send owner and one receive owner; multiple goroutines must not concurrently call `Send` or concurrently call `Recv` on the same stream. [gRPC-Go stream concurrency contract](https://pkg.go.dev/google.golang.org/grpc#ClientStream).

## Compare the Direct and Proxied Routes

Run the same diagnostic client against a direct backend connection and the production proxy route. Keep credentials, payload, compression, and client processing equivalent. In Kubernetes, an authorized local port-forward can provide a useful direct test, although its own transport means it is not a production latency benchmark.

Interpret the result:

| Observation | Next investigation |
| --- | --- |
| Production timestamps already arrive in bursts | Producer, database fetch, batching |
| Sends stall and the client stops reading | Flow control and consumer work |
| Direct gRPC is smooth; proxied gRPC bursts | Proxy filters, buffering, upstream protocol |
| Native client is smooth; browser bursts | gRPC-Web or JSON translation and browser consumption |
| Receive timestamps are smooth; display bursts | UI render scheduling or output buffering |

A gRPC stream uses message framing inside HTTP/2. Packet boundaries are not message boundaries, so a packet capture alone should not be interpreted as the application's receive schedule. [gRPC HTTP/2 protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md).

## Apply Settings to the Correct Proxy Module

NGINX's native gRPC module documents synchronous forwarding of responses as they arrive. Its `grpc_buffer_size` controls the response-reading buffer; it is not a batch threshold that must fill before every message is forwarded. [NGINX gRPC module](https://nginx.org/en/docs/http/ngx_http_grpc_module.html#grpc_buffer_size).

A JSON streaming endpoint behind `proxy_pass` uses a different module. That route may need response buffering disabled:

```nginx
location /events/ {
    proxy_pass http://json_gateway;
    proxy_buffering off;
}
```

This is an HTTP gateway location, not a native `grpc_pass` recipe. The gateway must also write and flush incrementally, and its client must consume the response body incrementally. NGINX documents `proxy_buffering` specifically for its HTTP proxy module. [NGINX response buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering).

## Verify Latency Without Removing Bounds

Repeat the diagnostic under realistic message sizes and a deliberately slow consumer. Measure time to first message, the largest inter-message gap, send duration, queue depth, and memory usage.

A fix should reduce unexplained delivery gaps while retaining bounded memory. Larger windows can improve throughput on a high-latency path, but they cannot repair an application that waits until the end to read or flush. Preserve the measurement points so the next regression identifies the responsible boundary immediately.
