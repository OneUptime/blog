# Validation Summary: How to Implement OPA Bundles

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Open Policy Agent (OPA)
- OPA bundles
- Rego
- OPA CLI
- OPA configuration
- AWS S3 and GCS bundle hosting
- OCI registries and ORAS
- Docker
- Kubernetes
- Prometheus metrics

## Sources Consulted
- OPA Bundles documentation: https://www.openpolicyagent.org/docs/management-bundles
- OPA CLI reference: https://www.openpolicyagent.org/docs/cli
- OPA Configuration reference: https://www.openpolicyagent.org/docs/configuration
- OPA REST API reference: https://www.openpolicyagent.org/docs/rest-api
- OPA Monitoring documentation: https://www.openpolicyagent.org/docs/monitoring

## Issues Found
- Bundle data file examples used arbitrary names such as `roles.json`, `permissions.json`, and `required_roles.json`. OPA bundle data files are loaded from `data.json` or `data.yaml` files, so these examples were changed to directory-scoped `data.json` files.
- The manual bundle example placed the policy and data under paths that did not match the declared manifest roots and Rego data reference. The example now uses `bundle/authz/authz.rego` and `bundle/required_roles/data.json`, matching roots `authz` and `required_roles`.
- The manifest root explanation said OPA rejects overlapping roots from multiple bundles. OPA documents root ownership as bundle scope and merge-conflict validation for bundle manifests; the wording was narrowed to overlapping roots within a bundle manifest.
- The optimized `opa build` example omitted an entrypoint. OPA requires an entrypoint when optimization is enabled, so `-e authz/allow` was added.
- The OCI Registry ORAS example used a non-documented OPA-specific layer media type and omitted the config object. It now uses OCI media types and an empty config JSON as shown in OPA's OCI bundle documentation.
- The status API command queried `.bundles`, but `/v1/status` wraps status under `.result`. The command now uses `jq '.result.bundles'`.
- The Prometheus metric names listed non-current `opa_bundle_*` metrics. They were replaced with documented status metrics such as `bundle_loaded_counter`, `bundle_failed_load_counter`, `last_success_bundle_activation`, and `bundle_loading_duration_ns`.
- The S3 rollback example called the copied object a symlink. The wording now says it replaces the latest object.

## Review Notes
OPA was not installed in the local environment, so CLI behavior was verified against the official OPA documentation rather than local `opa --help` output.
