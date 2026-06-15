# Validation Summary: How to Choose Between sync.Map and Maps with Mutex in Go

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- sync.Map
- sync.Mutex
- sync.RWMutex
- Go maps
- Go benchmark testing

## Sources Consulted
- Go standard library documentation for sync.Map, sync.Mutex, and sync.RWMutex: https://pkg.go.dev/sync
- Go source for sync.Map implementation details: https://go.dev/src/sync/map.go
- Go blog, "Go maps in action", concurrency guidance for maps: https://go.dev/blog/maps
- Go FAQ, "Why are map operations not defined to be atomic?": https://go.dev/doc/faq#atomic_maps

## Issues Found
- The post described one sync.Map optimization case as keys "only ever accessed by one goroutine." The official sync.Map documentation instead describes the optimized case as multiple goroutines reading, writing, and overwriting entries for disjoint sets of keys. Updated the wording to match the documentation.
- The configuration cache example stated that Load is "lock-free for keys in the read-only portion" and that reads hit an "internal atomic snapshot." These are implementation-specific details and not API guarantees. Updated the wording to describe sync.Map's documented read-mostly optimization without promising a specific internal path.
- The benchmark section claimed fixed performance outcomes, including sync.Map being 2-3x faster for the included 95/5 benchmark. The included benchmark overwrites one hot key, which does not match the main documented sync.Map optimization cases, and exact results depend on workload, CPU, and Go version. Replaced the fixed speedup claims with workload-based guidance and a note to benchmark hot-key workloads carefully.
- The decision framework used a specific 10-20% write-ratio cutoff without support from official documentation. Replaced it with a more accurate heuristic based on frequent writes or concentrated writes to the same keys.
- The final summary described sync.Map as optimized for "append-only patterns." Updated this to "write-once or disjoint-key patterns" to align with official documentation.

## Review Notes
The code snippets use current Go standard library APIs and are syntactically consistent with the documented sync.Map, sync.RWMutex, and testing APIs. The local environment did not have the Go toolchain installed, so examples were reviewed against official documentation rather than compiled locally.
