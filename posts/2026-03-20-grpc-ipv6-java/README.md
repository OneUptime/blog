# How to Configure gRPC Servers with IPv6 in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Java, IPv6, Spring Boot, API

Description: Configure Java gRPC servers using grpc-java to listen on IPv6 addresses and handle dual-stack deployments.

## Dependencies (Maven)

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-netty-shaded</artifactId>
        <version>1.63.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-protobuf</artifactId>
        <version>1.63.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-stub</artifactId>
        <version>1.63.0</version>
    </dependency>
</dependencies>
```

## Step 1: gRPC Server on IPv6

```java
// HelloWorldServer.java
import io.grpc.Server;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.concurrent.TimeUnit;

public class HelloWorldServer {
    private Server server;

    public void start() throws Exception {
        // Bind to all IPv6 interfaces using ::
        InetAddress ipv6WildCard = InetAddress.getByName("::");
        InetSocketAddress listenAddress = new InetSocketAddress(ipv6WildCard, 50051);

        server = NettyServerBuilder
            .forAddress(listenAddress)
            .intercept(new GrpcClientAddressInterceptor())
            .addService(new GreeterImpl())
            .build()
            .start();

        System.out.println("gRPC server started on [::]:50051");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                server.shutdown().awaitTermination(30, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));
    }

    public static void main(String[] args) throws Exception {
        HelloWorldServer server = new HelloWorldServer();
        server.start();
        server.server.awaitTermination();
    }
}
```

## Step 2: Service Implementation

```java
// GreeterImpl.java
import io.grpc.stub.StreamObserver;

import java.net.SocketAddress;

public class GreeterImpl extends GreeterGrpc.GreeterImplBase {

    @Override
    public void sayHello(HelloRequest request, StreamObserver<HelloReply> responseObserver) {
        SocketAddress peerAddress = GrpcClientAddressInterceptor.REMOTE_ADDRESS.get();

        System.out.println("Request from: " + peerAddress);

        HelloReply reply = HelloReply.newBuilder()
            .setMessage("Hello, " + request.getName())
            .build();

        responseObserver.onNext(reply);
        responseObserver.onCompleted();
    }
}
```

## Step 3: gRPC Client Connecting to IPv6

```java
// HelloWorldClient.java
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;

import java.net.InetAddress;
import java.net.InetSocketAddress;

public class HelloWorldClient {

    public static void main(String[] args) throws Exception {
        // Connect to the local IPv6 gRPC server
        InetAddress ipv6Server = InetAddress.getByName("::1");
        InetSocketAddress serverAddress = new InetSocketAddress(ipv6Server, 50051);

        ManagedChannel channel = NettyChannelBuilder
            .forAddress(serverAddress)
            .usePlaintext()
            .build();

        GreeterGrpc.GreeterBlockingStub stub = GreeterGrpc.newBlockingStub(channel);

        HelloReply response = stub.sayHello(
            HelloRequest.newBuilder().setName("World").build()
        );

        System.out.println("Response: " + response.getMessage());
        channel.shutdown();
    }
}
```

## Step 4: Spring Boot gRPC with IPv6

Using `grpc-spring-boot-starter`:

```xml
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
</dependency>
```

```yaml
# application.yml

grpc:
  server:
    # Bind to all IPv6 interfaces
    address: "::"
    port: 50051
  client:
    my-service:
      # Connect to IPv6 server
      address: "static://[::1]:50051"
      negotiation-type: PLAINTEXT
```

```java
@GrpcService(interceptors = GrpcClientAddressInterceptor.class)
public class GreeterService extends GreeterGrpc.GreeterImplBase {

    @Override
    public void sayHello(HelloRequest request, StreamObserver<HelloReply> response) {
        response.onNext(HelloReply.newBuilder()
            .setMessage("Hello " + request.getName())
            .build());
        response.onCompleted();
    }
}
```

## Step 5: Extract IPv6 Client Address

```java
import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Grpc;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;

import java.net.SocketAddress;

public class GrpcClientAddressInterceptor implements ServerInterceptor {

    public static final Context.Key<SocketAddress> REMOTE_ADDRESS =
        Context.key("remote-address");

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
        ServerCall<ReqT, RespT> call,
        Metadata headers,
        ServerCallHandler<ReqT, RespT> next
    ) {
        SocketAddress remoteAddress =
            call.getAttributes().get(Grpc.TRANSPORT_ATTR_REMOTE_ADDR);

        Context context = Context.current().withValue(REMOTE_ADDRESS, remoteAddress);
        return Contexts.interceptCall(context, call, headers, next);
    }
}
```

## Testing

```bash
# Test with grpcurl
# Requires server reflection, or pass -proto/-import-path explicitly
grpcurl -plaintext '[::1]:50051' list
grpcurl -plaintext -d '{"name":"World"}' '[::1]:50051' helloworld.Greeter/SayHello

# Health check
# Requires the gRPC health service to be registered and server reflection,
# or pass -proto/-import-path explicitly
grpcurl -plaintext -d '{"service":""}' '[::1]:50051' grpc.health.v1.Health/Check
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Java gRPC service over IPv6. Set up TCP availability monitors on port 50051 and, if you register the gRPC health service, health check monitors for the gRPC health protocol endpoint.

## Conclusion

Java gRPC servers bind to IPv6 using `InetAddress.getByName("::")` and `NettyServerBuilder.forAddress()`. Clients connect using `InetSocketAddress` with the IPv6 address. Spring Boot gRPC starters accept `::` for server binding and bracketed IPv6 literals in client URIs. On systems with IPv6 enabled, Java uses IPv6 sockets by default; whether that also accepts IPv4 traffic depends on the JVM and OS network settings.
