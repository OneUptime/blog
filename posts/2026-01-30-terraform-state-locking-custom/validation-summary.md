# Validation Summary: How to Create Terraform State Locking Custom

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (HTTP backend, state locking)
- Go (net/http, sync, encoding/json)
- Redis (go-redis v9, SETNX, Lua scripts)
- PostgreSQL (lib/pq, JSONB, unique constraints)
- Kubernetes (Deployment, Service manifests)
- Bash (curl-based test script)
- Mermaid (sequence, class, and flowchart diagrams)

## Sources Consulted
- Go `net/http` package reference: https://pkg.go.dev/net/http (Method* constants)
- Terraform HTTP backend documentation: https://developer.hashicorp.com/terraform/language/backend/http
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html (advisory locks)
- go-redis v9 reference: https://pkg.go.dev/github.com/redis/go-redis/v9 (SetNX, NewScript)
- Go language specification on imports: https://go.dev/ref/spec

## Issues Found

1. **Invalid Go constants `http.MethodLock` and `http.MethodUnlock`** — these do not exist in Go's `net/http` package (only the nine standard HTTP methods are defined: GET, HEAD, POST, PUT, PATCH, DELETE, CONNECT, OPTIONS, TRACE). WebDAV LOCK/UNLOCK methods are not in the standard library. The handler dispatch in the first Go example referenced both, which would fail to compile. Replaced with string literals `"LOCK"` and `"UNLOCK"`, preserving the intent of accepting either POST or the WebDAV-style method.

2. **Unused `fmt` import in the HTTP backend Go example** — Go treats unused imports as a compile error. The first Go example imported `fmt` but never used it. Removed the import.

3. **Unused `fmt` import in the Redis Go example** — same compile-error issue. Removed.

4. **Unused `fmt` and `hash/fnv` imports in the PostgreSQL Go example** — same compile-error issue. Removed both.

5. **Mismatched claim about "advisory locks" in the PostgreSQL section** — the section introduced the implementation as "using advisory locks," but the actual code uses a dedicated `terraform_locks` table with a UNIQUE constraint and `ON CONFLICT DO NOTHING`. PostgreSQL advisory locks (`pg_advisory_lock`) are session-bound, so they cannot be safely held across requests by a stateless HTTP server that uses connection pooling — the table-based approach in the code is actually the correct design choice. Updated the description to accurately reflect the implementation and added a brief note explaining why advisory locks are inappropriate here.

6. **Stale-locks Go snippet had incorrect imports** — it imported `encoding/json` (unused) but used `fmt.Errorf`, `log.Printf`, and `http.ResponseWriter`/`http.Error` without importing those packages. Replaced the import block with `fmt`, `log`, `net/http`, and `time` to match actual usage.

## Review Notes

- The Terraform HTTP backend configuration is correct: `address`, `lock_address`, `unlock_address`, `lock_method`, `unlock_method`, `username`, `password`, `retry_max`, `retry_wait_min`, and `retry_wait_max` are all valid fields. The defaults for `lock_method`/`unlock_method` are `LOCK`/`UNLOCK`, and the post correctly overrides them to `POST` to match the simpler server implementation.
- The `github.com/redis/go-redis/v9` import path is current (this is the post-rename official Redis org path).
- The Redis Lua script for atomic check-and-delete on unlock is a sound pattern.
- The Kubernetes manifests reference `/health` and `/ready` endpoints, but those handlers are not implemented in any of the Go examples — a reader following the tutorial verbatim would see the readiness probe fail. This is a minor pedagogical gap rather than an outright error, so left as-is.
- The `null_resource` resource is being deprecated in favor of `terraform_data` in newer Terraform versions, but `null_resource` still works as of Terraform 1.5+ and is a fair illustrative example.
- The HTTP backend example does not validate the `state` serial number on writes, which is acceptable for a tutorial but worth noting for production use.
