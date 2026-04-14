# Validation Summary: How to Use State Store Scoping in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management API
- Dapr Component Scoping
- Redis (as state store backend)
- PostgreSQL (as state store backend)
- Kubernetes (Deployments, Namespaces, Annotations)

## Sources Consulted
- Dapr Component Schema Reference — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scopes Guide — https://docs.dapr.io/operations/components/component-scopes/
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Kubernetes Annotations Reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis State Store Reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL State Store Reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Component Secrets Reference — https://docs.dapr.io/operations/components/component-secrets/
- Dapr GitHub Issues #2693 and #8124 (scoping error behavior)

## Issues Found
1. **Incorrect error code for non-scoped access (two locations)**
   - **What was wrong:** The post stated that a non-scoped app would receive a "403 error" (HTTP 403 Forbidden) when attempting to access a scoped state store. This appeared in the explanatory text after the first YAML example and in the curl verification example.
   - **What was changed:** Updated to explain that Dapr does not load scoped components for apps outside the scope list, so the app receives an error indicating the state store is not configured (HTTP 400), not a 403 Forbidden. The curl example comment was updated from "HTTP 403 Forbidden" to "HTTP 400 — state store orders-statestore is not configured".
   - **Why:** Dapr's scoping mechanism works by simply not loading the component for non-scoped apps. The component is invisible to those apps, so the Dapr sidecar responds as if the state store was never configured, resulting in a 400 error rather than a 403 authorization error.

## Review Notes
- The `scopes` field placement at the top level of the Component YAML (sibling of `apiVersion`, `kind`, `metadata`, `spec`) is correct per the official Dapr component schema.
- The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all correct.
- The component type names `state.redis` and `state.postgresql` are correct. Note that PostgreSQL v2 is the current recommended version; using `version: v1` in the spec is valid but v2 is preferred for new deployments.
- The `secretKeyRef` format with `name` and `key` fields is correct.
- The state API endpoint `GET /v1.0/state/{store-name}/{key}` is correct.
- Namespace isolation behavior is accurately described.
