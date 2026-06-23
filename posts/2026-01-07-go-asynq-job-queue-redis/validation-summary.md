# Validation Summary: How to Build a Job Queue in Go with Asynq and Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Asynq
- Redis
- Asynqmon
- Background job queues
- Scheduled and recurring tasks

## Sources Consulted
- Asynq package documentation: https://pkg.go.dev/github.com/hibiken/asynq
- Asynq source and README: https://github.com/hibiken/asynq
- Asynq Inspector API source: https://github.com/hibiken/asynq/blob/master/inspector.go
- Asynq Server API source: https://github.com/hibiken/asynq/blob/master/server.go
- Asynq Scheduler API source: https://github.com/hibiken/asynq/blob/master/scheduler.go
- Asynqmon package documentation: https://pkg.go.dev/github.com/hibiken/asynqmon
- Go errors package documentation: https://pkg.go.dev/errors

## Issues Found
- The setup commands installed `github.com/hibiken/asynq/x/metrics` and `github.com/redis/go-redis/v9`, but the tutorial code does not use them and does use Asynqmon. Replaced those commands with `go get github.com/hibiken/asynqmon`.
- The post described the monitoring UI as built into Asynq. Updated this to identify Asynqmon as the companion web UI package.
- The Redis Cluster comments and production guidance were too broad. Added a compatibility caveat because the Asynq README notes Redis Cluster limitations for some Lua-scripted behavior.
- The webhook handler created requests with a nil body even though the payload included a body. Added `bytes.NewReader(payload.Body)`.
- The worker example used `fmt.Errorf` without importing `fmt`, and created an unused cancellation context. Added the missing import and simplified shutdown to use `srv.Run`, which handles SIGTERM/SIGINT.
- The priority queue comments claimed weighted frequency while `StrictPriority` was enabled. Updated the comments to say higher-weight queues are checked first in strict-priority mode.
- The `ErrorHandler` comments incorrectly said it only runs after all retries are exhausted. Updated the text to match Asynq's documented behavior: it runs whenever a handler returns an error.
- The retry delay function was described as adding jitter, but the sample only implements exponential backoff. Removed the jitter claim.
- The unique-task example compared `err == asynq.ErrDuplicateTask`; Asynq returns wrapped errors, so the example now uses `errors.Is`.
- The dead letter queue processor closed only the Asynq client and leaked the Inspector connection. Updated `Close` to close both with `errors.Join`.
- The web UI example imported `github.com/hibiken/asynq` without using it. Removed the unused import.
- The scheduler example referenced `NewAsynqLogger()` from another command package. Removed that option so the scheduler uses Asynq's default logger.
- The idempotency snippet referenced `payload.EmailID`, which was not defined in the earlier payload struct. Updated it to use existing payload fields.

## Review Notes
The local environment did not have the `go` binary installed, so I could not run `go test` or compile the snippets locally. API validation was done against official package documentation and upstream source.
