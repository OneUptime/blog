# How to Handle gRPC Deadlines and Timeouts over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Deadlines, Timeout, Go, Python, Error Handling

Description: Implement gRPC deadlines and timeouts for IPv4 connections in Go and Python, handle DeadlineExceeded errors, and propagate deadlines across service chains.

## Introduction

gRPC models call limits as deadlines (an absolute point in time), though some language APIs expose them as timeouts (a duration). Every RPC should carry a deadline to prevent resource leaks when the network is slow or a server hangs. Proper deadline propagation is essential in microservice chains.

## Go - Setting a Deadline

```go
package main

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    pb "example.com/proto/helloworld"
)

func callWithDeadline(client pb.GreeterClient) {
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "world"})
    if err != nil {
        st, _ := status.FromError(err)
        switch st.Code() {
        case codes.DeadlineExceeded:
            log.Println("RPC timed out - deadline exceeded")
        case codes.Canceled:
            log.Println("RPC was cancelled")
        case codes.Unavailable:
            log.Println("Server unavailable")
        default:
            log.Printf("RPC error: %v", err)
        }
        return
    }
    log.Println(resp.Message)
}
```

## Go - Propagating Deadlines Downstream

```go
// Handler: forward the incoming context deadline to downstream calls
func (s *server) ProcessOrder(ctx context.Context,
    req *pb.OrderRequest) (*pb.OrderResponse, error) {

    // ctx already carries the caller's deadline
    // Pass it directly to any downstream gRPC call
    _, err := s.inventoryClient.CheckStock(ctx,
        &inventorypb.CheckRequest{ItemId: req.ItemId})
    if err != nil {
        return nil, err // deadline propagated automatically
    }

    return &pb.OrderResponse{Status: "OK"}, nil
}
```

## Python - Deadline as timeout Parameter

```python
import grpc
import helloworld_pb2
import helloworld_pb2_grpc

channel = grpc.insecure_channel("192.168.1.10:50051")
stub = helloworld_pb2_grpc.GreeterStub(channel)

try:
    # timeout= sets a deadline relative to now
    response = stub.SayHello(
        helloworld_pb2.HelloRequest(name="World"),
        timeout=3.0  # seconds
    )
    print(response.message)
except grpc.RpcError as e:
    if e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
        print("RPC deadline exceeded")
    elif e.code() == grpc.StatusCode.UNAVAILABLE:
        print("Server unavailable")
    else:
        print(f"RPC error: {e.code()} - {e.details()}")
```

## Python - Propagating Deadlines Downstream

```python
def call_downstream(context, stub, request):
    """Forward the incoming RPC deadline to a downstream call."""
    # context.time_remaining() gives seconds until deadline, or None
    # if the caller did not set one.
    time_remaining = context.time_remaining()
    if time_remaining is not None and time_remaining <= 0:
        context.abort(grpc.StatusCode.DEADLINE_EXCEEDED, "Deadline already exceeded")

    try:
        if time_remaining is None:
            return stub.DownstreamCall(request)
        return stub.DownstreamCall(request, timeout=time_remaining)
    except grpc.RpcError as e:
        context.abort(e.code(), e.details())
```

## Setting Deadlines on Streaming RPCs (Go)

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

stream, err := client.FetchStream(ctx, &pb.FetchRequest{})
if err != nil {
    if status.Code(err) == codes.DeadlineExceeded {
        log.Println("Stream setup exceeded the deadline")
    } else {
        log.Printf("Stream setup error: %v", err)
    }
    return
}

for {
    msg, err := stream.Recv()
    if err != nil {
        if status.Code(err) == codes.DeadlineExceeded {
            log.Println("Stream deadline exceeded")
        }
        break
    }
    log.Println(msg)
}
```

## Recommended Deadline Strategy

| RPC Type | Recommended Timeout |
|----------|-------------------|
| Simple query | 1–3 seconds |
| Database-backed | 5–10 seconds |
| File upload/download | 30–300 seconds |
| Long-running stream | Propagate parent deadline |

## Conclusion

Always set deadlines on gRPC calls to prevent goroutine/thread leaks on slow or broken network paths. Use `context.WithTimeout` in Go and the `timeout` parameter in Python. Propagate the caller's deadline to downstream calls rather than creating a new, longer deadline.
