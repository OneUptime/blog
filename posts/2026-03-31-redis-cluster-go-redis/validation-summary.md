# Validation Summary: How to Use Redis Cluster with go-redis in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- Go (Golang)
- go-redis v9 (`github.com/redis/go-redis/v9`)

## Sources Consulted
- go-redis v9 source code on GitHub: `github.com/redis/go-redis` (osscluster.go, cluster_commands.go)
- go-redis ClusterOptions struct definition and field types
- go-redis ClusterClient methods: `NewClusterClient`, `ForEachMaster`, `ClusterInfo`, `ClusterNodes`
- go-redis pipeline implementation (`processPipeline`, `mapCmdsByNode`) for cross-slot behavior

## Issues Found

### 1. Incorrect claim about pipeline slot requirements (lines 94-103)
- **What was wrong:** The post stated "Pipelining works in cluster mode but commands must target the same slot" and showed a pipeline example using hash tags as if they were required. In reality, go-redis automatically groups pipeline commands by their target node/slot and executes each group in parallel. Cross-slot pipelines work without hash tags.
- **What was changed:** Rewrote the Pipeline section to clarify that regular pipelines handle cross-slot commands automatically. Added a separate `TxPipeline` example to show that transactions (MULTI/EXEC) do require all keys on the same slot, which is the case where hash tags are necessary.
- **Why:** The original text would mislead readers into thinking all pipeline commands must use hash tags, which is unnecessarily restrictive and hides one of go-redis's useful cluster features.

## Review Notes
- The Cluster Options code snippet uses `time.Second` and `time.Hour` without showing a `"time"` import. This is acceptable since it is a snippet, not a complete program, and the first example already demonstrates proper imports.
- The `MaxRedirects` default is 3 (when set to 0) in go-redis. The blog sets it to 8, which is a valid custom value but readers should know the default.
- All other API usage (`NewClusterClient`, `ClusterOptions` fields, `ForEachMaster`, `ClusterInfo`, `ClusterNodes`, hash tags for multi-key commands) is correct and current for go-redis v9.
