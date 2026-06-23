# Validation Summary: How to Implement Event Sourcing in Go

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Go
- Event sourcing
- CQRS
- Optimistic concurrency control
- Projections and read models
- Snapshots
- JSON serialization with `encoding/json`
- UUID generation with `github.com/google/uuid`

## Sources Consulted
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `sync` package documentation: https://pkg.go.dev/sync
- `github.com/google/uuid` package documentation: https://pkg.go.dev/github.com/google/uuid
- Microsoft Azure Architecture Center, Event Sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- EventStoreDB/Kurrent appending events documentation for expected revision and optimistic concurrency: https://docs.kurrent.io/clients/node/legacy/v6.2/appending-events

## Issues Found
- The `AggregateRoot` struct fields were misaligned in a way that made the code less idiomatic and looked like a formatting error. I aligned the fields so the snippet is valid, gofmt-style Go.
- `BankAccountRepository.Save` ignored errors returned by `snapshotStore.Save`. I changed it to return the snapshot persistence error so callers are not told the save succeeded when snapshot persistence fails.
- `InMemorySnapshotStore.Save` and `Load` stored and returned snapshot pointers directly, allowing callers to mutate stored snapshot data outside the lock. I changed both methods to copy the snapshot and its `Data` slice.
- `AccountSummaryProjection.GetAccount` and `GetAllAccounts` returned pointers to internal read-model state, allowing callers to mutate projection state outside the lock. I changed both methods to return copies.
- `EventMigrator.Migrate` used `event.(*BaseEvent)`, which can panic for any other implementation of the `Event` interface. I changed it to a checked type assertion that returns an error for unsupported event implementations.

## Review Notes
The Go toolchain is not installed in this environment, so I could not run `go test` or `go build`. The snippets were reviewed statically against official Go package documentation and event-sourcing references. The examples are appropriate for a tutorial, but production banking code should avoid `float64` for money and use a decimal or integer minor-unit representation instead.
