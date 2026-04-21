# How to Test gRPC Services over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv6, Testing, Grpcurl, Integration Test

Description: Test gRPC services over IPv6 using grpcurl, language-specific test frameworks, and automated integration testing approaches.

## Testing with grpcurl

grpcurl is the `curl` equivalent for gRPC:

```bash
# Install grpcurl

go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
# Or: brew install grpcurl

# List available services over IPv6
grpcurl -plaintext '[::1]:50051' list

# List methods in a service
grpcurl -plaintext '[::1]:50051' list helloworld.Greeter

# Describe a method
grpcurl -plaintext '[::1]:50051' describe helloworld.Greeter.SayHello

# Call a method
grpcurl -plaintext \
  -d '{"name": "IPv6 World"}' \
  '[::1]:50051' \
  helloworld.Greeter/SayHello

# With proto file (no server reflection needed)
grpcurl -plaintext \
  -proto hello.proto \
  -d '{"name": "test"}' \
  '[::1]:50051' \
  helloworld.Greeter/SayHello
```

## Go Unit Tests for IPv6 gRPC

```go
// server_test.go
package main

import (
    "context"
    "net"
    "os"
    "testing"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/test/bufconn"
    pb "example.com/helloworld"
)

// Use bufconn for in-memory testing (no real IPv6 needed for unit tests)
const bufSize = 1024 * 1024

func startTestServer(t *testing.T) (pb.GreeterClient, func()) {
    lis := bufconn.Listen(bufSize)

    s := grpc.NewServer()
    pb.RegisterGreeterServer(s, &server{})

    go s.Serve(lis)

    conn, err := grpc.NewClient("passthrough:///bufnet",
        grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
            return lis.DialContext(ctx)
        }),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        t.Fatalf("Failed to create client: %v", err)
    }

    return pb.NewGreeterClient(conn), func() {
        conn.Close()
        s.Stop()
    }
}

func TestSayHelloWithBufconn(t *testing.T) {
    client, cleanup := startTestServer(t)
    defer cleanup()

    ctx := context.Background()
    resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "IPv6 Test"})
    if err != nil {
        t.Fatalf("SayHello failed: %v", err)
    }

    if resp.Message != "Hello, IPv6 Test!" {
        t.Errorf("Unexpected response: %s", resp.Message)
    }
}

// Integration test against a real IPv6 endpoint
func TestSayHelloRealIPv6(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    target := os.Getenv("GRPC_IPV6_TARGET")
    if target == "" {
        target = "[::1]:50051"
    }

    conn, err := grpc.NewClient(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        t.Fatalf("Failed to create client: %v", err)
    }
    defer conn.Close()

    client := pb.NewGreeterClient(conn)
    resp, err := client.SayHello(context.Background(), &pb.HelloRequest{Name: "test"})
    if err != nil {
        t.Fatalf("RPC failed: %v", err)
    }
    t.Logf("Response: %s", resp.Message)
}
```

## Python pytest for gRPC IPv6

```python
# test_greeter.py
import os
import pytest
import grpc
import hello_pb2
import hello_pb2_grpc

@pytest.fixture
def grpc_channel():
    """Create gRPC channel to IPv6 test server."""
    # For integration tests
    target = os.environ.get("GRPC_IPV6_TARGET", "[::1]:50051")
    channel = grpc.insecure_channel(target)
    yield channel
    channel.close()

@pytest.fixture
def greeter_stub(grpc_channel):
    return hello_pb2_grpc.GreeterStub(grpc_channel)

def test_say_hello_ipv6(greeter_stub):
    """Test gRPC SayHello over IPv6."""
    request = hello_pb2.HelloRequest(name="IPv6 Test")
    response = greeter_stub.SayHello(request, timeout=5.0)

    assert response.message == "Hello, IPv6 Test!"

def test_say_hello_with_custom_ipv6():
    """Test connecting to a specific IPv6 address."""
    ipv6_address = os.environ.get("GRPC_IPV6_TARGET", "[::1]:50051")
    with grpc.insecure_channel(ipv6_address) as channel:
        stub = hello_pb2_grpc.GreeterStub(channel)
        response = stub.SayHello(
            hello_pb2.HelloRequest(name="test"),
            timeout=10.0
        )
        assert response.message is not None
```

## Automated Test Script

```bash
#!/bin/bash
# test-grpc-ipv6.sh

GRPC_SERVER="${GRPC_SERVER:-[::1]:50051}"
PASS=0
FAIL=0

# Test 1: List services
echo "Test 1: Service discovery..."
if grpcurl -plaintext "$GRPC_SERVER" list > /dev/null 2>&1; then
    echo "PASS: Service reflection available"
    ((PASS++))
else
    echo "FAIL: Cannot list services"
    ((FAIL++))
fi

# Test 2: Health check
echo "Test 2: Health check..."
if grpcurl -plaintext "$GRPC_SERVER" grpc.health.v1.Health/Check > /dev/null 2>&1; then
    echo "PASS: Health check"
    ((PASS++))
else
    echo "FAIL: Health check failed"
    ((FAIL++))
fi

# Test 3: Actual RPC
echo "Test 3: SayHello RPC..."
RESPONSE=$(grpcurl -plaintext -d '{"name":"test"}' \
    "$GRPC_SERVER" helloworld.Greeter/SayHello 2>&1)
if echo "$RESPONSE" | grep -q "message"; then
    echo "PASS: SayHello returned: $RESPONSE"
    ((PASS++))
else
    echo "FAIL: SayHello failed: $RESPONSE"
    ((FAIL++))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to continuously monitor your gRPC services over IPv6. Configure port monitors on the gRPC port for your IPv6 addresses, and keep grpcurl or client-based integration tests for protocol-level gRPC health and RPC validation.

## Conclusion

Testing gRPC services over IPv6 uses the same tools as IPv4 testing - grpcurl, bufconn for unit tests, and standard gRPC clients for integration tests. Always use `[ipv6addr]:port` format in test configurations and run integration tests against real IPv6 addresses in CI/CD pipelines.
