# How to Configure GraphQL Servers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, IPv6, Node.js, API, Express

Description: Configure GraphQL servers to listen on IPv6 addresses using popular frameworks including Express, Apollo Server, and Fastify.

## GraphQL over IPv6

GraphQL servers are HTTP-based, so IPv6 configuration follows standard HTTP server practices. The key is ensuring your HTTP server binds to IPv6 interfaces.

## Express + graphql-http over IPv6

```javascript
// server.js
const express = require('express');
const { createHandler } = require('graphql-http/lib/use/express');
const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type Query {
    hello: String
    clientIP: String
  }
`);

const app = express();

// Middleware to capture client IPv6 address
app.use((req, res, next) => {
    req.clientIP = req.socket.remoteAddress;
    next();
});

const root = {
    hello: () => 'Hello from IPv6 GraphQL!',
    clientIP: (_, context) => context.req.clientIP,
};

app.all('/graphql', createHandler({
    schema,
    rootValue: root,
    context: (req) => ({ req: req.raw }),
}));

// Listen on all IPv6 interfaces
// '::' is the IPv6 unspecified address used for binding
app.listen(4000, '::', () => {
    console.log('GraphQL server on http://[::1]:4000/graphql');
});
```

## Apollo Server 5 with IPv6

```javascript
// apollo-server.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const typeDefs = `
  type Query {
    hello: String
    serverInfo: ServerInfo
  }
  type ServerInfo {
    protocol: String
    address: String
  }
`;

const resolvers = {
    Query: {
        hello: () => 'Hello IPv6!',
        serverInfo: (_, __, { req }) => ({
            protocol: req.socket.encrypted ? 'HTTPS' : 'HTTP',
            address: req.socket.remoteAddress,
        }),
    },
};

const server = new ApolloServer({ typeDefs, resolvers });

async function main() {
    await startStandaloneServer(server, {
        listen: {
            port: 4000,
            host: '::', // Listen on all IPv6 interfaces
        },
        context: async ({ req }) => ({ req }),
    });

    console.log('GraphQL server ready on http://[::1]:4000/');
}

main();
```

## Fastify + Mercurius GraphQL

```javascript
// fastify-graphql.js
const fastify = require('fastify')({ logger: true });
const mercurius = require('mercurius');

const schema = `
  type Query {
    ping: String
    clientAddress: String
  }
`;

const resolvers = {
    Query: {
        ping: () => 'pong',
        clientAddress: (_, __, { reply }) => {
            // Get client IPv6 from Fastify request
            return reply.request.socket.remoteAddress;
        },
    },
};

fastify.register(mercurius, { schema, resolvers, graphiql: true });

// Start on all IPv6 interfaces
fastify.listen({ port: 4000, host: '::' }, (err, address) => {
    if (err) throw err;
    console.log(`GraphQL on ${address}/graphiql`);
});
```

## Python with Strawberry GraphQL

```python
# server.py

import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI, Request
import uvicorn

@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello from IPv6 GraphQL!"

    @strawberry.field
    def client_ip(self, info: strawberry.types.Info) -> str:
        request: Request = info.context["request"]
        return request.client.host

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)

app = FastAPI()
app.include_router(graphql_app, prefix="/graphql")

if __name__ == "__main__":
    # Uvicorn - listen on all IPv6 interfaces
    uvicorn.run(app, host="::", port=4000)
    # Or from CLI: uvicorn server:app --host :: --port 4000
```

## Testing GraphQL over IPv6

```bash
# Test with curl over IPv6
curl -6 -X POST http://[::1]:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'

# Test against your server's IPv6 address
SERVER_IPV6="2001:db8::1234" # replace with your server's real IPv6 address
curl -6 -X POST "http://[$SERVER_IPV6]:4000/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ clientIP }"}'

# Verify IPv6 is used
curl -6 -v -X POST "http://[$SERVER_IPV6]:4000/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}' 2>&1 | grep "Connected to"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your GraphQL endpoint over IPv6. Create HTTP monitors that POST a simple `{ __typename }` query to verify the server is responding correctly from IPv6 addresses.

## Conclusion

GraphQL servers over IPv6 usually just require binding the HTTP server to `::` instead of `0.0.0.0`. In Node.js, pass `'::'` as the host to `listen()`. In Python, set `host="::"` in uvicorn. On some operating systems, binding to `::` can also accept IPv4 unless IPv6-only mode is enabled. Client IPv6 addresses are available via the request socket's `remoteAddress` property or FastAPI's `request.client.host`.
