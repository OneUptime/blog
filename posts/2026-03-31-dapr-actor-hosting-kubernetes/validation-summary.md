# Validation Summary: How to Use Dapr Actor Hosting in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Placement Service
- Dapr Sidecar Injection
- Kubernetes (Deployments, Services, Annotations)
- Redis (as actor state store)
- Dapr CLI

## Sources Consulted
- Dapr Kubernetes deployment guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Scheduler service overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr state store Redis setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr actor runtime configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr actor reentrancy: https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/
- Dapr Placement Service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/

## Issues Found

### 1. Missing `dapr-scheduler-server` from expected `dapr status -k` output
**What was wrong:** The expected output for `dapr status -k` listed only 4 control plane components (dapr-operator, dapr-placement-server, dapr-sentry, dapr-sidecar-injector). Since Dapr 1.12+, `dapr-scheduler-server` is also deployed as a fifth control plane component.
**What was changed:** Added `dapr-scheduler-server` to the expected output table.
**Why:** The blog does not pin to a specific Dapr version and uses `1.x.x` placeholders, so the output should reflect the current state of the Dapr control plane.

### 2. Actor runtime settings incorrectly placed in Configuration CRD
**What was wrong:** Step 4 showed actor-specific settings (`spec.actor.reentrancy`, `spec.actor.remindersStoragePartitions`) inside a Kubernetes `Configuration` resource (`kind: Configuration`). The Dapr Configuration CRD does not have a `spec.actor` section. Actor runtime settings (reentrancy, idle timeout, scan interval, drain settings, remindersStoragePartitions) are configured in application code through the respective Dapr SDK and exposed to the sidecar via the app's `/dapr/config` HTTP endpoint.
**What was changed:** Rewrote Step 4 to correctly explain that actor settings are configured in application code (with a Node.js SDK example), and clarified that the `dapr.io/config` annotation references a Configuration resource used for general sidecar settings like tracing and metrics — not actor-specific configuration. Provided a corrected Configuration YAML with valid fields (`tracing`, `metrics`).
**Why:** Applying the original YAML would create a Configuration resource with unrecognized fields. The sidecar would ignore the `spec.actor` section, and actor settings would silently remain at defaults, leading to confusion.

### 3. Incorrect code fence language for log output
**What was wrong:** Dapr sidecar log output was wrapped in a ` ```toml ` code fence. TOML is a configuration format (`[sections]`, `key = "value"`); Dapr logs use a logfmt-style structured format.
**What was changed:** Changed the code fence from ` ```toml ` to ` ```text `.
**Why:** Using `toml` causes incorrect syntax highlighting in rendered Markdown, which could confuse readers.

## Review Notes
- The post states the Placement Service "distributes actors evenly across available pods." This is an oversimplification — the Placement Service uses consistent hashing to deterministically route actor IDs to instances, which is approximately but not perfectly uniform. This is acceptable for a tutorial-level post.
- The post states "In-flight actor method calls complete before redistribution." This is true by default (`drainRebalancedActors` defaults to `true`) but is bounded by `drainOngoingCallTimeout` (default 60s). A more precise statement would mention these settings, but the current wording is not incorrect for the default case.
- The Kubernetes version prerequisite of 1.22+ is reasonable but conservative; current Dapr versions support the Kubernetes versions that are still in the upstream support window.
- The default actor idle timeout (1h0m0s) and scan interval (30s) shown in the example log output are correct.
