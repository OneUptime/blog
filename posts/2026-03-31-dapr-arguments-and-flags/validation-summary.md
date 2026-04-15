# Validation Summary: How to Configure Dapr Arguments and Flags

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- daprd sidecar CLI flags
- Dapr CLI (`dapr run`)
- Kubernetes annotations for Dapr
- Helm chart configuration for Dapr

## Sources Consulted
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI Run Reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes Annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr Helm Chart (dapr/dapr GitHub repository)

## Issues Found

1. **`--app-protocol` missing valid values**: The table listed only `http` or `grpc` as valid values for `--app-protocol`. The official documentation supports five values: `http`, `https`, `grpc`, `grpcs`, and `h2c`. Fixed the table to list all five.

2. **`--components-path` deprecated**: All references used the deprecated `--components-path` flag. This has been replaced by `--resources-path` in current Dapr versions. Updated all occurrences (table, daprd direct example, `dapr run` examples) to use `--resources-path`.

3. **`dapr.io/enable-metrics` annotation does not exist**: The table listed `dapr.io/enable-metrics` as the annotation equivalent for `--enable-metrics`. This annotation does not exist in the official Dapr annotations list; metrics are configured through the Dapr Configuration spec instead. Changed the annotation equivalent to N/A.

4. **`--dapr-grpc-port` annotation listed as N/A**: The table incorrectly listed N/A for the annotation equivalent of `--dapr-grpc-port`. The correct annotation is `dapr.io/grpc-port`. Fixed the table entry.

5. **`dapr.io/sidecar-container-args` annotation does not exist**: The Kubernetes section referenced a non-existent `dapr.io/sidecar-container-args` annotation for passing additional flags to the sidecar. This annotation is not in the official Dapr documentation or source code. Rewrote the introductory text to simply describe using Dapr annotations on pod specs.

6. **`dapr_sentry.tokenAudience` Helm parameter does not exist**: The Helm chart example included `--set dapr_sentry.tokenAudience=dapr.io`, which is not a valid Helm chart parameter. Removed this non-existent parameter from the example.

## Review Notes
- The `--enable-metrics` flag is available on `daprd` directly but is not a flag on the `dapr run` CLI command. The post's `dapr run` example does not use it, so this is not an error in the post, but worth noting for readers.
- The `--metrics-port` flag appears in the daprd direct example but is not listed in the flags table. This is a minor omission but not incorrect since the table is described as covering "key" flags rather than being exhaustive.
- The `dapr_operator.watchInterval` Helm parameter exists in the operator sub-chart but may vary between Dapr versions. Readers should consult the Helm chart values for their specific version.
