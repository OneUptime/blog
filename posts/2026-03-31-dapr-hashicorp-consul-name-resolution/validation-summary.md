# Validation Summary: How to Configure HashiCorp Consul Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- HashiCorp Consul (service discovery and name resolution)
- Docker Compose
- Kubernetes (referenced for secrets and deployment context)

## Sources Consulted
- Dapr Consul name resolution component documentation: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Consul Agent Service API: https://developer.hashicorp.com/consul/api-docs/agent/service

## Issues Found

### Issue 1: Wrong resource kind and YAML structure (Critical)
**What was wrong:** The post used `kind: Component` with `spec.type: nameresolution.consul` and `spec.metadata` name/value pairs containing JSON strings. Consul name resolution in Dapr is configured through a `kind: Configuration` resource with `spec.nameResolution.component: "consul"` and `spec.nameResolution.configuration` containing direct YAML fields.
**What was changed:** Replaced the entire component YAML block with the correct Configuration resource format using proper YAML structure as shown in the official Dapr documentation.
**Why:** The original YAML would not work at all. Dapr name resolution is not configured as a Component; it is part of the Dapr Configuration resource.

### Issue 2: Missing `selfRegister: true` (Critical)
**What was wrong:** The configuration did not include `selfRegister: true`. This field defaults to `false`, meaning Dapr would NOT register the service with Consul, defeating the purpose of the tutorial.
**What was changed:** Added `selfRegister: true` to the configuration and added an explanatory note.
**Why:** Without `selfRegister: true`, Dapr will not register the application as a service in Consul.

### Issue 3: Hardcoded values instead of Dapr template variables in health checks
**What was wrong:** The health check used `http://localhost:3500/v1.0/healthz` with a hardcoded address and port. The official documentation uses Dapr template variables like `${HOST_ADDRESS}`, `${DAPR_HTTP_PORT}`, and `${APP_ID}`.
**What was changed:** Replaced hardcoded values with Dapr template variables (`${HOST_ADDRESS}`, `${DAPR_HTTP_PORT}`, `${APP_ID}`) and added a note explaining they are resolved at runtime.
**Why:** Hardcoded values would break in multi-host deployments or when the Dapr HTTP port is not the default 3500.

### Issue 4: Wrong file location and CLI flag for loading configuration
**What was wrong:** The post instructed users to place the file in `~/.dapr/components/` and use `--components-path`. Since this is a Configuration resource (not a Component), it should be loaded with the `--config` flag. The default location is `~/.dapr/config.yaml`.
**What was changed:** Updated to reference `~/.dapr/config.yaml` as the default location and changed the `dapr run` command to use `--config ./consul-config.yaml`.
**Why:** `--components-path` (now deprecated in favor of `--resources-path`) loads Component resources, not Configuration resources. Using the wrong flag means the configuration would be ignored.

### Issue 5: ACL token configuration used wrong format
**What was wrong:** The ACL section used Component-style `metadata` with name/value JSON pairs and `secretKeyRef`, which is not valid for Configuration resources. `secretKeyRef` is a Component metadata feature, not available in Configuration resources.
**What was changed:** Replaced with the correct Configuration YAML format showing the `token` field inside the `client` section, and replaced the `secretKeyRef` approach with Dapr's `${ENV_VAR}` template substitution for secure token handling.
**Why:** The original YAML syntax would not be parsed by Dapr. The `secretKeyRef` feature does not exist for Configuration resources.

### Issue 6: Incorrect claim about automatic deregistration
**What was wrong:** The post stated "Consul removes unhealthy services automatically," implying Dapr handles deregistration on shutdown. The official Dapr documentation explicitly states: "The name resolution interface does not cater for an 'on shutdown' pattern so please consider this if using Dapr to register services to Consul as it will not deregister services."
**What was changed:** Removed the incorrect claim and added a warning that Dapr does not deregister services on shutdown, with guidance to plan for cleanup in production.
**Why:** This is a critical operational consideration. Users relying on automatic deregistration would find stale services accumulating in Consul.

## Review Notes
- The `--components-path` flag used in the original post is deprecated in favor of `--resources-path` in recent Dapr versions, but this is moot since the configuration should use `--config` anyway.
- The Docker Compose example uses `version: "3.8"` which is a legacy field ignored by modern Docker Compose but does not cause errors.
- The Consul deregister API endpoint (`PUT /v1/agent/service/deregister/{serviceID}`) shown for manual deregistration is correct.
- The service invocation URL pattern (`/v1.0/invoke/{appId}/method/{methodName}`) is correct.
- The Consul catalog services endpoint (`/v1/catalog/services`) is correct for verifying registration.
