# Validation Summary: How to Test Dapr Actors Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (actors, sidecars, reminders)
- Go (Dapr Go SDK, testing patterns)
- Redis (as actor state store)
- Docker (for running Redis locally)
- Dapr CLI (`dapr run`)
- curl / jq (for integration test scripting)

## Sources Consulted
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Go SDK actor package: https://pkg.go.dev/github.com/dapr/go-sdk/actor
- Dapr Redis State Store setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Components Reference: https://docs.dapr.io/reference/components-reference/

## Issues Found

1. **Missing Go imports in mock state manager code block**: The code used `fmt.Errorf`, `json.Marshal`, and `json.Unmarshal` but only imported `"context"` and `"testing"`. Fixed by replacing the import block with `"context"`, `"encoding/json"`, and `"fmt"` (removing the unused `"testing"` import from the mock snippet).

2. **Deprecated CLI flag `--components-path`**: The `dapr run` command used the deprecated `--components-path` flag. Changed to `--resources-path`, which is the current recommended flag that supports loading components, subscriptions, and resiliency specifications.

## Review Notes
- The Dapr Go SDK's `StateManager` interface is deprecated in favor of `StateManagerContext`. Since the post defines a custom mock rather than directly implementing the SDK interface, this is not an error in the post, but users should be aware that the SDK is moving toward context-aware state manager interfaces.
- The actor HTTP API endpoint format (`/v1.0/actors/<actorType>/<actorId>/method/<method>`) is correct per official Dapr documentation.
- The Redis component YAML is correct, including the `actorStateStore: "true"` metadata field which enables the state store for actor use.
- The use of `POST` for invoking actor methods via HTTP is correct.
- The reminder testing pattern shown is conceptual (uses a custom callback hook), which is a reasonable approach for unit testing but would differ from how Dapr actually delivers reminders via HTTP callbacks in integration tests.
