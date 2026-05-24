# Validation Summary: How to Handle API Rate Limiting in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (standard library: `net/http`, `context`, `sync`, `time`, `math/rand`, `encoding/json`)
- Terraform custom provider development
- `github.com/hashicorp/terraform-plugin-log/tflog`
- HTTP rate limiting (RFC 6585 / 429 status code, `Retry-After` header per RFC 9110)
- Concurrency primitives (semaphores via buffered channels, mutexes)

## Sources Consulted
- Go `net/http` package documentation — https://pkg.go.dev/net/http (verified `StatusTooManyRequests` = 429, `ParseTime`, `NewRequestWithContext`)
- Go `strconv` package — https://pkg.go.dev/strconv (verified `Atoi`, `ParseInt`)
- Go `time` package — https://pkg.go.dev/time (verified `NewTimer`, `Until`, `Unix`)
- Go `math/rand` — https://pkg.go.dev/math/rand (`Float64`)
- RFC 9110 §10.2.3 (Retry-After header semantics — delta-seconds or HTTP-date)
- RFC 6585 §4 (HTTP 429 Too Many Requests)
- HashiCorp `terraform-plugin-log` — https://pkg.go.dev/github.com/hashicorp/terraform-plugin-log/tflog (verified `tflog.Warn` signature)
- Terraform CLI documentation on `-parallelism` default (10) — https://developer.hashicorp.com/terraform/cli/commands/apply
- Common semaphore-via-buffered-channel idiom in Go (validated against `golang.org/x/sync/semaphore` semantics)

## Issues Found
1. **Missing `"fmt"` import in `internal/client/retry.go`** — The code calls `fmt.Errorf(...)` in three places (rate-limit branch, backoff branch, and the final "max retries exceeded" return) but the import block did not include `"fmt"`. The file would fail to compile. **Fix:** Added `"fmt"` to the import block.
2. **Missing `"time"` import in `internal/client/client.go`** — `NewClient` constructs `&http.Client{Timeout: 30 * time.Second}`, which requires the `"time"` package, but it was not imported. The file would fail to compile. **Fix:** Added `"time"` to the import block.

## Review Notes
- The `IsRateLimitError` function name is slightly misleading — it returns `*RateLimitError` (nil = not a rate-limit error) rather than a boolean. The convention works but a Go reviewer might prefer `ParseRateLimit` or returning `(*RateLimitError, bool)`. Not incorrect, just a style preference; left unchanged per the "only fix technical errors" rule.
- `math/rand` is used without explicit seeding. As of Go 1.20 the global source is auto-seeded, so this is fine on modern Go. For Go 1.21+ users, `math/rand/v2` is preferred but not required.
- The `Throttler.Wait` method unlocks and re-locks the mutex around the `sleep` call while holding `defer t.mu.Unlock()`. The lock/unlock counts balance correctly, but this pattern is unusual and could surprise reviewers. Functionally correct.
- The example `X-RateLimit-Reset: 1677500000` is a Unix timestamp from Feb 2023 (in the past), which is fine as illustration. Note that some APIs (e.g., GitHub) use absolute Unix seconds while others (e.g., Twitter v1.1) used seconds-until-reset — the code assumes the absolute-Unix convention, which is the more common one and matches the cited example.
- The integrated `doRequest` example at the end (lines around 466-479) is a partial snippet ending with `// ... rest of the request logic with retry ...`, which is clearly marked as a continuation and not meant to be standalone — this is acceptable.
- Terraform's default `-parallelism=10` claim is correct.
