# Validation Summary: How to Configure GraphQL Servers with IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- GraphQL over HTTP
- IPv6
- Node.js
- Express
- `graphql-http`
- Apollo Server
- Fastify
- Mercurius
- Python
- FastAPI
- Strawberry GraphQL
- Uvicorn
- `curl`

## Sources Consulted
- Node.js `net` API reference: https://nodejs.org/api/net.html
- `express-graphql` npm package deprecation notice: https://www.npmjs.com/package/express-graphql
- `graphql-http` upstream README and migration guidance: https://github.com/graphql/graphql-http
- Apollo Server `startStandaloneServer` documentation: https://www.apollographql.com/docs/apollo-server/api/standalone
- Apollo Server migration documentation: https://www.apollographql.com/docs/apollo-server/migration
- Apollo Server upstream source (`startStandaloneServer` and URL formatting behavior): https://github.com/apollographql/apollo-server
- Fastify server reference: https://fastify.dev/docs/latest/Reference/Server/
- Mercurius context documentation: https://github.com/mercurius-js/mercurius/blob/master/docs/context.md
- Strawberry FastAPI integration docs: https://strawberry.rocks/docs/integrations/fastapi
- Uvicorn settings docs: https://www.uvicorn.org/settings/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- `curl --help all` for `-6`, `-X`, `-H`, `-d`, and `-v`

## Issues Found
- The Express example used `express-graphql`, which is deprecated and no longer maintained. I replaced it with `graphql-http`, the upstream-recommended replacement, while keeping the Express-based IPv6 binding example and request-context access for the client IP field.
- The Apollo section was labeled for Apollo Server 4, which is end-of-life as of January 26, 2026. I updated the section to Apollo Server 5-compatible usage.
- The post used the IPv6 unspecified address `::` as if it were a client-facing URL (`http://[::]:...`). RFC 4291 says the unspecified address must not be used as a destination address. I changed local access examples to `http://[::1]:...` and changed the remote `curl` examples to explicitly require substitution of a real server IPv6 address.
- The Apollo example claimed the standalone helper would print an IPv6 wildcard URL. Apollo’s current standalone implementation normalizes wildcard binds to a localhost URL string, so I removed that incorrect claim and changed the example to log a usable local IPv6 URL instead.
- The OneUptime section referred to monitoring a “health endpoint”, but the example check was actually a GraphQL query sent to the GraphQL endpoint. I corrected that wording.
- The conclusion overstated the behavior of binding to `::`. I clarified that some platforms can still accept IPv4 traffic unless IPv6-only mode is enabled.

## Review Notes
- The Fastify + Mercurius example was technically consistent with current Fastify listen behavior and Mercurius resolver context usage.
- The Strawberry + FastAPI example was technically consistent with current Strawberry/FastAPI context behavior and Uvicorn host configuration.
- The `SERVER_IPV6` example intentionally uses documentation-prefix style placeholder notation and must be replaced with a real assigned IPv6 address in practice.
- Apollo Server 5’s standalone server is no longer Express-based internally, but the example remains valid because it only relies on Node request/socket APIs.
