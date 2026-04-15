# Validation Summary: How to Use the dapr components Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr components` command)
- Kubernetes
- Dapr Component YAML configuration

## Sources Consulted
- Dapr CLI reference: `dapr components` — https://docs.dapr.io/reference/cli/dapr-components/
- Dapr CLI reference: `dapr run` — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Component schema reference — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component scoping how-to — https://docs.dapr.io/operations/components/component-scopes/
- Dapr Zipkin tracing setup — https://docs.dapr.io/operations/observability/tracing/zipkin/

## Issues Found

### 1. `dapr components` shown working in self-hosted mode (HIGH)
**What was wrong:** The post had a "Listing Components in Self-Hosted Mode" section showing `dapr components` (without `-k`) working in self-hosted mode with sample output. According to the official Dapr CLI docs, this command is supported only in Kubernetes mode and requires the `--kubernetes` (`-k`) flag.
**What was changed:** Removed the self-hosted section. Consolidated all usage under Kubernetes mode with the `-k` flag. Updated the overview to clarify the command is Kubernetes-only. Updated the description metadata to remove "self-hosted" reference.

### 2. `exporters.zipkin` is not a valid Dapr component type (HIGH)
**What was wrong:** The sample output listed `zipkin  exporters.zipkin  v1` as a loaded component. There is no `exporters.zipkin` component type in Dapr. Zipkin tracing is configured via a `Configuration` resource (kind: Configuration), not a `Component` resource.
**What was changed:** Replaced the `exporters.zipkin` entry with `bindings.cron`, which is a valid Dapr component type, in the sample output.

### 3. Sample output missing NAMESPACE column for what was supposed to be self-hosted mode
**What was wrong:** The original self-hosted sample output did not include a NAMESPACE column, but since the command is Kubernetes-only, the output always includes it.
**What was changed:** Added the NAMESPACE column to the sample output as part of the Kubernetes consolidation fix.

### 4. `dapr components` without `-k` in Diagnosing section
**What was wrong:** Line 76 had `dapr components` without the required `-k` flag.
**What was changed:** Updated to `dapr components -k`.

## Review Notes
- The `scopes` field in the Component YAML example is correctly placed at the root level (sibling of `spec`), which matches the official Dapr component schema.
- The `--resources-path` flag used with `dapr run` is the current correct flag (the older `--components-path` is deprecated).
- The `apiVersion: dapr.io/v1alpha1` is correct for Dapr Component resources.
- The `--namespace` and `--output json` flags are confirmed correct per the CLI reference.
- The JSON output format shown is representative, though the exact field names may vary slightly depending on Dapr CLI version.
