# Validation Summary: How to Validate Dapr Component Specifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr init`, `dapr run`)
- kubeconform (Kubernetes manifest validation)
- kubectl (`--dry-run=server`)
- Dapr Component CRD (`dapr.io/v1alpha1`)
- Redis state store component (`state.redis`)
- GitHub Actions CI/CD

## Sources Consulted
- Dapr CLI `dapr run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr init` command reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr CRD definitions in dapr/dapr repo: https://github.com/dapr/dapr/tree/master/charts/dapr/crds
- kubeconform README and documentation: https://github.com/yannh/kubeconform
- datreeio/CRDs-catalog (Dapr JSON schemas): https://github.com/datreeio/CRDs-catalog
- Dapr CLI GitHub issue on --components-path deprecation: https://github.com/dapr/cli/issues/953

## Issues Found

1. **Deprecated `--components-path` flag (line 24)**: The `--components-path` flag was deprecated in Dapr CLI v1.13.0 and replaced with `--resources-path`. Updated the command to use `--resources-path`.

2. **Nonexistent `crds-to-json-schema.py` script (line 42)**: The post claimed to download the Dapr repo and run `python3 charts/dapr/crds-to-json-schema.py` to generate JSON schemas. This script does not exist in the dapr/dapr repository. Replaced the entire workflow with the correct approach: using schemas from the datreeio/CRDs-catalog via a remote URL with kubeconform's `-schema-location` flag.

3. **Misleading claim about Dapr publishing JSON schemas (line 34)**: The post stated "Dapr publishes JSON schemas for its CRDs." Dapr publishes raw CRD YAML definitions, not JSON schemas. JSON schemas for Dapr CRDs are provided by the third-party datreeio/CRDs-catalog project. Updated the text to correctly attribute the source.

4. **CI/CD workflow missing schema location (line 116)**: The GitHub Actions workflow used `kubeconform -summary ./components/*.yaml` without specifying a schema location for Dapr CRDs. kubeconform only knows about built-in Kubernetes resource types by default, so Dapr Components would be skipped or fail. Added the `-schema-location` flags pointing to the CRDs-catalog.

## Review Notes
- The Dapr Component YAML examples (apiVersion, kind, spec fields, metadata field names) are all correct and current.
- The `kubectl apply --dry-run=server` example and expected error output are accurate — the Dapr CRD does enforce `type` as a required field at the schema level.
- The `redisHost` and `redisPassword` metadata field names for the Redis state store are correct and current.
- The `--components-path` flag still works with a deprecation warning, but the post should use the current `--resources-path` to avoid teaching deprecated patterns.
