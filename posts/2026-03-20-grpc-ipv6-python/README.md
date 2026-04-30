# How to Configure gRPC Servers with IPv6 in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Python, IPv6, API, Networking

Description: Configure Python gRPC servers and clients to use IPv6 addresses, with examples for both asyncio and synchronous implementations.

## Installation

```bash
# Install gRPC for Python

pip install grpcio grpcio-tools

# Verify installation
python -c "import grpc; print(grpc.__version__)"
```

## Step 1: Define a Proto File

```protobuf
// hello.proto
syntax = "proto3";

package helloworld;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

```bash
# Generate Python gRPC code
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. hello.proto
```

## Step 2: gRPC Server on IPv6

```python
# server.py
import grpc
from concurrent import futures
import hello_pb2
import hello_pb2_grpc

class GreeterServicer(hello_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        # Get the client's peer string from context
        peer = context.peer()
        print(f"Request from: {peer}")
        return hello_pb2.HelloReply(
            message=f"Hello, {request.name}! (peer: {peer})"
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    hello_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)

    # Bind to all IPv6 interfaces - [::] is the IPv6 wildcard
    # Python gRPC uses [::]:port format
    listen_addr = "[::]:50051"
    server.add_insecure_port(listen_addr)

    server.start()
    print(f"gRPC server started on {listen_addr}")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
```

## Step 3: gRPC Server with TLS on IPv6

```python
import grpc
from concurrent import futures

def serve_with_tls():
    # Load TLS credentials
    with open("server.key", "rb") as f:
        private_key = f.read()
    with open("server.crt", "rb") as f:
        certificate_chain = f.read()

    server_credentials = grpc.ssl_server_credentials(
        [(private_key, certificate_chain)]
    )

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    hello_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)

    # Add TLS port on IPv6
    server.add_secure_port("[::]:50052", server_credentials)

    server.start()
    print("Secure gRPC server on [::]:50052")
    server.wait_for_termination()
```

## Step 4: gRPC Client Connecting to IPv6

```python
# client.py
import grpc
import hello_pb2
import hello_pb2_grpc

def run():
    # Connect to a local IPv6 gRPC server using [addr]:port format
    ipv6_target = "[::1]:50051"

    with grpc.insecure_channel(ipv6_target) as channel:
        stub = hello_pb2_grpc.GreeterStub(channel)
        response = stub.SayHello(
            hello_pb2.HelloRequest(name="World"),
            timeout=5.0
        )
        print(f"Response: {response.message}")

if __name__ == "__main__":
    run()
```

## Step 5: Asyncio gRPC Server on IPv6

```python
# async_server.py
import asyncio
import grpc
import hello_pb2
import hello_pb2_grpc

class AsyncGreeterServicer(hello_pb2_grpc.GreeterServicer):
    async def SayHello(self, request, context):
        peer = context.peer()
        return hello_pb2.HelloReply(message=f"Hello async, {request.name}!")

async def serve():
    server = grpc.aio.server()
    hello_pb2_grpc.add_GreeterServicer_to_server(AsyncGreeterServicer(), server)

    # Listen on all IPv6 interfaces
    server.add_insecure_port("[::]:50051")

    await server.start()
    print("Async gRPC server on [::]:50051")
    await server.wait_for_termination()

if __name__ == "__main__":
    asyncio.run(serve())
```

## Step 6: Extract Client IPv6 Address in Interceptor

```python
import grpc
import hello_pb2
import hello_pb2_grpc
from urllib.parse import unquote, urlsplit

class IPv6LoggingInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        # invocation_metadata contains request metadata, not the peer address
        handler = continuation(handler_call_details)
        if handler is None or handler.unary_unary is None:
            return handler

        def logging_behavior(request, context):
            peer = unquote(context.peer())
            if peer.startswith("ipv6:"):
                print(f"Incoming IPv6 peer: {peer}")
            return handler.unary_unary(request, context)

        return grpc.unary_unary_rpc_method_handler(
            logging_behavior,
            request_deserializer=handler.request_deserializer,
            response_serializer=handler.response_serializer,
        )

# Register it with grpc.server(..., interceptors=[IPv6LoggingInterceptor()])
# For per-call context:
class GreeterServicer(hello_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        peer = unquote(context.peer())
        if peer.startswith("ipv6:"):
            parsed = urlsplit(f"//{peer[5:]}")
            print(f"Client IPv6: {parsed.hostname}")
        return hello_pb2.HelloReply(message="Hello!")
```

## Testing

```bash
# Test with grpcurl using the proto file from Step 1
grpcurl -plaintext -import-path . -proto hello.proto \
  -d '{"name":"World"}' '[::1]:50051' helloworld.Greeter/SayHello

# Or with Python test client
python client.py
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Python gRPC service availability over IPv6. Configure TCP monitors on port 50051 at the IPv6 address, and if your service exposes the standard gRPC health service, monitor that separately as well.

## Conclusion

Python gRPC servers bind to IPv6 using `[::]:port` as the address string. Clients connect using `[ipv6addr]:port`. Access client peer information via `context.peer()`, which returns a runtime-defined peer string; for IPv6 clients, current `grpcio` uses an `ipv6:` peer URI. The same Python gRPC server, TLS, and asyncio APIs work with IPv6 endpoints.
