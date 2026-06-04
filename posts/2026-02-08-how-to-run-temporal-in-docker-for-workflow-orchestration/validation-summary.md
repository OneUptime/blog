# Validation Summary: How to Run Temporal in Docker for Workflow Orchestration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Temporal Server
- Temporal CLI
- Temporal Go SDK
- Docker
- Docker Compose
- PostgreSQL
- Go

## Sources Consulted
- Temporal samples-server Docker Compose README: https://github.com/temporalio/samples-server/tree/main/compose
- Temporal samples-server PostgreSQL Compose file: https://raw.githubusercontent.com/temporalio/samples-server/main/compose/docker-compose-postgres.yml
- Temporal samples-server PostgreSQL setup script: https://raw.githubusercontent.com/temporalio/samples-server/main/compose/scripts/setup-postgres.sh
- Temporal auto-setup Docker Hub page: https://hub.docker.com/r/temporalio/auto-setup
- Temporal CLI 1.0 announcement and migration note: https://temporal.io/changelog/temporal-cli-reaches-1-0
- Temporal Go SDK workflow package documentation: https://pkg.go.dev/go.temporal.io/sdk/workflow
- Temporal Go SDK client package documentation: https://pkg.go.dev/go.temporal.io/sdk/client
- Temporal Go SDK worker package documentation: https://pkg.go.dev/go.temporal.io/sdk/worker
- Go release policy: https://go.dev/doc/devel/release
- Official Go Docker image tags: https://hub.docker.com/_/golang

## Issues Found
- The Docker Compose example used the deprecated `temporalio/auto-setup:latest` image. Replaced it with a supported `temporalio/server:1.31.0` service plus an explicit PostgreSQL schema setup service using `temporalio/admin-tools:1.31.0`.
- The Temporal database setting used `DB=postgresql`, which is not the current documented Docker environment value. Updated the supported setup to use the `postgres12` plugin/configuration.
- The workflow code referenced activity functions directly from the `workflows` package even though the activities were defined in a separate `activities` package. Added the activity package import and qualified activity function references.
- The worker container set `TEMPORAL_HOST=temporal:7233`, but the Go worker code ignored it and always connected to `localhost:7233`. Updated the worker code to read `TEMPORAL_HOST` and fall back to `localhost:7233`.
- The CLI examples used legacy `tctl` commands and flags. Updated workflow start, list, and describe examples to use the current `temporal` CLI command format.
- The starter example used `we.GetID()`, but the current Go SDK documents `WorkflowRun.GetWorkflowID()` and `GetRunID()`. Updated the logging line to use `GetWorkflowID()`.
- The worker Dockerfile used old base images (`golang:1.22-alpine` and `alpine:3.19`). Updated them to current supported tags available on Docker Hub as of the validation date.

## Review Notes
The Go snippets were reviewed against the current SDK documentation, but they were not compiled locally because the workspace does not have the `go` tool installed. The main Docker Compose YAML block was parsed successfully with PyYAML.
