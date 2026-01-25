# How to Build gRPC Services with grpcio in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, gRPC, Microservices, Protocol Buffers, API Design, Performance

Description: Learn how to build high-performance gRPC services in Python using grpcio. This guide covers service definitions, server implementation, client usage, streaming patterns, and production deployment tips.

---

> gRPC provides efficient, strongly-typed communication between services. Unlike REST, it uses Protocol Buffers for serialization and HTTP/2 for transport, resulting in smaller payloads and faster calls. This guide walks through building production-ready gRPC services in Python.

When you need low-latency communication between microservices, gRPC often beats REST. The binary protocol is more compact, streaming is built-in, and code generation ensures type safety across languages. Python's `grpcio` library makes it straightforward to build both servers and clients.

---

## Setting Up gRPC

First, install the required packages:

```bash
pip install grpcio==1.60.0 grpcio-tools==1.60.0
```

### Project Structure

```
myservice/
    protos/
        user_service.proto
    generated/
        __init__.py
        user_service_pb2.py
        user_service_pb2_grpc.py
    server.py
    client.py
```

---

## Defining the Service with Protocol Buffers

Protocol Buffers (protobuf) define your service interface and message types. This contract is shared between server and client.

```protobuf
// protos/user_service.proto
// User service definition for gRPC
syntax = "proto3";

package userservice;

// Request message for getting a user
message GetUserRequest {
    int32 user_id = 1;
}

// User data returned by the service
message User {
    int32 id = 1;
    string email = 2;
    string name = 3;
    bool is_active = 4;
    int64 created_at = 5;  // Unix timestamp
}

// Request for creating a new user
message CreateUserRequest {
    string email = 1;
    string name = 2;
    string password = 3;
}

// Request for listing users with pagination
message ListUsersRequest {
    int32 page = 1;
    int32 page_size = 2;
}

// Response containing a list of users
message ListUsersResponse {
    repeated User users = 1;
    int32 total = 2;
    bool has_more = 3;
}

// Request for streaming user updates
message UserUpdateRequest {
    int32 user_id = 1;
}

// Stream of user update events
message UserUpdate {
    int32 user_id = 1;
    string field = 2;
    string old_value = 3;
    string new_value = 4;
    int64 timestamp = 5;
}

// The user service definition
service UserService {
    // Unary RPC - single request, single response
    rpc GetUser(GetUserRequest) returns (User);
    rpc CreateUser(CreateUserRequest) returns (User);

    // Unary RPC with pagination
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);

    // Server streaming RPC - single request, stream of responses
    rpc WatchUserUpdates(UserUpdateRequest) returns (stream UserUpdate);

    // Client streaming RPC - stream of requests, single response
    rpc BatchCreateUsers(stream CreateUserRequest) returns (ListUsersResponse);

    // Bidirectional streaming RPC
    rpc SyncUsers(stream GetUserRequest) returns (stream User);
}
```

### Generating Python Code

```bash
# Generate Python code from proto file
python -m grpc_tools.protoc \
    -I./protos \
    --python_out=./generated \
    --grpc_python_out=./generated \
    ./protos/user_service.proto
```

This generates:
- `user_service_pb2.py`: Message classes
- `user_service_pb2_grpc.py`: Service stubs and server base class

---

## Implementing the gRPC Server

```python
# server.py
# gRPC server implementation for UserService
import grpc
from concurrent import futures
import time
from datetime import datetime
from typing import Iterator
import asyncio

# Import generated code
from generated import user_service_pb2 as pb2
from generated import user_service_pb2_grpc as pb2_grpc

# Simulated database
USERS_DB = {
    1: {"id": 1, "email": "alice@example.com", "name": "Alice", "is_active": True},
    2: {"id": 2, "email": "bob@example.com", "name": "Bob", "is_active": True},
    3: {"id": 3, "email": "charlie@example.com", "name": "Charlie", "is_active": False},
}

class UserServiceServicer(pb2_grpc.UserServiceServicer):
    """
    Implementation of the UserService gRPC service.
    Each method corresponds to an RPC defined in the proto file.
    """

    def GetUser(self, request: pb2.GetUserRequest, context: grpc.ServicerContext) -> pb2.User:
        """
        Unary RPC: Get a single user by ID.
        Returns the user or sets an error code if not found.
        """
        user_id = request.user_id

        if user_id not in USERS_DB:
            # Set gRPC status code for not found
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"User {user_id} not found")
            return pb2.User()

        user_data = USERS_DB[user_id]

        # Convert to protobuf message
        return pb2.User(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            is_active=user_data["is_active"],
            created_at=int(datetime.utcnow().timestamp())
        )

    def CreateUser(self, request: pb2.CreateUserRequest, context: grpc.ServicerContext) -> pb2.User:
        """
        Unary RPC: Create a new user.
        Validates input and returns the created user.
        """
        # Validate request
        if not request.email or not request.name:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Email and name are required")
            return pb2.User()

        # Check for duplicate email
        for user in USERS_DB.values():
            if user["email"] == request.email:
                context.set_code(grpc.StatusCode.ALREADY_EXISTS)
                context.set_details("Email already registered")
                return pb2.User()

        # Create the user
        new_id = max(USERS_DB.keys()) + 1
        user_data = {
            "id": new_id,
            "email": request.email,
            "name": request.name,
            "is_active": True
        }
        USERS_DB[new_id] = user_data

        return pb2.User(
            id=new_id,
            email=request.email,
            name=request.name,
            is_active=True,
            created_at=int(datetime.utcnow().timestamp())
        )

    def ListUsers(self, request: pb2.ListUsersRequest, context: grpc.ServicerContext) -> pb2.ListUsersResponse:
        """
        Unary RPC: List users with pagination.
        """
        page = max(request.page, 1)
        page_size = min(max(request.page_size, 1), 100)  # Limit to 100

        # Get paginated users
        all_users = list(USERS_DB.values())
        start = (page - 1) * page_size
        end = start + page_size
        page_users = all_users[start:end]

        # Convert to protobuf messages
        users = [
            pb2.User(
                id=u["id"],
                email=u["email"],
                name=u["name"],
                is_active=u["is_active"]
            )
            for u in page_users
        ]

        return pb2.ListUsersResponse(
            users=users,
            total=len(all_users),
            has_more=end < len(all_users)
        )

    def WatchUserUpdates(
        self,
        request: pb2.UserUpdateRequest,
        context: grpc.ServicerContext
    ) -> Iterator[pb2.UserUpdate]:
        """
        Server streaming RPC: Stream updates for a specific user.
        The server sends updates as they occur.
        """
        user_id = request.user_id

        if user_id not in USERS_DB:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"User {user_id} not found")
            return

        # Simulate streaming updates
        # In production, this would listen to an event stream
        update_count = 0
        while not context.is_active() or update_count < 10:
            # Check if client disconnected
            if context.is_active() == False:
                break

            # Simulate an update event
            yield pb2.UserUpdate(
                user_id=user_id,
                field="last_seen",
                old_value="",
                new_value=str(datetime.utcnow().timestamp()),
                timestamp=int(datetime.utcnow().timestamp())
            )

            update_count += 1
            time.sleep(1)  # Send update every second

    def BatchCreateUsers(
        self,
        request_iterator: Iterator[pb2.CreateUserRequest],
        context: grpc.ServicerContext
    ) -> pb2.ListUsersResponse:
        """
        Client streaming RPC: Create multiple users from a stream of requests.
        Useful for bulk imports.
        """
        created_users = []

        for request in request_iterator:
            # Create each user
            new_id = max(USERS_DB.keys()) + 1 if USERS_DB else 1
            user_data = {
                "id": new_id,
                "email": request.email,
                "name": request.name,
                "is_active": True
            }
            USERS_DB[new_id] = user_data

            created_users.append(pb2.User(
                id=new_id,
                email=request.email,
                name=request.name,
                is_active=True
            ))

        return pb2.ListUsersResponse(
            users=created_users,
            total=len(created_users),
            has_more=False
        )

    def SyncUsers(
        self,
        request_iterator: Iterator[pb2.GetUserRequest],
        context: grpc.ServicerContext
    ) -> Iterator[pb2.User]:
        """
        Bidirectional streaming RPC: Client sends user IDs, server responds with user data.
        Useful for real-time sync scenarios.
        """
        for request in request_iterator:
            if request.user_id in USERS_DB:
                user_data = USERS_DB[request.user_id]
                yield pb2.User(
                    id=user_data["id"],
                    email=user_data["email"],
                    name=user_data["name"],
                    is_active=user_data["is_active"]
                )


def serve():
    """Start the gRPC server."""
    # Create a thread pool for handling requests
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            # Set max message sizes
            ("grpc.max_send_message_length", 50 * 1024 * 1024),
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ]
    )

    # Register the service
    pb2_grpc.add_UserServiceServicer_to_server(UserServiceServicer(), server)

    # Listen on port 50051
    server.add_insecure_port("[::]:50051")
    server.start()

    print("gRPC server running on port 50051...")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
```

---

## Building the gRPC Client

```python
# client.py
# gRPC client for UserService
import grpc
from typing import Iterator, List
from generated import user_service_pb2 as pb2
from generated import user_service_pb2_grpc as pb2_grpc

class UserServiceClient:
    """
    Client for interacting with the UserService gRPC server.
    Handles connection management and provides typed methods.
    """

    def __init__(self, host: str = "localhost", port: int = 50051):
        # Create a channel to the server
        self.channel = grpc.insecure_channel(
            f"{host}:{port}",
            options=[
                ("grpc.max_send_message_length", 50 * 1024 * 1024),
                ("grpc.max_receive_message_length", 50 * 1024 * 1024),
            ]
        )
        # Create a stub (client interface)
        self.stub = pb2_grpc.UserServiceStub(self.channel)

    def close(self):
        """Close the channel when done."""
        self.channel.close()

    def get_user(self, user_id: int) -> dict:
        """
        Get a single user by ID.
        Returns user data or raises an exception.
        """
        request = pb2.GetUserRequest(user_id=user_id)

        try:
            response = self.stub.GetUser(request, timeout=5.0)
            return {
                "id": response.id,
                "email": response.email,
                "name": response.name,
                "is_active": response.is_active
            }
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.NOT_FOUND:
                raise ValueError(f"User {user_id} not found")
            raise

    def create_user(self, email: str, name: str, password: str) -> dict:
        """Create a new user."""
        request = pb2.CreateUserRequest(
            email=email,
            name=name,
            password=password
        )

        try:
            response = self.stub.CreateUser(request, timeout=5.0)
            return {
                "id": response.id,
                "email": response.email,
                "name": response.name,
                "is_active": response.is_active
            }
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.ALREADY_EXISTS:
                raise ValueError("Email already registered")
            raise

    def list_users(self, page: int = 1, page_size: int = 10) -> dict:
        """List users with pagination."""
        request = pb2.ListUsersRequest(page=page, page_size=page_size)
        response = self.stub.ListUsers(request, timeout=5.0)

        return {
            "users": [
                {"id": u.id, "email": u.email, "name": u.name}
                for u in response.users
            ],
            "total": response.total,
            "has_more": response.has_more
        }

    def watch_user_updates(self, user_id: int) -> Iterator[dict]:
        """
        Stream updates for a specific user.
        Yields update events as they arrive.
        """
        request = pb2.UserUpdateRequest(user_id=user_id)

        # Returns a response iterator
        for update in self.stub.WatchUserUpdates(request):
            yield {
                "user_id": update.user_id,
                "field": update.field,
                "old_value": update.old_value,
                "new_value": update.new_value,
                "timestamp": update.timestamp
            }

    def batch_create_users(self, users: List[dict]) -> dict:
        """
        Create multiple users in a single streaming call.
        More efficient than individual calls.
        """
        def request_generator():
            for user in users:
                yield pb2.CreateUserRequest(
                    email=user["email"],
                    name=user["name"],
                    password=user.get("password", "")
                )

        response = self.stub.BatchCreateUsers(request_generator(), timeout=30.0)

        return {
            "created": [
                {"id": u.id, "email": u.email, "name": u.name}
                for u in response.users
            ],
            "total": response.total
        }


# Example usage
if __name__ == "__main__":
    client = UserServiceClient()

    try:
        # Get a user
        user = client.get_user(1)
        print(f"Got user: {user}")

        # Create a user
        new_user = client.create_user(
            email="newuser@example.com",
            name="New User",
            password="secret123"
        )
        print(f"Created user: {new_user}")

        # List users
        users = client.list_users(page=1, page_size=10)
        print(f"Users: {users}")

        # Watch for updates (streaming)
        print("Watching for updates...")
        for update in client.watch_user_updates(1):
            print(f"Update: {update}")
            break  # Just get one for demo

    finally:
        client.close()
```

---

## Async gRPC Server

For high-concurrency scenarios, use async gRPC:

```python
# async_server.py
# Async gRPC server implementation
import asyncio
import grpc
from grpc import aio

from generated import user_service_pb2 as pb2
from generated import user_service_pb2_grpc as pb2_grpc

class AsyncUserServiceServicer(pb2_grpc.UserServiceServicer):
    """Async implementation of UserService."""

    async def GetUser(
        self,
        request: pb2.GetUserRequest,
        context: grpc.aio.ServicerContext
    ) -> pb2.User:
        """Async version of GetUser."""
        user_id = request.user_id

        # Simulate async database lookup
        await asyncio.sleep(0.01)

        # Return user data
        return pb2.User(
            id=user_id,
            email=f"user{user_id}@example.com",
            name=f"User {user_id}",
            is_active=True
        )

    async def WatchUserUpdates(
        self,
        request: pb2.UserUpdateRequest,
        context: grpc.aio.ServicerContext
    ):
        """Async server streaming."""
        user_id = request.user_id

        for i in range(10):
            if context.cancelled():
                break

            yield pb2.UserUpdate(
                user_id=user_id,
                field="status",
                new_value=f"update_{i}"
            )

            await asyncio.sleep(1)


async def serve_async():
    """Start the async gRPC server."""
    server = aio.server(
        options=[
            ("grpc.max_send_message_length", 50 * 1024 * 1024),
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ]
    )

    pb2_grpc.add_UserServiceServicer_to_server(
        AsyncUserServiceServicer(),
        server
    )

    server.add_insecure_port("[::]:50051")
    await server.start()

    print("Async gRPC server running on port 50051...")
    await server.wait_for_termination()


if __name__ == "__main__":
    asyncio.run(serve_async())
```

---

## Adding Interceptors for Logging and Auth

```python
# interceptors.py
# gRPC interceptors for cross-cutting concerns
import grpc
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LoggingInterceptor(grpc.ServerInterceptor):
    """
    Server interceptor that logs all incoming requests.
    Captures method name, duration, and status.
    """

    def intercept_service(self, continuation, handler_call_details):
        # Get the method being called
        method = handler_call_details.method
        start_time = time.time()

        # Call the actual handler
        handler = continuation(handler_call_details)

        # Log after the call completes
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"gRPC call: {method} completed in {duration_ms:.2f}ms")

        return handler

class AuthInterceptor(grpc.ServerInterceptor):
    """
    Server interceptor that validates authentication tokens.
    Checks for a valid token in the request metadata.
    """

    def __init__(self, valid_tokens: set):
        self._valid_tokens = valid_tokens

    def intercept_service(self, continuation, handler_call_details):
        # Extract metadata
        metadata = dict(handler_call_details.invocation_metadata)
        token = metadata.get("authorization", "")

        # Validate token
        if token not in self._valid_tokens:
            # Return an error handler
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: self._unauthenticated(ctx)
            )

        return continuation(handler_call_details)

    def _unauthenticated(self, context):
        context.set_code(grpc.StatusCode.UNAUTHENTICATED)
        context.set_details("Invalid or missing authentication token")
        return None


# Using interceptors when creating the server
def create_server_with_interceptors():
    interceptors = [
        LoggingInterceptor(),
        AuthInterceptor(valid_tokens={"secret-token-123"})
    ]

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors
    )

    return server
```

---

## Health Checks for Kubernetes

```python
# health.py
# gRPC health check service for Kubernetes
from grpc_health.v1 import health_pb2, health_pb2_grpc
from grpc_health.v1.health import HealthServicer

def add_health_check(server):
    """
    Add the standard gRPC health check service.
    Kubernetes uses this to determine pod readiness.
    """
    health_servicer = HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # Set service status
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)
    health_servicer.set("userservice.UserService", health_pb2.HealthCheckResponse.SERVING)

    return health_servicer
```

---

## Best Practices

### 1. Use Deadlines

Always set timeouts on client calls to prevent hanging:

```python
response = stub.GetUser(request, timeout=5.0)
```

### 2. Handle Errors Properly

Use gRPC status codes appropriately:
- `NOT_FOUND` for missing resources
- `INVALID_ARGUMENT` for bad input
- `ALREADY_EXISTS` for duplicates
- `UNAUTHENTICATED` for auth failures

### 3. Keep Messages Small

Protocol Buffers are efficient, but avoid sending huge messages. Stream large datasets instead of returning them in single responses.

### 4. Version Your Proto Files

Include version numbers in package names to handle API evolution:

```protobuf
package userservice.v1;
```

---

## Conclusion

gRPC with Python provides a robust foundation for microservice communication. The key benefits:

- Strong typing through Protocol Buffers
- Efficient binary serialization
- Built-in streaming support
- Code generation for type-safe clients
- HTTP/2 transport with multiplexing

Start with simple unary RPCs, then add streaming as your requirements grow.

---

*Running gRPC services in production? [OneUptime](https://oneuptime.com) monitors service health, tracks latencies, and alerts on errors across your microservice mesh.*

**Related Reading:**
- [How to Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Implement Structured Logging with OpenTelemetry in Python](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
