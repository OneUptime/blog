# How to Set Up JWT Authentication for gRPC Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, gRPC, Authentication, Kubernetes, Security

Description: Step-by-step guide to configuring JWT token validation for gRPC services running in an Istio service mesh with practical examples.

---

gRPC services in Istio get JWT authentication almost for free - the Envoy sidecar handles token validation the same way it does for HTTP traffic. But there are some gRPC-specific details around how tokens are passed, how paths are structured, and how errors are returned that you need to understand to get it working properly.

This post covers the full setup from RequestAuthentication through AuthorizationPolicy, with specifics for gRPC workloads.

## How gRPC Carries JWT Tokens

In HTTP/REST APIs, JWT tokens typically travel in the `Authorization: Bearer <token>` header. gRPC uses the same mechanism since gRPC runs on top of HTTP/2. The token goes in the metadata (which maps to HTTP/2 headers):

```go
// Go gRPC client example
md := metadata.New(map[string]string{
    "authorization": "Bearer " + token,
})
ctx := metadata.NewOutgoingContext(context.Background(), md)
resp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: "123"})
```

```python
# Python gRPC client example
metadata = [('authorization', 'Bearer ' + token)]
response = stub.GetUser(request, metadata=metadata)
```

Istio's Envoy sidecar intercepts the HTTP/2 connection and reads the Authorization header just like it would for HTTP/1.1 traffic. No special gRPC configuration is needed for token extraction.

## Basic RequestAuthentication for gRPC

The RequestAuthentication resource for gRPC services looks identical to HTTP services:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: grpc-jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "grpc-service-audience"
```

Apply it:

```bash
kubectl apply -f grpc-jwt-auth.yaml
```

This tells Istio to validate any JWT token present in requests to pods labeled `app: grpc-service`.

## Requiring JWT with AuthorizationPolicy

To enforce that every gRPC call carries a valid JWT:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-grpc
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

With this in place, unauthenticated gRPC calls receive a gRPC status code `PERMISSION_DENIED` (code 7) instead of the HTTP 403 you'd see with REST APIs. Istio translates the HTTP status codes to gRPC status codes automatically because it knows the traffic is HTTP/2 with gRPC content type.

## gRPC Path Format for Fine-Grained Policies

gRPC requests have paths that follow the pattern `/<package.ServiceName>/<MethodName>`. For example, if you have this proto definition:

```protobuf
package myapp.users;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc DeleteUser (DeleteUserRequest) returns (Empty);
}
```

The HTTP/2 paths for these methods would be:

- `/myapp.users.UserService/GetUser`
- `/myapp.users.UserService/ListUsers`
- `/myapp.users.UserService/CreateUser`
- `/myapp.users.UserService/DeleteUser`

You can use these paths in AuthorizationPolicy to apply different authentication requirements per method:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-method-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    # Read methods - any authenticated user
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths:
              - "/myapp.users.UserService/GetUser"
              - "/myapp.users.UserService/ListUsers"
    # Write methods - only admin users
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths:
              - "/myapp.users.UserService/CreateUser"
              - "/myapp.users.UserService/DeleteUser"
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Excluding gRPC Health Checks

gRPC has its own health checking protocol defined in `grpc.health.v1.Health`. If you're using gRPC health checks for Kubernetes probes, you need to exclude them from JWT requirements:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-grpc-health
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/grpc.health.v1.Health/Check"
              - "/grpc.health.v1.Health/Watch"
```

This pairs with the JWT requirement policy. The health check paths are allowed without authentication, while everything else requires a valid token.

## Handling gRPC Reflection

If you use gRPC server reflection (handy for tools like grpcurl and grpcui), you might want to exclude reflection endpoints from authentication in development environments:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-grpc-reflection
  namespace: dev
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/grpc.reflection.v1alpha.ServerReflection/*"
              - "/grpc.reflection.v1.ServerReflection/*"
```

Only do this in development namespaces. In production, reflection should be disabled or protected behind authentication.

## Wildcard Service Matching

You can protect all methods on a service using path prefix matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: protect-all-user-methods
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths:
              - "/myapp.users.UserService/*"
```

The `*` matches any method name within that service.

## Testing with grpcurl

Testing your JWT setup with grpcurl is straightforward:

```bash
# Without token - should fail
grpcurl -plaintext \
  -d '{"id": "123"}' \
  localhost:8080 \
  myapp.users.UserService/GetUser

# With token - should succeed
grpcurl -plaintext \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id": "123"}' \
  localhost:8080 \
  myapp.users.UserService/GetUser
```

If you're testing through an Istio ingress gateway:

```bash
grpcurl \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id": "123"}' \
  grpc.example.com:443 \
  myapp.users.UserService/GetUser
```

## Forwarding JWT Claims as gRPC Metadata

When Istio validates a JWT, you can forward the decoded payload to your service. This is useful because your gRPC service can read user information from metadata without having to decode the token itself:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: grpc-jwt-forward
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputPayloadToHeader: "x-jwt-payload"
```

In your gRPC server, read the forwarded claims from incoming metadata:

```go
func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    if ok {
        payload := md.Get("x-jwt-payload")
        if len(payload) > 0 {
            // base64 decode and parse JSON
            decoded, _ := base64.StdEncoding.DecodeString(payload[0])
            var claims map[string]interface{}
            json.Unmarshal(decoded, &claims)
            userID := claims["sub"].(string)
        }
    }
    // ... handle request
}
```

## Streaming RPCs and JWT

For gRPC streaming RPCs (server streaming, client streaming, and bidirectional streaming), the JWT is validated once when the stream is established. The token is checked during the initial HTTP/2 headers frame. Once the stream is open, subsequent messages on that stream don't require re-authentication.

This means if a token expires during a long-running stream, the stream continues to work. New streams would require a fresh valid token. Keep this in mind for long-lived bidirectional streams where you might need application-level re-authentication.

## Debugging gRPC JWT Issues

```bash
# Check sidecar logs for authentication errors
kubectl logs deploy/grpc-service -c istio-proxy -n my-app | grep -E "jwt|auth|rbac"

# Verify the Envoy configuration was applied
istioctl proxy-config listener deploy/grpc-service -n my-app -o json | grep -A 20 "jwt_authn"

# Check if RequestAuthentication was processed
istioctl analyze -n my-app
```

Common gRPC-specific issues:

- **Wrong path format** - forgetting the leading `/` or using dots instead of slashes between service and method name
- **Case sensitivity** - gRPC paths are case-sensitive. `/UserService/getUser` is different from `/UserService/GetUser`
- **Missing package prefix** - the full path includes the protobuf package name, not just the service name

JWT authentication for gRPC in Istio works reliably once you get the path format right. The biggest advantage is that your gRPC services don't need any authentication middleware - the sidecar handles it all before traffic reaches your container.
