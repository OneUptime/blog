# Validation Summary: How to Implement Scatter-Gather with Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation via Go SDK)
- Go (goroutines, channels, sync.WaitGroup, context)
- Scatter-gather concurrency pattern

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk`, `client/invoke.go`) — verified `InvokeMethod`, `InvokeMethodWithContent`, and `DataContent` signatures
- Go language specification — channel semantics, select statement behavior, context cancellation

## Issues Found

### 1. HTTP handler did not match function signature (compilation error)
- **What was wrong:** `handlePriceSearch` called `scatterGatherWithTimeout` and destructured the result as `quotes, err := scatterGatherWithTimeout(...)`, but the function only returns `[]PriceQuote` (a single value, no error). This code would not compile.
- **What was changed:** Removed the `err` variable and associated error handling from the handler, changing the call to `quotes := scatterGatherWithTimeout(...)`.
- **Why:** The function signature returns one value; the caller must match.

### 2. Race condition from closing channel while goroutines may still send (potential panic)
- **What was wrong:** After `<-ctx.Done()`, the code called `close(quoteCh)` and then ranged over it. However, goroutines that completed their `InvokeMethod` call just before the context expired could still attempt to send on the closed channel, causing a runtime panic (`send on closed channel`).
- **What was changed:** Replaced `close(quoteCh)` + `for range` with a non-blocking drain loop using `select` with a `default` case. This collects all buffered results without closing the channel, eliminating the race.
- **Why:** In Go, sending on a closed channel panics. Since the goroutines are not coordinated to stop before `close`, the channel must remain open. The buffered channel (capacity = number of vendors) ensures straggler goroutines can still send without blocking, and those values will be garbage collected.

## Review Notes
- The `scatterGatherWithTimeout` function always waits for the full timeout duration before returning, even if all vendors respond quickly. A production implementation would typically track the response count and cancel early when all vendors have responded. This is a design simplification acceptable for a tutorial.
- The Dapr Go SDK method signatures (`InvokeMethod`, `InvokeMethodWithContent`, `DataContent`) were verified against the current SDK source and are correct.
- The aggregation logic and basic scatter-gather pattern are correctly implemented.
