# Validation Summary: How to Configure Request Pipelining

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP/2
- HTTPX
- Node.js HTTP/2
- Go HTTP/2
- Redis and Redis pipelining
- redis-py
- ioredis
- PostgreSQL
- asyncpg
- gRPC Python AsyncIO
- Prometheus Python client

## Sources Consulted
- RFC 9113: HTTP/2: https://www.rfc-editor.org/rfc/rfc9113.html
- HTTPX HTTP/2 support documentation: https://www.python-httpx.org/http2/
- Node.js HTTP/2 API documentation: https://nodejs.org/api/http2.html
- Go x/net/http2 package documentation: https://pkg.go.dev/golang.org/x/net/http2
- Redis pipelining documentation: https://redis.io/docs/latest/develop/using-commands/pipelining/
- redis-py pipelines documentation: https://redis.readthedocs.io/en/stable/advanced_features.html#pipelines
- ioredis pipeline documentation: https://ioredis.readthedocs.io/en/stable/README/#pipelining
- asyncpg API documentation: https://magicstack.github.io/asyncpg/current/api/index.html
- asyncpg connection source showing concurrent-operation guard: https://magicstack.github.io/asyncpg/devel/_modules/asyncpg/connection.html
- gRPC Python AsyncIO API documentation: https://grpc.github.io/grpc/python/grpc_asyncio.html
- Prometheus Python client Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/

## Issues Found
- The sequence diagram said three sequential request/response exchanges took 6 round trips. Changed it to 3 round trips and clarified that the pipelined case is about one round trip after connection setup.
- The HTTP/2 section said multiplexing avoids head-of-line blocking without qualification. Updated it to specify that HTTP/2 avoids HTTP/1.1-style application-layer head-of-line blocking, while TCP-level head-of-line blocking can still occur.
- The HTTPX comment implied HTTP/2 support is always native. Updated it to note that HTTPX requires installation with the `httpx[http2]` extra for HTTP/2 support.
- The Node.js HTTP/2 example parsed JSON inside an event handler without rejecting on parse errors. Wrapped `JSON.parse` in `try`/`catch` so the promise rejects correctly.
- The Go snippet used `package main` without a `main` function, which would not build as a standalone main package. Changed it to a library package name.
- The asyncpg example attempted to execute multiple concurrent queries on a single acquired connection. asyncpg connections do not support overlapping operations, so the example now executes independent queries concurrently by acquiring separate pool connections.
- The monitoring example used `await pipe.execute()` with an undefined Redis client. Updated it to use `redis.asyncio`, create a Redis client, create an async pipeline, and close the client afterward.
- The PostgreSQL summary wording described the example as direct query pipelining. Updated it to describe async queries with a connection pool, which matches the corrected asyncpg implementation.

## Review Notes
- HTTP/2 multiplexing and Redis pipelining are technically distinct mechanisms; the post now preserves the practical comparison while avoiding the most misleading phrasing.
- The PostgreSQL section demonstrates concurrent independent database requests, not PostgreSQL protocol pipeline mode.
