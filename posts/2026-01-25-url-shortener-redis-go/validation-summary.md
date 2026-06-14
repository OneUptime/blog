# Validation Summary: How to Build a URL Shortener with Redis in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go standard library `net/http`
- Redis
- go-redis v9
- Docker
- curl

## Sources Consulted
- Go `crypto/rand` package documentation: https://pkg.go.dev/crypto/rand
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Redis go-redis guide: https://redis.io/docs/latest/develop/clients/go/
- Redis go-redis pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/go/transpipe/
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Redis `SETNX` command documentation: https://redis.io/docs/latest/commands/setnx/
- Redis `GET` command documentation: https://redis.io/docs/latest/commands/get/
- Redis `INCR` command documentation: https://redis.io/docs/latest/commands/incr/
- RFC 9110 HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- Docker Redis Official Image: https://hub.docker.com/_/redis

## Issues Found
- The post described the go-redis `SetNX` call as the standalone Redis `SETNX` command even though the code passes a TTL. Updated the explanation to describe Redis `SET` with `NX` and expiration options, which keeps the set-if-absent operation and TTL application atomic.
- The click tracking example pipelined `GET` and `INCR`, which would increment the stats key even when the short URL was missing or expired. Updated `ResolveAndTrack` to resolve first and increment only after a successful lookup.
- The post used `301 Moved Permanently` for redirects while also claiming click tracking and expiration behavior. Because permanent redirects can be cached by clients, repeat visits might bypass the service and expired links could remain cached. Updated the handler and test output to use `302 Found`.
- Replaced the phrase "security through obscurity" with a more accurate explanation that random codes make short URLs harder to guess.

## Review Notes
- The code examples use current go-redis v9 APIs and standard Go HTTP APIs. Local Go tooling was not installed in this environment, so syntax was reviewed manually against official documentation rather than compiled locally.
- The tutorial correctly lists URL validation, rate limiting, observability, and Redis persistence as production considerations. A future improvement would be to add concrete URL validation and abuse-prevention code.
