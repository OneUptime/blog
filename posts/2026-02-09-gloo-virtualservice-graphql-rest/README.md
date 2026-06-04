# How to Configure Gloo VirtualService for GraphQL and REST API Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gloo, GraphQL, API Gateway

Description: Learn how to configure Gloo VirtualService resources to route both GraphQL and REST APIs.

---

Gloo's VirtualService resource provides unified configuration for routing GraphQL and REST APIs through a single gateway. This enables teams to expose both API styles to consumers while managing authentication, rate limiting, and transformations consistently. In Gloo Gateway Enterprise 1.19.x and earlier, Gloo supports GraphQL schema stitching with the `GraphQLApi` resource, allowing you to combine multiple GraphQL APIs into a unified API surface.

## Understanding VirtualService

VirtualService defines routing rules for incoming requests. It specifies:
- Domains to match (virtual hosts)
- Route matchers (paths, headers, methods)
- Destinations (upstreams and functions)
- Transformations and plugins

A single VirtualService can handle mixed GraphQL and REST traffic, routing to appropriate backends based on request characteristics.

## Basic REST Routing

Create a simple REST routing configuration:

```yaml
# rest-virtualservice.yaml

apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: rest-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    routes:
    - matchers:
      - prefix: /api/users
      routeAction:
        single:
          upstream:
            name: user-service
            namespace: gloo-system

    - matchers:
      - prefix: /api/orders
      routeAction:
        single:
          upstream:
            name: order-service
            namespace: gloo-system

    - matchers:
      - prefix: /api/products
      routeAction:
        single:
          upstream:
            name: product-service
            namespace: gloo-system
```

## GraphQL Upstream Configuration

Define a GraphQL API that delegates execution to an existing GraphQL upstream:

```yaml
# graphql-api.yaml
apiVersion: graphql.gloo.solo.io/v1beta1
kind: GraphQLApi
metadata:
  name: graphql-backend
  namespace: gloo-system
spec:
  executableSchema:
    executor:
      remote:
        upstreamRef:
          name: graphql-service
          namespace: gloo-system
    schemaDefinition: |
      type Query {
        user(id: ID!): User
        users: [User!]!
      }

      type Mutation {
        createUser(input: CreateUserInput!): User!
        updateUser(id: ID!, input: UpdateUserInput!): User
      }

      type User {
        id: ID!
        name: String!
        email: String!
      }

      input CreateUserInput {
        name: String!
        email: String!
      }

      input UpdateUserInput {
        name: String
        email: String
      }
```

## GraphQL Route Configuration

Route GraphQL queries through VirtualService:

```yaml
# graphql-virtualservice.yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: graphql-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'graphql.example.com'
    routes:
    - matchers:
      - prefix: /graphql
        methods:
        - POST
      graphqlApiRef:
        name: graphql-backend
        namespace: gloo-system
```

## Mixed REST and GraphQL Routing

Combine REST and GraphQL in a single VirtualService:

```yaml
# mixed-api-virtualservice.yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: unified-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    routes:
    # GraphQL endpoint
    - matchers:
      - prefix: /graphql
        methods:
        - POST
      graphqlApiRef:
        name: graphql-backend
        namespace: gloo-system

    # REST endpoints
    - matchers:
      - prefix: /rest/users
      routeAction:
        single:
          upstream:
            name: user-rest-service
            namespace: gloo-system

    - matchers:
      - prefix: /rest/orders
      routeAction:
        single:
          upstream:
            name: order-rest-service
            namespace: gloo-system
```

## GraphQL API Routing

Route a GraphQL endpoint to the `GraphQLApi` resource:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: graphql-routing
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /graphql
      graphqlApiRef:
        name: graphql-backend
        namespace: gloo-system
```

## GraphQL Schema Stitching

Combine multiple GraphQL services:

```yaml
# stitched-schema-upstream.yaml
apiVersion: graphql.gloo.solo.io/v1beta1
kind: GraphQLApi
metadata:
  name: stitched-graphql
  namespace: gloo-system
spec:
  stitchedSchema:
    subschemas:
    - name: user-graphql-service
      namespace: gloo-system
      typeMerge:
        User:
          selectionSet: "{ id }"
          queryName: user
          args:
            id: id

    - name: order-graphql-service
      namespace: gloo-system
      typeMerge:
        Order:
          selectionSet: "{ id }"
          queryName: order
          args:
            id: id
```

Route to stitched schema:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: stitched-graphql-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'graphql.example.com'
    routes:
    - matchers:
      - prefix: /graphql
      graphqlApiRef:
        name: stitched-graphql
        namespace: gloo-system
```

## REST to GraphQL Transformation

Convert REST requests to GraphQL queries:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: rest-to-graphql
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    routes:
    - matchers:
      - regex: /users/[^/]+
        methods:
        - GET
      routeAction:
        single:
          upstream:
            name: graphql-backend
            namespace: gloo-system
      options:
        stagedTransformations:
          regular:
            requestTransforms:
            - requestTransformation:
                transformationTemplate:
                  extractors:
                    id:
                      header: :path
                      regex: /users/([^/]+)
                      subgroup: 1
                  headers:
                    :method:
                      text: POST
                    :path:
                      text: /graphql
                    content-type:
                      text: application/json
                  body:
                    text: |
                      {
                        "query": "query GetUser($id: ID!) { user(id: $id) { id name email } }",
                        "variables": {
                          "id": "{{ id }}"
                        }
                      }
```

## Rate Limiting for GraphQL

Apply rate limits to the GraphQL endpoint:

```yaml
apiVersion: ratelimit.solo.io/v1alpha1
kind: RateLimitConfig
metadata:
  name: graphql-rate-limits
  namespace: gloo-system
spec:
  raw:
    descriptors:
    - key: generic_key
      value: graphql
      rateLimit:
        requestsPerUnit: 100
        unit: MINUTE
    rateLimits:
    - actions:
      - genericKey:
          descriptorValue: graphql
---
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: rate-limited-graphql
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /graphql
      routeAction:
        single:
          upstream:
            name: graphql-backend
            namespace: gloo-system
      options:
        rateLimitConfigs:
          refs:
          - name: graphql-rate-limits
            namespace: gloo-system
```

For Gloo Gateway Enterprise 1.19.x GraphQL APIs, reference the `GraphQLApi` resource instead of an upstream:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: rate-limited-graphql
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /graphql
      graphqlApiRef:
        name: graphql-backend
        namespace: gloo-system
      options:
        rateLimitConfigs:
          refs:
          - name: graphql-rate-limits
            namespace: gloo-system
```

## Authentication for Mixed APIs

Apply consistent auth across REST and GraphQL:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: authenticated-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    options:
      extauth:
        configRef:
          name: oauth-config
          namespace: gloo-system
    routes:
    # GraphQL with auth
    - matchers:
      - prefix: /graphql
      graphqlApiRef:
        name: graphql-backend
        namespace: gloo-system

    # REST with auth
    - matchers:
      - prefix: /api
      routeAction:
        single:
          upstream:
            name: rest-backend
            namespace: gloo-system

    # Public endpoint without auth
    - matchers:
      - prefix: /public
      routeAction:
        single:
          upstream:
            name: public-service
            namespace: gloo-system
      options:
        extauth:
          disable: true
```

## Testing GraphQL Routes

Test GraphQL queries:

```bash
GLOO_PROXY=$(kubectl get svc gateway-proxy -n gloo-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Query GraphQL
curl -X POST http://${GLOO_PROXY}/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { users { id name email } }"
  }'

# Mutation
curl -X POST http://${GLOO_PROXY}/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }",
    "variables": {
      "input": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }'
```

## Best Practices

**Version GraphQL schemas** - Use schema versioning for backward compatibility.

**Implement query complexity limits** - Prevent expensive queries from overloading backends.

**Cache GraphQL responses** - Use GraphQL cache-control settings or gateway caching for frequently accessed data.

**Monitor query performance** - Track slow queries and optimize resolvers.

**Use schema stitching judiciously** - Only stitch when necessary to avoid performance overhead.

**Implement field-level authorization** - Control access to sensitive GraphQL fields.

**Use the GraphQL UI** - Provide an interactive GraphiQL experience for developers in non-production environments.

## Conclusion

Gloo's VirtualService enables unified management of GraphQL and REST APIs through a single gateway. By supporting schema stitching, GraphQL API routing, and seamless transformations between REST and GraphQL, Gloo provides flexibility for teams transitioning between API styles or supporting both simultaneously. This unified approach simplifies operations, enables consistent security policies, and provides a cohesive API experience to consumers regardless of backend implementation details.
