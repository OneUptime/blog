# Validation Summary: How to Write Integration Tests for Go APIs with Testcontainers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go testing package
- Testcontainers-Go
- Docker
- PostgreSQL
- Redis
- go-redis
- lib/pq

## Sources Consulted
- Testcontainers-Go Postgres module documentation: https://golang.testcontainers.org/modules/postgres/
- Testcontainers-Go Redis module documentation: https://golang.testcontainers.org/modules/redis/
- Testcontainers-Go Postgres package reference: https://pkg.go.dev/github.com/testcontainers/testcontainers-go/modules/postgres
- Testcontainers-Go Redis package reference: https://pkg.go.dev/github.com/testcontainers/testcontainers-go/modules/redis
- Go testing package documentation: https://pkg.go.dev/testing
- Go coverage documentation: https://go.dev/doc/build-cover
- go-redis guide in Redis documentation: https://redis.io/docs/latest/develop/clients/go/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Docker CLI `docker system info` documentation: https://docs.docker.com/reference/cli/docker/system/info/
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html

## Issues Found
- The PostgreSQL container setup used a hand-rolled log wait strategy. This can work, but the current Testcontainers-Go Postgres module documents `postgres.BasicWaitStrategies()` as the reliable module helper because it waits for the expected PostgreSQL startup logs and the mapped localhost port. Updated the snippet to use `postgres.BasicWaitStrategies()`.
- The Redis container setup used the generic container `Endpoint(ctx, "")` API. The current Redis module documents `ConnectionString(ctx)` as the Redis container method, and go-redis supports `redis.ParseURL`. Updated the snippet to use `redisContainer.ConnectionString(ctx)`, `redis.ParseURL`, and `redis.NewClient(redisOptions)`.
- Several examples built numeric strings with `string(rune('0'+i))`. That only gives the intended decimal digit for 0 through 9 and produces punctuation or other runes for larger values. Updated those examples to use `fmt.Sprintf` for user emails, names, and cache keys.

## Review Notes
- The examples were reviewed against current official documentation, but they were not executed locally because the environment does not have Go installed (`go: command not found`).
- The `go test -coverprofile=coverage.out ./tests/integration/...` command is valid, but as written it only reports coverage for the package under test. Broader application coverage for integration tests may require `-coverpkg` or Go's integration coverage workflow, depending on the project layout.
