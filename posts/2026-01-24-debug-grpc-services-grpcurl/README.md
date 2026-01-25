# How to Debug gRPC Services with grpcurl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Debugging, grpcurl, DevOps, Testing, CLI Tools

Description: Learn how to use grpcurl to test, debug, and explore gRPC services from the command line, including reflection, streaming, authentication, and troubleshooting techniques.

---

grpcurl is a command-line tool that lets you interact with gRPC servers the way curl works with REST APIs. It supports server reflection, TLS, authentication, and all gRPC streaming patterns.

## Installing grpcurl

```bash
# macOS
brew install grpcurl

# Linux (using Go)
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# Docker
docker pull fullstorydev/grpcurl

# Verify installation
grpcurl --version
```

## Server Reflection Setup

grpcurl works best with server reflection enabled, which allows dynamic service discovery.

### Enable Reflection in Go

```go
// server/main.go
package main

import (
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"

    pb "github.com/example/myapp/proto"
)

func main() {
    listener, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    server := grpc.NewServer()

    // Register your services
    pb.RegisterUserServiceServer(server, &userService{})
    pb.RegisterOrderServiceServer(server, &orderService{})

    // Enable reflection for grpcurl and other tools
    reflection.Register(server)

    log.Println("Server with reflection enabled on :50051")
    if err := server.Serve(listener); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

### Enable Reflection in Python

```python
# server.py
import grpc
from concurrent import futures
from grpc_reflection.v1alpha import reflection

import user_service_pb2
import user_service_pb2_grpc

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Register your services
    user_service_pb2_grpc.add_UserServiceServicer_to_server(
        UserServiceServicer(), server
    )

    # Enable reflection
    SERVICE_NAMES = (
        user_service_pb2.DESCRIPTOR.services_by_name['UserService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)

    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()
```

### Enable Reflection in Node.js

```javascript
// server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const grpcReflection = require('grpc-reflection-js');

// Load proto
const packageDefinition = protoLoader.loadSync('service.proto');
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Create server
const server = new grpc.Server();

// Add services
server.addService(protoDescriptor.UserService.service, userServiceImpl);

// Add reflection service
const reflection = new grpcReflection.ReflectionService(packageDefinition);
reflection.addToServer(server);

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server with reflection on port 50051');
    server.start();
});
```

## Basic grpcurl Commands

### List Available Services

```bash
# List all services (requires reflection)
grpcurl -plaintext localhost:50051 list

# Output:
# grpc.reflection.v1alpha.ServerReflection
# mypackage.UserService
# mypackage.OrderService
```

### Describe a Service

```bash
# Show service methods
grpcurl -plaintext localhost:50051 describe mypackage.UserService

# Output:
# mypackage.UserService is a service:
# service UserService {
#   rpc CreateUser ( .mypackage.CreateUserRequest ) returns ( .mypackage.User );
#   rpc GetUser ( .mypackage.GetUserRequest ) returns ( .mypackage.User );
#   rpc ListUsers ( .mypackage.ListUsersRequest ) returns ( .mypackage.ListUsersResponse );
#   rpc UpdateUser ( .mypackage.UpdateUserRequest ) returns ( .mypackage.User );
#   rpc DeleteUser ( .mypackage.DeleteUserRequest ) returns ( .google.protobuf.Empty );
# }
```

### Describe a Message Type

```bash
# Show message structure
grpcurl -plaintext localhost:50051 describe mypackage.User

# Output:
# mypackage.User is a message:
# message User {
#   string user_id = 1;
#   string email = 2;
#   string name = 3;
#   int64 created_at = 4;
# }
```

## Making RPC Calls

### Unary Calls

```bash
# Simple request with JSON data
grpcurl -plaintext \
  -d '{"email": "john@example.com", "name": "John Doe", "password": "secret123"}' \
  localhost:50051 \
  mypackage.UserService/CreateUser

# Response:
# {
#   "userId": "user_123456",
#   "email": "john@example.com",
#   "name": "John Doe",
#   "createdAt": "1706140800"
# }

# Request with path parameters
grpcurl -plaintext \
  -d '{"user_id": "user_123456"}' \
  localhost:50051 \
  mypackage.UserService/GetUser

# Request with query-like parameters
grpcurl -plaintext \
  -d '{"page_size": 10, "page_token": ""}' \
  localhost:50051 \
  mypackage.UserService/ListUsers
```

### Using Proto Files Instead of Reflection

```bash
# When reflection is not available, use proto files
grpcurl -plaintext \
  -import-path ./protos \
  -proto user.proto \
  -d '{"user_id": "123"}' \
  localhost:50051 \
  mypackage.UserService/GetUser

# Using multiple proto files
grpcurl -plaintext \
  -import-path ./protos \
  -import-path ./third_party \
  -proto user.proto \
  -proto common.proto \
  localhost:50051 \
  list
```

## Streaming with grpcurl

```mermaid
flowchart TB
    subgraph Unary["Unary RPC"]
        A1[Request] --> B1[Response]
    end

    subgraph ServerStream["Server Streaming"]
        A2[Request] --> B2[Response 1]
        A2 --> C2[Response 2]
        A2 --> D2[Response N]
    end

    subgraph ClientStream["Client Streaming"]
        A3[Request 1] --> D3[Response]
        B3[Request 2] --> D3
        C3[Request N] --> D3
    end

    subgraph BiDi["Bidirectional"]
        A4[Request 1] --> B4[Response 1]
        C4[Request 2] --> D4[Response 2]
    end
```

### Server-Side Streaming

```bash
# Subscribe to server stream
grpcurl -plaintext \
  -d '{"topics": ["orders", "inventory"], "client_id": "debug-client"}' \
  localhost:50051 \
  mypackage.StreamService/SubscribeToUpdates

# Stream query results
grpcurl -plaintext \
  -d '{"query": "SELECT * FROM users", "batch_size": 100}' \
  localhost:50051 \
  mypackage.StreamService/StreamQueryResults
```

### Client-Side Streaming

```bash
# Send multiple messages (one per line)
grpcurl -plaintext \
  -d @ \
  localhost:50051 \
  mypackage.FileService/UploadFile <<EOF
{"data": "Y2h1bmsxZGF0YQ==", "filename": "test.txt", "offset": 0}
{"data": "Y2h1bmsyZGF0YQ==", "filename": "test.txt", "offset": 1024}
{"data": "", "filename": "test.txt", "is_last": true}
EOF
```

### Bidirectional Streaming

```bash
# Interactive bidirectional stream
grpcurl -plaintext \
  -d @ \
  localhost:50051 \
  mypackage.ChatService/Chat <<EOF
{"message": "Hello"}
{"message": "How are you?"}
{"message": "Goodbye"}
EOF
```

## Authentication and TLS

### TLS Connection

```bash
# Connect with TLS (default port 443)
grpcurl api.example.com:443 list

# With custom CA certificate
grpcurl -cacert /path/to/ca.crt \
  api.example.com:443 \
  list

# Skip certificate verification (development only)
grpcurl -insecure \
  api.example.com:443 \
  list

# Mutual TLS (mTLS)
grpcurl \
  -cacert /path/to/ca.crt \
  -cert /path/to/client.crt \
  -key /path/to/client.key \
  api.example.com:443 \
  list
```

### Authentication Headers

```bash
# Bearer token authentication
grpcurl -plaintext \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  localhost:50051 \
  mypackage.UserService/GetUser

# API key authentication
grpcurl -plaintext \
  -H 'X-API-Key: your-api-key-here' \
  localhost:50051 \
  mypackage.UserService/ListUsers

# Multiple headers
grpcurl -plaintext \
  -H 'Authorization: Bearer token' \
  -H 'X-Request-ID: debug-123' \
  -H 'X-Trace-ID: trace-456' \
  -d '{"user_id": "123"}' \
  localhost:50051 \
  mypackage.UserService/GetUser
```

## Advanced Usage

### Verbose Output for Debugging

```bash
# Show request and response headers
grpcurl -plaintext -v \
  -d '{"user_id": "123"}' \
  localhost:50051 \
  mypackage.UserService/GetUser

# Output includes:
# Resolved method descriptor:
# rpc GetUser ( .mypackage.GetUserRequest ) returns ( .mypackage.User );
#
# Request metadata to send:
# content-type: application/grpc
#
# Response headers received:
# content-type: application/grpc
# grpc-accept-encoding: gzip
#
# Response contents:
# {
#   "userId": "123",
#   "email": "john@example.com"
# }
#
# Response trailers received:
# (empty)
# Sent 1 request and received 1 response
```

### Format Output

```bash
# Default JSON output (pretty printed)
grpcurl -plaintext \
  -d '{}' \
  localhost:50051 \
  mypackage.UserService/ListUsers

# Compact JSON (for scripting)
grpcurl -plaintext \
  -format json \
  -d '{}' \
  localhost:50051 \
  mypackage.UserService/ListUsers

# Parse with jq
grpcurl -plaintext \
  -d '{}' \
  localhost:50051 \
  mypackage.UserService/ListUsers | jq '.users[].email'
```

### Timeouts and Deadlines

```bash
# Set connection timeout
grpcurl -plaintext \
  -connect-timeout 5 \
  localhost:50051 \
  list

# Set maximum time for the entire call
grpcurl -plaintext \
  -max-time 30 \
  -d '{"query": "long running query"}' \
  localhost:50051 \
  mypackage.DataService/RunQuery
```

### Health Checks

```bash
# Check overall health
grpcurl -plaintext \
  localhost:50051 \
  grpc.health.v1.Health/Check

# Check specific service health
grpcurl -plaintext \
  -d '{"service": "mypackage.UserService"}' \
  localhost:50051 \
  grpc.health.v1.Health/Check

# Watch health status
grpcurl -plaintext \
  -d '{"service": "mypackage.UserService"}' \
  localhost:50051 \
  grpc.health.v1.Health/Watch
```

## Common Debugging Scenarios

### Debug Script for Service Investigation

```bash
#!/bin/bash
# debug_grpc.sh - Comprehensive gRPC service debugging

HOST=${1:-localhost}
PORT=${2:-50051}
TARGET="$HOST:$PORT"

echo "============================================"
echo "gRPC Service Debug Report"
echo "Target: $TARGET"
echo "Time: $(date)"
echo "============================================"
echo ""

echo "1. Connection Test"
echo "-------------------"
if grpcurl -plaintext -connect-timeout 5 $TARGET list > /dev/null 2>&1; then
    echo "Connection: SUCCESS"
else
    echo "Connection: FAILED"
    echo "Trying with TLS..."
    if grpcurl -insecure -connect-timeout 5 $TARGET list > /dev/null 2>&1; then
        echo "TLS Connection: SUCCESS"
        TARGET_FLAGS="-insecure"
    else
        echo "TLS Connection: FAILED"
        exit 1
    fi
fi
echo ""

echo "2. Available Services"
echo "---------------------"
grpcurl ${TARGET_FLAGS:--plaintext} $TARGET list
echo ""

echo "3. Service Details"
echo "------------------"
for service in $(grpcurl ${TARGET_FLAGS:--plaintext} $TARGET list | grep -v reflection); do
    echo "Service: $service"
    grpcurl ${TARGET_FLAGS:--plaintext} $TARGET describe $service
    echo ""
done

echo "4. Health Check"
echo "---------------"
grpcurl ${TARGET_FLAGS:--plaintext} \
    -d '{}' \
    $TARGET \
    grpc.health.v1.Health/Check 2>/dev/null || echo "Health service not available"
echo ""

echo "5. Sample Calls"
echo "---------------"
echo "Use these commands to test methods:"
for service in $(grpcurl ${TARGET_FLAGS:--plaintext} $TARGET list | grep -v reflection); do
    methods=$(grpcurl ${TARGET_FLAGS:--plaintext} $TARGET describe $service | grep "rpc " | awk '{print $2}')
    for method in $methods; do
        echo "  grpcurl ${TARGET_FLAGS:--plaintext} -d '{}' $TARGET $service/$method"
    done
done
```

### Troubleshooting Connection Issues

```bash
# Test basic connectivity
nc -zv localhost 50051

# Check if reflection is enabled
grpcurl -plaintext localhost:50051 list 2>&1

# Common error: "Failed to list services"
# Solution: Enable reflection or use proto files
grpcurl -plaintext \
  -import-path ./protos \
  -proto service.proto \
  localhost:50051 \
  list

# Common error: "connection refused"
# Check if server is running and port is correct
lsof -i :50051

# Common error: "deadline exceeded"
# Increase timeout
grpcurl -plaintext \
  -connect-timeout 30 \
  -max-time 60 \
  localhost:50051 \
  list
```

### Testing Error Handling

```bash
# Test with invalid data to verify error handling
grpcurl -plaintext \
  -d '{"user_id": ""}' \
  localhost:50051 \
  mypackage.UserService/GetUser

# Expected error response:
# ERROR:
#   Code: InvalidArgument
#   Message: user_id is required

# Test with non-existent resource
grpcurl -plaintext \
  -d '{"user_id": "nonexistent"}' \
  localhost:50051 \
  mypackage.UserService/GetUser

# Expected error response:
# ERROR:
#   Code: NotFound
#   Message: user not found
```

### Load Testing with grpcurl

```bash
#!/bin/bash
# Simple load test script

CONCURRENT=10
TOTAL=100
TARGET="localhost:50051"
METHOD="mypackage.UserService/ListUsers"
DATA='{"page_size": 10}'

echo "Starting load test: $CONCURRENT concurrent, $TOTAL total requests"

time for i in $(seq 1 $TOTAL); do
    (
        grpcurl -plaintext -d "$DATA" $TARGET $METHOD > /dev/null 2>&1
        echo -n "."
    ) &

    # Control concurrency
    if (( i % CONCURRENT == 0 )); then
        wait
    fi
done

wait
echo ""
echo "Load test complete"
```

## Integration with Development Workflow

### Docker Compose with grpcurl

```yaml
# docker-compose.yml
version: '3.8'

services:
  grpc-server:
    build: .
    ports:
      - "50051:50051"
    healthcheck:
      test: ["CMD", "grpcurl", "-plaintext", "localhost:50051", "grpc.health.v1.Health/Check"]
      interval: 10s
      timeout: 5s
      retries: 3

  grpcurl:
    image: fullstorydev/grpcurl
    depends_on:
      grpc-server:
        condition: service_healthy
    entrypoint: ["sh", "-c"]
    command: ["grpcurl -plaintext grpc-server:50051 list"]
```

### CI/CD Integration

```yaml
# .github/workflows/grpc-test.yml
name: gRPC Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install grpcurl
        run: |
          curl -sSL https://github.com/fullstorydev/grpcurl/releases/download/v1.8.7/grpcurl_1.8.7_linux_x86_64.tar.gz | tar xz
          sudo mv grpcurl /usr/local/bin/

      - name: Start server
        run: |
          docker-compose up -d grpc-server
          sleep 5

      - name: Verify services
        run: |
          grpcurl -plaintext localhost:50051 list

      - name: Health check
        run: |
          grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check

      - name: Run integration tests
        run: |
          ./scripts/grpc_integration_tests.sh
```

---

grpcurl is an essential tool for debugging and testing gRPC services. Enable server reflection in development environments for the best experience, and use proto files when reflection is disabled in production. Combine grpcurl with shell scripting for automated testing and monitoring.
