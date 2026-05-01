# Validation Summary: How to Deploy Temporal via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Temporal Server
- Temporal Web UI
- Temporal CLI
- Docker Compose
- PostgreSQL
- Python
- Temporal Python SDK

## Sources Consulted
- Temporal CLI setup docs: https://docs.temporal.io/cli/setup-cli
- Temporal CLI workflow command reference: https://docs.temporal.io/cli/workflow
- Temporal persistence docs: https://docs.temporal.io/temporal-service/persistence
- Temporal self-hosted security docs: https://docs.temporal.io/self-hosted-guide/security
- Temporal Python SDK API docs for `Client.execute_workflow`: https://python.temporal.io/temporalio.client.Client.html
- Temporal Python SDK API docs for `workflow.execute_activity`: https://python.temporal.io/temporalio.workflow.html
- Temporal Python SDK API docs for `Worker`: https://python.temporal.io/temporalio.worker.Worker.html
- Official Temporal Docker Compose postgres example: https://github.com/temporalio/docker-compose/blob/main/docker-compose-postgres.yml
- Official Temporal Docker Compose default versions file: https://github.com/temporalio/docker-compose/blob/main/.env
- Official `auto-setup` entry script: https://github.com/temporalio/docker-builds/blob/main/docker/auto-setup.sh
- Temporal UI Docker README: https://github.com/temporalio/ui/blob/main/server/docker/README.md

## Issues Found
- The conclusion said Temporal persists "every workflow step" in PostgreSQL. I changed this to workflow execution state and event history, which matches Temporal's persistence model in the official docs.
- The conclusion implied retry handling is automatic in a way that removes the need for retry considerations in worker code. I changed this to say retries are configured through Temporal retry policies, which is the technically accurate behavior.
- The conclusion said `TEMPORAL_TLS_*` enables mTLS between workers and the server. I changed this because those variables are used by the UI container for its connection to a TLS-enabled Temporal frontend; server-side TLS/mTLS is configured in Temporal Server.

## Review Notes
- The Docker stack is appropriate for a simple self-hosted setup. Temporal's official Docker guidance notes that `temporalio/auto-setup` is convenient for setup, while production deployments typically use `temporalio/server` with explicit configuration.
- The post pins older image versions. As of 2026-05-01, Temporal's official Docker Compose defaults use `TEMPORAL_VERSION=1.29.1`, `TEMPORAL_UI_VERSION=2.34.0`, and `POSTGRESQL_VERSION=16`. The post's version pins are older, but the documented configuration remains structurally consistent with the official examples.
- The CLI commands and Python SDK example are consistent with the current official command reference and SDK API documentation.
