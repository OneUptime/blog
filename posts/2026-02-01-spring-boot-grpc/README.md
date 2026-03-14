# How to Use gRPC with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, gRPC, Protocol Buffers, Microservices, RPC

Description: A practical guide to implementing gRPC services and clients in Spring Boot with Protocol Buffers.

---

gRPC has become a popular choice for building high-performance microservices. Unlike REST APIs that use JSON over HTTP/1.1, gRPC uses Protocol Buffers for serialization and HTTP/2 for transport. This combination delivers significant performance improvements - smaller payloads, bidirectional streaming, and multiplexed connections.

In this guide, we will walk through building gRPC services and clients with Spring Boot. We will cover everything from defining proto files to implementing streaming endpoints and handling errors properly.

## Why gRPC Over REST?

Before diving into code, let's understand when gRPC makes sense:

- **Performance**: Protocol Buffers are binary and much smaller than JSON. HTTP/2 multiplexing reduces connection overhead.
- **Strong typing**: Proto files define contracts that generate type-safe code in multiple languages.
- **Streaming**: Native support for client streaming, server streaming, and bidirectional streaming.
- **Code generation**: Auto-generated stubs eliminate boilerplate and reduce errors.

That said, REST still wins for browser-facing APIs and when human readability matters. Use gRPC for internal service-to-service communication where performance is critical.

## Project Setup

We will use the `grpc-spring-boot-starter` library from LogNet. It integrates cleanly with Spring Boot and handles the gRPC server lifecycle automatically.

Start by creating a new Spring Boot project. Add these dependencies to your `pom.xml`:

```xml
<!-- Spring Boot parent and core dependencies -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <!-- Spring Boot starter for web capabilities -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    
    <!-- gRPC Spring Boot starter - handles server setup and bean wiring -->
    <dependency>
        <groupId>net.devh</groupId>
        <artifactId>grpc-spring-boot-starter</artifactId>
        <version>2.15.0.RELEASE</version>
    </dependency>
    
    <!-- gRPC and Protobuf runtime libraries -->
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-netty-shaded</artifactId>
        <version>1.59.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-protobuf</artifactId>
        <version>1.59.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-stub</artifactId>
        <version>1.59.0</version>
    </dependency>
    
    <!-- Testing dependencies -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-testing</artifactId>
        <version>1.59.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

You also need the protobuf compiler plugin to generate Java code from proto files:

```xml
<!-- Build plugins for compiling proto files -->
<build>
    <extensions>
        <!-- OS classifier extension for platform-specific protoc binary -->
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <!-- Use the protoc compiler matching your protobuf version -->
                <protocArtifact>com.google.protobuf:protoc:3.24.0:exe:${os.detected.classifier}</protocArtifact>
                <!-- Generate gRPC service stubs -->
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>io.grpc:protoc-gen-grpc-java:1.59.0:exe:${os.detected.classifier}</pluginArtifact>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <!-- Generate message classes and gRPC stubs -->
                        <goal>compile</goal>
                        <goal>compile-custom</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

## Defining Proto Files

Proto files describe your service contracts. Create them in `src/main/proto/`. Let's build a simple user service:

```protobuf
// src/main/proto/user.proto
// Define the proto syntax version - proto3 is the current standard
syntax = "proto3";

// Java package for generated code
option java_package = "com.example.grpc.user";
option java_multiple_files = true;

// Package name for the proto definitions
package user;

// Request message for getting a user by ID
message GetUserRequest {
    string user_id = 1;  // Field number 1 - used for binary encoding
}

// Request message for creating a new user
message CreateUserRequest {
    string name = 1;
    string email = 2;
    int32 age = 3;
}

// Response message containing user details
message UserResponse {
    string user_id = 1;
    string name = 2;
    string email = 3;
    int32 age = 4;
    int64 created_at = 5;  // Unix timestamp
}

// Empty message for requests that need no parameters
message Empty {}

// The UserService definition with all available RPC methods
service UserService {
    // Unary RPC - single request, single response
    rpc GetUser(GetUserRequest) returns (UserResponse);
    
    // Unary RPC for creating users
    rpc CreateUser(CreateUserRequest) returns (UserResponse);
    
    // Server streaming - returns multiple users over time
    rpc ListUsers(Empty) returns (stream UserResponse);
    
    // Client streaming - accepts multiple requests, returns single response
    rpc BatchCreateUsers(stream CreateUserRequest) returns (UserResponse);
    
    // Bidirectional streaming - both sides stream data
    rpc UserChat(stream GetUserRequest) returns (stream UserResponse);
}
```

Run `mvn compile` to generate Java classes from this proto file. You will find them in `target/generated-sources/protobuf/`.

## Implementing the gRPC Service

With the proto compiled, create a service implementation. The `@GrpcService` annotation registers your class as a gRPC service bean:

```java
// src/main/java/com/example/grpc/UserServiceImpl.java
package com.example.grpc;

import com.example.grpc.user.*;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Marks this class as a gRPC service - Spring will auto-register it
@GrpcService
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {
    
    // Simple in-memory store for demo purposes
    private final Map<String, UserResponse> userStore = new ConcurrentHashMap<>();
    
    // Unary RPC implementation - receives one request, sends one response
    @Override
    public void getUser(GetUserRequest request, StreamObserver<UserResponse> responseObserver) {
        String userId = request.getUserId();
        UserResponse user = userStore.get(userId);
        
        if (user != null) {
            // Send the response back to the client
            responseObserver.onNext(user);
            // Signal that the RPC is complete
            responseObserver.onCompleted();
        } else {
            // Handle not found case - we'll improve this in error handling section
            responseObserver.onError(
                io.grpc.Status.NOT_FOUND
                    .withDescription("User not found: " + userId)
                    .asRuntimeException()
            );
        }
    }
    
    // Create a new user and store it
    @Override
    public void createUser(CreateUserRequest request, StreamObserver<UserResponse> responseObserver) {
        // Generate a unique ID for the new user
        String userId = UUID.randomUUID().toString();
        
        // Build the response object using the proto-generated builder
        UserResponse user = UserResponse.newBuilder()
            .setUserId(userId)
            .setName(request.getName())
            .setEmail(request.getEmail())
            .setAge(request.getAge())
            .setCreatedAt(System.currentTimeMillis())
            .build();
        
        // Store and return the user
        userStore.put(userId, user);
        responseObserver.onNext(user);
        responseObserver.onCompleted();
    }
    
    // Server streaming - sends multiple responses for one request
    @Override
    public void listUsers(Empty request, StreamObserver<UserResponse> responseObserver) {
        // Stream each user to the client one at a time
        for (UserResponse user : userStore.values()) {
            responseObserver.onNext(user);
        }
        // Signal end of stream
        responseObserver.onCompleted();
    }
    
    // Client streaming - receives multiple requests, returns one response
    @Override
    public StreamObserver<CreateUserRequest> batchCreateUsers(StreamObserver<UserResponse> responseObserver) {
        // Return a StreamObserver that handles incoming requests
        return new StreamObserver<CreateUserRequest>() {
            private int count = 0;
            private UserResponse lastCreated;
            
            @Override
            public void onNext(CreateUserRequest request) {
                // Process each incoming user creation request
                String userId = UUID.randomUUID().toString();
                lastCreated = UserResponse.newBuilder()
                    .setUserId(userId)
                    .setName(request.getName())
                    .setEmail(request.getEmail())
                    .setAge(request.getAge())
                    .setCreatedAt(System.currentTimeMillis())
                    .build();
                userStore.put(userId, lastCreated);
                count++;
            }
            
            @Override
            public void onError(Throwable t) {
                // Handle client-side errors
                System.err.println("Batch create failed: " + t.getMessage());
            }
            
            @Override
            public void onCompleted() {
                // Client finished sending - return summary response
                responseObserver.onNext(lastCreated);
                responseObserver.onCompleted();
            }
        };
    }
}
```

## Configuring the gRPC Server

Configure the server port and other settings in `application.yml`:

```yaml
# gRPC server configuration
grpc:
  server:
    port: 9090                    # gRPC server port (separate from HTTP)
    enable-keep-alive: true       # Keep connections alive for better performance
    keep-alive-time: 30s          # Send keep-alive pings every 30 seconds
    keep-alive-timeout: 5s        # Wait 5 seconds for ping response
    permit-keep-alive-without-calls: true  # Allow keep-alive even when idle

# Standard Spring Boot server config (for health checks, metrics, etc.)
server:
  port: 8080

# Logging configuration for debugging gRPC calls
logging:
  level:
    io.grpc: DEBUG
    net.devh.boot.grpc: DEBUG
```

## Building a gRPC Client

The `grpc-spring-boot-starter` also simplifies client creation. Use the `@GrpcClient` annotation to inject a stub:

```java
// src/main/java/com/example/grpc/UserClient.java
package com.example.grpc;

import com.example.grpc.user.*;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
public class UserClient {
    
    // Inject a blocking stub for synchronous calls
    // The "user-service" name maps to configuration in application.yml
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub blockingStub;
    
    // Inject an async stub for streaming and non-blocking calls
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceStub asyncStub;
    
    // Synchronous method to fetch a user
    public UserResponse getUser(String userId) {
        GetUserRequest request = GetUserRequest.newBuilder()
            .setUserId(userId)
            .build();
        
        // Blocking call - waits for response
        return blockingStub.getUser(request);
    }
    
    // Synchronous method to create a user
    public UserResponse createUser(String name, String email, int age) {
        CreateUserRequest request = CreateUserRequest.newBuilder()
            .setName(name)
            .setEmail(email)
            .setAge(age)
            .build();
        
        return blockingStub.createUser(request);
    }
    
    // Demonstrate server streaming - collect all users into a list
    public java.util.List<UserResponse> listAllUsers() {
        java.util.List<UserResponse> users = new java.util.ArrayList<>();
        
        // iterator() returns all streamed responses
        blockingStub.listUsers(Empty.newBuilder().build())
            .forEachRemaining(users::add);
        
        return users;
    }
}
```

Configure the client connection in `application.yml`:

```yaml
# gRPC client configuration
grpc:
  client:
    user-service:                          # Name used in @GrpcClient annotation
      address: static://localhost:9090     # Server address
      negotiation-type: plaintext          # Use plaintext for local dev (use TLS in prod)
      enable-keep-alive: true
      keep-alive-time: 30s
```

## Error Handling

gRPC uses status codes similar to HTTP but with different semantics. Here's how to handle errors properly:

```java
// src/main/java/com/example/grpc/GrpcExceptionHandler.java
package com.example.grpc;

import io.grpc.*;
import net.devh.boot.grpc.server.advice.GrpcAdvice;
import net.devh.boot.grpc.server.advice.GrpcExceptionHandler;

// Global exception handler for all gRPC services
@GrpcAdvice
public class GlobalGrpcExceptionHandler {
    
    // Handle validation exceptions
    @GrpcExceptionHandler(IllegalArgumentException.class)
    public Status handleInvalidArgument(IllegalArgumentException e) {
        return Status.INVALID_ARGUMENT
            .withDescription(e.getMessage())
            .withCause(e);
    }
    
    // Handle not found exceptions
    @GrpcExceptionHandler(NotFoundException.class)
    public Status handleNotFound(NotFoundException e) {
        return Status.NOT_FOUND
            .withDescription(e.getMessage());
    }
    
    // Catch-all for unexpected errors
    @GrpcExceptionHandler(Exception.class)
    public Status handleGenericException(Exception e) {
        // Log the full exception for debugging
        System.err.println("Unexpected gRPC error: " + e.getMessage());
        e.printStackTrace();
        
        // Return generic error to client (don't leak internal details)
        return Status.INTERNAL
            .withDescription("An internal error occurred");
    }
}

// Custom exception class for not found scenarios
class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

On the client side, catch `StatusRuntimeException`:

```java
// Client-side error handling example
public UserResponse getUserSafely(String userId) {
    try {
        return blockingStub.getUser(
            GetUserRequest.newBuilder().setUserId(userId).build()
        );
    } catch (StatusRuntimeException e) {
        // Extract the gRPC status code
        Status.Code code = e.getStatus().getCode();
        
        switch (code) {
            case NOT_FOUND:
                System.out.println("User not found: " + userId);
                return null;
            case INVALID_ARGUMENT:
                throw new IllegalArgumentException(e.getStatus().getDescription());
            case UNAVAILABLE:
                // Server is down - could implement retry logic here
                throw new RuntimeException("Service temporarily unavailable", e);
            default:
                throw new RuntimeException("gRPC call failed: " + e.getStatus(), e);
        }
    }
}
```

## Testing gRPC Services

Testing gRPC requires some setup. Use `grpc-testing` for in-process testing without network calls:

```java
// src/test/java/com/example/grpc/UserServiceTest.java
package com.example.grpc;

import com.example.grpc.user.*;
import io.grpc.ManagedChannel;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.testing.GrpcCleanupRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.Rule;

import static org.junit.jupiter.api.Assertions.*;

public class UserServiceTest {
    
    // Automatically cleans up channels and servers after tests
    @Rule
    public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();
    
    private UserServiceGrpc.UserServiceBlockingStub blockingStub;
    
    @BeforeEach
    void setUp() throws Exception {
        // Generate a unique server name for isolation
        String serverName = InProcessServerBuilder.generateName();
        
        // Create an in-process server with our service implementation
        grpcCleanup.register(
            InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(new UserServiceImpl())
                .build()
                .start()
        );
        
        // Create a channel to the in-process server
        ManagedChannel channel = grpcCleanup.register(
            InProcessChannelBuilder.forName(serverName)
                .directExecutor()
                .build()
        );
        
        // Create a blocking stub for synchronous tests
        blockingStub = UserServiceGrpc.newBlockingStub(channel);
    }
    
    @Test
    void testCreateAndGetUser() {
        // Create a new user
        CreateUserRequest createRequest = CreateUserRequest.newBuilder()
            .setName("John Doe")
            .setEmail("john@example.com")
            .setAge(30)
            .build();
        
        UserResponse created = blockingStub.createUser(createRequest);
        
        // Verify the created user
        assertNotNull(created.getUserId());
        assertEquals("John Doe", created.getName());
        assertEquals("john@example.com", created.getEmail());
        assertEquals(30, created.getAge());
        
        // Fetch the same user and verify
        GetUserRequest getRequest = GetUserRequest.newBuilder()
            .setUserId(created.getUserId())
            .build();
        
        UserResponse fetched = blockingStub.getUser(getRequest);
        assertEquals(created.getUserId(), fetched.getUserId());
        assertEquals(created.getName(), fetched.getName());
    }
    
    @Test
    void testGetUserNotFound() {
        GetUserRequest request = GetUserRequest.newBuilder()
            .setUserId("non-existent-id")
            .build();
        
        // Verify that NOT_FOUND status is returned
        io.grpc.StatusRuntimeException exception = assertThrows(
            io.grpc.StatusRuntimeException.class,
            () -> blockingStub.getUser(request)
        );
        
        assertEquals(io.grpc.Status.Code.NOT_FOUND, exception.getStatus().getCode());
    }
}
```

For integration tests with Spring Boot, use `@SpringBootTest`:

```java
// Integration test with full Spring context
@SpringBootTest(properties = {
    "grpc.server.port=0",             // Random port for isolation
    "grpc.server.in-process-name=test"
})
public class UserServiceIntegrationTest {
    
    @GrpcClient("in-process-test")
    private UserServiceGrpc.UserServiceBlockingStub stub;
    
    @Test
    void testWithSpringContext() {
        // Test using injected stub with full Spring wiring
        CreateUserRequest request = CreateUserRequest.newBuilder()
            .setName("Integration Test")
            .setEmail("test@example.com")
            .setAge(25)
            .build();
        
        UserResponse response = stub.createUser(request);
        assertNotNull(response.getUserId());
    }
}
```

## Performance Tips

A few things to keep in mind when running gRPC in production:

1. **Connection pooling**: The client stub reuses connections automatically. Create one stub and share it across your application.

2. **Deadlines**: Always set deadlines to prevent hanging calls:

```java
// Set a 5-second deadline for this call
UserResponse response = blockingStub
    .withDeadlineAfter(5, TimeUnit.SECONDS)
    .getUser(request);
```

3. **Compression**: Enable gzip compression for large payloads:

```java
UserResponse response = blockingStub
    .withCompression("gzip")
    .getUser(request);
```

4. **Load balancing**: For multiple server instances, configure client-side load balancing:

```yaml
grpc:
  client:
    user-service:
      address: dns:///user-service.default.svc.cluster.local:9090
      default-load-balancing-policy: round_robin
```

## Wrapping Up

gRPC with Spring Boot gives you a powerful foundation for building high-performance microservices. The `grpc-spring-boot-starter` handles most of the boilerplate, letting you focus on business logic.

Start with simple unary calls, then add streaming when you need to transfer large datasets or implement real-time features. Remember to handle errors properly using gRPC status codes, and always set deadlines on client calls.

The type safety from Protocol Buffers catches many bugs at compile time, and the generated code eliminates a whole class of serialization issues. Once you get comfortable with the proto-first workflow, you will find it much cleaner than maintaining OpenAPI specs.

---

*Monitor gRPC services with [OneUptime](https://oneuptime.com) - track call latencies and error rates.*
