# How to Handle IPv6 in Go gRPC Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, gRPC, IPv6, Server, Networking, Protobuf

Description: Configure Go gRPC servers and clients to work with IPv6, including address binding, peer address extraction, and dual-stack support.

## IPv6 gRPC Server

gRPC in Go uses the standard `net.Listen` for binding, so IPv6 configuration is the same as any TCP server. Binding to `[::]:50051` listens on the IPv6 unspecified address; with network `"tcp"`, whether that also accepts IPv4 depends on the OS:

```go
package main

import (
    "context"
    "fmt"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/peer"
    pb "example.com/proto"
)

type greeterServer struct {
    pb.UnimplementedGreeterServer
}

func (s *greeterServer) SayHello(
    ctx context.Context,
    req *pb.HelloRequest,
) (*pb.HelloReply, error) {
    // Get client's remote address from gRPC peer info
    p, ok := peer.FromContext(ctx)
    clientAddr := "unknown"
    if ok {
        clientAddr = p.Addr.String()
    }

    fmt.Printf("Request from %s: name=%s\n", clientAddr, req.Name)

    return &pb.HelloReply{
        Message: fmt.Sprintf("Hello %s from IPv6 gRPC!", req.Name),
    }, nil
}

func main() {
    // Listen on the IPv6 unspecified address.
    // With network "tcp", whether this also accepts IPv4 depends on the OS.
    lis, err := net.Listen("tcp", "[::]:50051")
    if err != nil {
        panic(fmt.Sprintf("Failed to listen: %v", err))
    }

    s := grpc.NewServer()
    pb.RegisterGreeterServer(s, &greeterServer{})

    fmt.Println("gRPC server listening on [::]:50051")
    if err := s.Serve(lis); err != nil {
        panic(err)
    }
}
```

## IPv6-Only gRPC Server

For environments where only IPv6 is needed:

```go
package main

import (
    "fmt"
    "net"
    "google.golang.org/grpc"
)

func newIPv6GRPCServer(port int) (*grpc.Server, net.Listener, error) {
    addr := fmt.Sprintf("[::1]:%d", port)  // Loopback only

    // Or for all interfaces:
    // addr := fmt.Sprintf("[::]:%d", port)

    lis, err := net.Listen("tcp6", addr)
    if err != nil {
        return nil, nil, fmt.Errorf("listen: %w", err)
    }

    server := grpc.NewServer(
        grpc.UnaryInterceptor(ipv6LoggingInterceptor),
    )

    return server, lis, nil
}
```

## Extracting IPv6 Client Address in Interceptors

```go
package main

import (
    "context"
    "fmt"
    "net"
    "net/netip"

    "google.golang.org/grpc"
    "google.golang.org/grpc/peer"
)

func ipv6LoggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    // Extract client address from peer info
    if p, ok := peer.FromContext(ctx); ok {
        addr := extractIPv6FromAddr(p.Addr)
        fmt.Printf("gRPC call %s from [%s]\n", info.FullMethod, addr)
    }
    return handler(ctx, req)
}

func extractIPv6FromAddr(addr net.Addr) string {
    if addr == nil {
        return "unknown"
    }

    host, _, err := net.SplitHostPort(addr.String())
    if err != nil {
        return addr.String()
    }

    // Normalize and potentially unmap IPv4-mapped IPv6
    netipAddr, err := netip.ParseAddr(host)
    if err != nil {
        return host
    }
    return netipAddr.Unmap().String()
}
```

## IPv6 gRPC Client

```go
package main

import (
    "context"
    "fmt"
    "net"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    pb "example.com/proto"
)

func createIPv6GRPCClient(serverAddr string) (*grpc.ClientConn, error) {
    // serverAddr should be [host]:port format for IPv6
    // e.g., "[2001:db8::1]:50051"
    conn, err := grpc.NewClient(
        serverAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        // Force IPv6 dialing
        grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
            d := &net.Dialer{}
            return d.DialContext(ctx, "tcp6", addr)
        }),
    )
    return conn, err
}

func main() {
    conn, err := createIPv6GRPCClient("[::1]:50051")
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    client := pb.NewGreeterClient(conn)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "IPv6 World"})
    if err != nil {
        panic(err)
    }
    fmt.Println("Response:", resp.Message)
}
```

## Health Check Server on IPv6

```go
package main

import (
    "fmt"
    "net"
    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
)

func setupGRPCWithHealth(port int) error {
    lis, err := net.Listen("tcp6", fmt.Sprintf("[::]:%d", port))
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }

    s := grpc.NewServer()
    healthServer := health.NewServer()
    grpc_health_v1.RegisterHealthServer(s, healthServer)

    // Mark services as healthy
    healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)

    return s.Serve(lis)
}
```

## Conclusion

Go gRPC servers support IPv6 by using the standard Go networking APIs. `net.Listen("tcp6", "[::]:port")` is IPv6-only, while `net.Listen("tcp", "[::]:port")` listens on the IPv6 unspecified address and may also accept IPv4 depending on the OS. The `peer.FromContext()` function extracts client addresses from gRPC contexts, and custom dialers in `grpc.NewClient` can force IPv6 connections for clients. gRPC interceptors provide a clean place to log or enforce policies on IPv6 connections.
