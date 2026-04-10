# Validation Summary: How to Use Redis for Go WebSocket Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (1.21+)
- Redis Pub/Sub
- WebSockets
- `github.com/gorilla/websocket` (gorilla/websocket)
- `github.com/redis/go-redis/v9` (go-redis v9)
- Nginx / HAProxy (load balancing mention)

## Sources Consulted
- go-redis v9 API documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- gorilla/websocket API documentation: https://pkg.go.dev/github.com/gorilla/websocket
- Go language specification on unused imports: https://go.dev/ref/spec#Import_declarations
- Go language specification on map iteration and deletion: https://go.dev/doc/effective_go#for
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/

## Issues Found

### 1. Unused imports in Connection Hub code block
- **What was wrong:** The Connection Hub code block imported `"context"`, `"encoding/json"`, and `"log"`, none of which are used in that code block. Go requires all imports to be used and will refuse to compile otherwise.
- **What was changed:** Removed the three unused imports, keeping only `"sync"` and `"github.com/redis/go-redis/v9"`.
- **Why:** Go compilation would fail with `imported and not used` errors for each unused package.

### 2. Data race in `BroadcastLocal` due to read lock with map mutation
- **What was wrong:** `BroadcastLocal` acquired a read lock (`h.mu.RLock()`) but in the `default` branch of the select statement, it called `delete(h.clients, c)` and `close(c.send)`, which are write operations on the shared map. Using a read lock while modifying the map is a data race — other goroutines holding concurrent read locks (or the Register/Unregister methods holding write locks) could cause undefined behavior.
- **What was changed:** Changed `h.mu.RLock()` / `h.mu.RUnlock()` to `h.mu.Lock()` / `h.mu.Unlock()` so that the full write lock is held when the map may be modified.
- **Why:** Correctness requires a write lock whenever the map is mutated. Deleting from a map during range iteration is safe in Go, but only if no concurrent access occurs — which a read lock does not prevent.

## Review Notes
- The deployment section references `REDIS_URL` and `PORT` environment variables, but the actual Go code hardcodes `localhost:6379` and `:8080`. This is not technically incorrect (the deployment section is illustrative), but readers may be confused that the env vars aren't wired up in the code.
- The `broadcast` channel field on the `Hub` struct is declared and initialized but never used anywhere in the code. It appears to be a leftover from an earlier design. This is not a compilation error (unused struct fields are allowed in Go), but it is dead code.
- `gorilla/websocket` has been archived by its maintainers. It still works and is widely used, but readers should be aware that `github.com/coder/websocket` (formerly `nhooyr.io/websocket`) is an actively maintained alternative.
- The `CheckOrigin` function returns `true` for all origins. The post correctly notes this should be restricted in production, which is appropriate for a tutorial.
