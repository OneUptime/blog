# Validation Summary: How to Configure Dapr with Hazelcast State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Hazelcast (in-memory data grid, version 5.3)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Docker / Docker Compose
- Kubernetes (component deployment)

## Sources Consulted
- Dapr official documentation — Hazelcast state store component spec (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-hazelcast/)
- Dapr components-contrib source code — `state/hazelcast/hazelcast.go` (https://github.com/dapr/components-contrib)
- Dapr JavaScript SDK source code and API reference (https://github.com/dapr/js-sdk)
- Dapr State Management HTTP API reference (https://docs.dapr.io/reference/api/state_api/)
- Hazelcast Docker Hub image tags (https://hub.docker.com/r/hazelcast/hazelcast)
- Hazelcast Docker configuration documentation for environment variables

## Issues Found
No technical issues found.

## Review Notes
- The component type `state.hazelcast` is confirmed in Dapr's component registry with the exact metadata fields `hazelcastServers` and `hazelcastMap` used in the post.
- The Dapr JS SDK API calls (`state.save`, `state.get`, `state.delete`) use correct signatures and parameter formats.
- The Docker Compose setup correctly maps different host ports (5701, 5702) to the same container port (5701) for the two Hazelcast nodes, and `HZ_CLUSTERNAME` is a valid Hazelcast environment variable for cluster naming.
- The Dapr HTTP API endpoint `http://localhost:3500/v1.0/state/{storeName}/{key}` is correct for state retrieval.
- Hazelcast's default backup count of 1 means a 2-node cluster does provide the failover behavior described in the testing section.
- The `docker-compose` CLI commands shown are standard and correct, though newer Docker versions prefer `docker compose` (without hyphen). Both forms work.
