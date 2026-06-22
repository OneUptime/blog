# Validation Summary: How to Handle Non-Deterministic Map Iteration Order in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go maps
- Go generics
- `sort`
- `slices`
- `cmp`
- `container/list`
- `encoding/json`

## Sources Consulted
- Go language specification, `for range` over maps: https://go.dev/ref/spec
- Official Go blog, "Go maps in action": https://go.dev/blog/maps
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `slices` package documentation: https://pkg.go.dev/slices
- Go `container/list` package documentation: https://pkg.go.dev/container/list

## Issues Found
- The post described map iteration order as always randomized and said output "will" vary. The Go specification says map iteration order is not specified and is not guaranteed to be the same from one iteration to the next. Updated the wording to "unspecified" and "may/can vary."
- The value-sorting examples did not define a deterministic order for equal values. Added key tie-breakers so the result stays deterministic when values are equal.
- The generic `SortedByValue` helper accepted any comparable key type, but deterministic tie-breaking by key requires ordered keys. Changed `K comparable` to `K cmp.Ordered` and added a key comparison fallback.
- The "Insertion Order with Linked List" heading introduced a slice-backed implementation. Renamed it to "Insertion Order with Slice."
- The JSON example implemented a custom `MarshalJSON` for sorted map keys, but `encoding/json` already sorts supported map key types when marshaling. Replaced the custom marshaler with a standard `json.Marshal` example and updated the summary table.
- The performance table listed "Sorted keys each time" lookup as O(n log n). Map lookup remains O(1); the O(n log n) cost applies to each ordered iteration. Updated the table and added a note.

## Review Notes
The local environment did not have the `go` binary installed, so examples were reviewed statically against official Go documentation rather than executed with `go run`.
