# How to Implement Envoy gRPC Transcoding for REST to gRPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, gRPC, REST, API Gateway, Protocol

Description: Learn how to use Envoy's gRPC transcoding filter to expose gRPC services as RESTful APIs, enabling seamless integration between HTTP/JSON clients and gRPC backends.

---

gRPC transcoding in Envoy solves a common problem: you have gRPC services that deliver excellent performance and type safety, but you need to support HTTP/JSON clients that don't speak gRPC. Instead of writing separate REST endpoints or maintaining parallel API implementations, Envoy can automatically translate HTTP/JSON requests into gRPC calls and convert the gRPC responses back to JSON.

This capability is especially valuable when you're gradually migrating from REST to gRPC, supporting mobile or web clients that prefer JSON, or building public APIs where you want to offer both gRPC and REST interfaces without duplicating code. Envoy handles the protocol translation transparently, including path-based routing, query parameter mapping, and request/response body conversion.

## Understanding gRPC Transcoding

Envoy's gRPC transcoding filter uses Google's HTTP/gRPC transcoding specification, which defines how HTTP requests map to gRPC method calls. The mapping relies on annotations in your protobuf files that specify HTTP routes, methods, and parameter bindings. Envoy reads your service's proto descriptor and uses these annotations to configure the translation layer.

The filter supports GET, POST, PUT, PATCH, and DELETE HTTP methods, maps URL paths to gRPC service methods, extracts parameters from URL paths and query strings, and handles JSON/Protobuf conversion automatically. The key requirement is that your proto files include the appropriate HTTP annotations from google.api.http.

## Defining a gRPC Service with HTTP Annotations

Let's start by creating a protobuf definition with HTTP annotations. This example defines a user management service:

```protobuf
// user_service.proto
syntax = "proto3";

package userservice;

import "google/api/annotations.proto";

// User message definition
message User {
  string id = 1;
  string name = 2;
  string email = 3;
  int32 age = 4;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message CreateUserRequest {
  User user = 1;
}

message CreateUserResponse {
  User user = 1;
  string message = 2;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}

message DeleteUserRequest {
  string id = 1;
}

message DeleteUserResponse {
  bool success = 1;
  string message = 2;
}

// Service definition with HTTP annotations
service UserService {
  // GET /v1/users/{id}
  rpc GetUser(GetUserRequest) returns (GetUserResponse) {
    option (google.api.http) = {
      get: "/v1/users/{id}"
    };
  }

  // POST /v1/users with JSON body
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse) {
    option (google.api.http) = {
      post: "/v1/users"
      body: "user"
    };
  }

  // GET /v1/users with query parameters
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse) {
    option (google.api.http) = {
      get: "/v1/users"
    };
  }

  // DELETE /v1/users/{id}
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse) {
    option (google.api.http) = {
      delete: "/v1/users/{id}"
    };
  }
}
```

The annotations map HTTP operations to gRPC methods. Path parameters like `{id}` automatically extract values into the corresponding protobuf message fields. The `body` field specifies which part of the request message comes from the HTTP body.

## Generating the Proto Descriptor

Envoy needs a compiled proto descriptor file that contains all the type information and HTTP annotations. Generate it using protoc:

```bash
# Install required dependencies
apt-get install -y protobuf-compiler

# Get the googleapis proto files (for google/api/annotations.proto)
git clone https://github.com/googleapis/googleapis.git

# Generate the descriptor file
protoc user_service.proto \
  -I. \
  -I./googleapis \
  --include_imports \
  --include_source_info \
  --descriptor_set_out=user_service.pb

# The descriptor file user_service.pb contains everything Envoy needs
```

The `--include_imports` flag ensures all dependencies (including the HTTP annotations) are included in the descriptor. This is critical for transcoding to work properly.

## Configuring Envoy for gRPC Transcoding

Now configure Envoy to use the gRPC transcoding filter with your proto descriptor:

```yaml
# envoy-grpc-transcoding.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: grpc_backend
                  timeout: 5s
          http_filters:
          # gRPC transcoding filter
          - name: envoy.filters.http.grpc_json_transcoder
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_json_transcoder.v3.GrpcJsonTranscoder
              # Load the proto descriptor
              proto_descriptor: "/etc/envoy/descriptors/user_service.pb"
              # Specify which services to transcode
              services:
              - "userservice.UserService"
              # Configuration options
              print_options:
                # Add whitespace to JSON output for readability
                add_whitespace: true
                # Always print primitive fields even if default values
                always_print_primitive_fields: true
                # Always print enums as integers
                always_print_enums_as_ints: false
                # Preserve proto field names in JSON
                preserve_proto_field_names: false
              # Handle unknown query parameters
              ignore_unknown_query_parameters: false
              # Convert gRPC status to HTTP status codes
              convert_grpc_status: true
              # URL unescape behavior
              url_unescape_spec: ALL_CHARACTERS_EXCEPT_RESERVED
              # Query parameter validation
              query_param_unescape_plus: true
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: grpc_backend
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: grpc_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: grpc-service
                port_value: 9090
    # Health checking for gRPC
    health_checks:
    - timeout: 1s
      interval: 10s
      unhealthy_threshold: 2
      healthy_threshold: 2
      grpc_health_check:
        service_name: "userservice.UserService"

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

## Testing the Transcoded API

With Envoy configured, you can now call your gRPC service using HTTP/JSON:

```bash
# GET request to retrieve a user
curl http://localhost:8080/v1/users/user-123

# Expected response:
# {
#   "user": {
#     "id": "user-123",
#     "name": "John Doe",
#     "email": "john@example.com",
#     "age": 30
#   }
# }

# POST request to create a user
curl -X POST http://localhost:8080/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "age": 28
    }
  }'

# GET request with query parameters
curl "http://localhost:8080/v1/users?page_size=10&page_token=abc123"

# DELETE request
curl -X DELETE http://localhost:8080/v1/users/user-456
```

The transcoding filter automatically converts these HTTP requests to gRPC calls, sends them to your backend service, and converts the gRPC responses back to JSON.

## Advanced HTTP Mapping Patterns

The HTTP annotations support sophisticated mapping patterns. Here are some advanced examples:

```protobuf
service UserService {
  // Multiple path parameters
  rpc GetUserAddress(GetUserAddressRequest) returns (GetUserAddressResponse) {
    option (google.api.http) = {
      get: "/v1/users/{user_id}/addresses/{address_id}"
    };
  }

  // Path parameter with custom pattern
  rpc GetUserByEmail(GetUserByEmailRequest) returns (GetUserByEmailResponse) {
    option (google.api.http) = {
      get: "/v1/users:byEmail"
      body: "*"
    };
  }

  // PATCH with partial update
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse) {
    option (google.api.http) = {
      patch: "/v1/users/{user.id}"
      body: "user"
    };
  }

  // Additional bindings for the same method
  rpc SearchUsers(SearchUsersRequest) returns (SearchUsersResponse) {
    option (google.api.http) = {
      get: "/v1/users:search"
      additional_bindings {
        post: "/v1/users:search"
        body: "*"
      }
    };
  }
}
```

## Error Handling and Status Code Mapping

The transcoding filter automatically maps gRPC status codes to HTTP status codes:

- OK (0) → 200 OK
- INVALID_ARGUMENT (3) → 400 Bad Request
- NOT_FOUND (5) → 404 Not Found
- PERMISSION_DENIED (7) → 403 Forbidden
- UNAUTHENTICATED (16) → 401 Unauthorized
- INTERNAL (13) → 500 Internal Server Error

To provide detailed error messages, return gRPC status with details:

```go
// Example Go gRPC server implementation
func (s *userServiceServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "user ID is required")
    }

    user, err := s.db.GetUser(ctx, req.Id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, status.Errorf(codes.NotFound, "user %s not found", req.Id)
        }
        return nil, status.Error(codes.Internal, "database error")
    }

    return &pb.GetUserResponse{User: user}, nil
}
```

## Streaming and Server-Sent Events

The transcoding filter has limited support for streaming. Unary (single request/response) RPCs work perfectly, but streaming RPCs require special handling:

```protobuf
service UserService {
  // Server streaming: can be exposed as Server-Sent Events
  rpc StreamUserUpdates(StreamUserUpdatesRequest) returns (stream UserUpdate) {
    option (google.api.http) = {
      get: "/v1/users/{user_id}/stream"
    };
  }
}
```

Configure Envoy to handle streaming:

```yaml
http_filters:
- name: envoy.filters.http.grpc_json_transcoder
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_json_transcoder.v3.GrpcJsonTranscoder
    proto_descriptor: "/etc/envoy/descriptors/user_service.pb"
    services:
    - "userservice.UserService"
    # Enable streaming support
    match_incoming_request_route: true
```

## Performance Considerations

gRPC transcoding adds some overhead compared to native gRPC:

1. JSON parsing and serialization is slower than protobuf
2. HTTP/1.1 doesn't support multiplexing like HTTP/2
3. The transcoding filter needs to buffer request/response bodies

For high-performance scenarios, encourage clients to use native gRPC when possible. Use transcoding for:

- Web browsers that can't speak gRPC
- Third-party integrations expecting REST APIs
- Legacy clients being migrated to gRPC
- Public APIs where developer experience matters more than raw performance

Monitor transcoding performance using Envoy stats:

```bash
# View transcoding metrics
curl http://localhost:9901/stats | grep grpc_json_transcoder
```

gRPC transcoding gives you the best of both worlds: the efficiency and type safety of gRPC internally, with the simplicity and broad compatibility of REST APIs externally. This approach lets you modernize your backend while maintaining backward compatibility with existing clients.
