# Validation Summary: How to Integration Test gRPC Services with Testcontainers

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough)

## Technologies Covered
- Go (Golang) integration testing with the standard `testing` package
- Testcontainers for Go (`testcontainers-go`) core API and the `postgres` and `redis` modules
- gRPC (`google.golang.org/grpc`) — unary, server-streaming, client-streaming, and bidirectional-streaming RPCs
- PostgreSQL via `pgx`/`pgxpool` (`github.com/jackc/pgx/v5`)
- Redis via `github.com/redis/go-redis/v9`
- Apache Kafka (KRaft mode) and WireMock containers
- testify (`assert`/`require`)
- GitHub Actions and Makefile-based CI

## Sources Consulted
- Testcontainers for Go — main package reference: https://pkg.go.dev/github.com/testcontainers/testcontainers-go
- Testcontainers for Go — Postgres module: https://golang.testcontainers.org/modules/postgres/ and https://pkg.go.dev/github.com/testcontainers/testcontainers-go/modules/postgres
- Testcontainers for Go — "Copying data into a container" (Files / ContainerFile, BindMount deprecation): https://golang.testcontainers.org/features/files_and_mounts/
- Testcontainers for Go — bind mount deprecation discussion: https://github.com/testcontainers/testcontainers-go/issues/2179
- gRPC-Go `grpc.NewClient` (current client-construction API replacing `grpc.Dial`): https://pkg.go.dev/google.golang.org/grpc

## Issues Found
1. **Deprecated `testcontainers.Mounts(testcontainers.BindMount(...))` API (two occurrences).** In `custom_containers.go`, both `CreatePostgresWithInit` and `CreateMockExternalService` used `Mounts: testcontainers.Mounts(testcontainers.BindMount(...))`. `BindMount`/`Mounts` are deprecated in current testcontainers-go in favor of the portable `Files` field with `ContainerFile`. Replaced both with `Files: []testcontainers.ContainerFile{{HostFilePath: ..., ContainerFilePath: ..., FileMode: 0o644}}`.
2. **Missing `fmt` import / unused imports in `user_service_test.go`.** The file calls `fmt.Sprintf` (in `TestListUsers` and `TestBatchCreateUsers`) but did not import `"fmt"`, while importing `"context"` and `"time"` which are never used — a guaranteed compile failure (`undefined: fmt` plus `imported and not used`). Fixed the import block to add `"fmt"` and drop the unused `"context"`/`"time"`.
3. **Unused `fmt` import in `setup_test.go`.** The setup file imported `"fmt"` but only uses `t.Fatalf`/`t.Logf`. Go treats unused imports as a compile error; removed `"fmt"`.
4. **Unused `context` import in `e2e_test.go`.** The file uses `suite.ctx` (a struct field) but never references the `context` package directly. Removed the unused `"context"` import.
5. **Missing imports in `multi_container_test.go`.** The body uses `pgxpool`, `net`, `grpc`, `pb`, `repository`, and `server`, none of which were imported. Added the corresponding import lines so the snippet compiles consistently with the rest of the package.
6. **Unused `time` import in `postgres_repository.go`.** Removed; the repository code never references the `time` package.

## Review Notes
- `postgres.Run(...)` and `redismodule.Run(...)` are the current module entry points (the older `RunContainer` is deprecated), so the post is using the correct, non-deprecated module API. `grpc.NewClient` (rather than the deprecated `grpc.Dial`) is likewise current and correct.
- The Kafka container uses a single-node KRaft configuration (`KAFKA_PROCESS_ROLES=broker,controller`, controller quorum voter `1@localhost:9093`, replication factor 1) appropriate for `confluentinc/cp-kafka:7.4.0`; the example `CLUSTER_ID` is a valid base64 placeholder.
- The code samples are illustrative across multiple files in one `integration` package; several types/functions referenced (`User`, `ErrNotFound`, `ErrDuplicate`, `repository.NewCachedUserRepository`, the generated `pb` types, and `server.NewUserServiceServer`) are assumed to exist elsewhere in the reader's project and are intentionally not shown. These are reasonable omissions for a tutorial, not errors.
- `TestMain` calls `m.Run()` without `os.Exit(m.Run())`; this still runs tests but does not propagate the exit code. Left as-is since it is not incorrect and the post's per-test setup does not rely on `TestMain` doing anything meaningful.
- CI versions (Go `1.21`, `actions/setup-go@v5`, `actions/checkout@v4`, `codecov/codecov-action@v3`) are plausible and internally consistent for the post's January 2026 date; not changed.
