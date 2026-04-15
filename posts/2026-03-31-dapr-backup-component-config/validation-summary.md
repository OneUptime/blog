# Validation Summary: How to Back Up Dapr Component Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (components, configurations, subscriptions, resiliencies, httpendpoints CRDs)
- Kubernetes (CronJob, kubectl, custom resources)
- Bash scripting
- AWS S3 (for backup storage)
- Git / GitOps (for configuration drift detection)
- Python PyYAML (for YAML validation)

## Sources Consulted
- Dapr documentation on custom resource definitions: https://docs.dapr.io/reference/resource-specs/
- Kubernetes CronJob API reference (batch/v1): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- kubectl output formatting (`-o yaml` list format behavior)
- Python PyYAML documentation for `safe_load_all()`: https://pyyaml.org/wiki/PyYAMLDocumentation
- bitnami/kubectl container image contents

## Issues Found

1. **YAML validation generator not consumed (line 140)**: `yaml.safe_load_all()` returns a lazy generator. The original code never iterated over it, so invalid YAML would not raise an error and the validation would always report "OK". Fixed by wrapping in `list()` to force evaluation: `list(yaml.safe_load_all(open('$f').read()))`.

2. **CronJob container image missing AWS CLI (line 78)**: The CronJob uses `bitnami/kubectl:latest` but the script inside the container calls `aws s3 cp`. The bitnami/kubectl image does not include the AWS CLI, so the backup would fail at runtime. Added a comment clarifying that a custom image with both kubectl and AWS CLI is needed.

3. **Shebang not on first line in GitOps script (lines 103-104)**: The `#!/bin/bash` shebang was preceded by a comment line, which means it would not be recognized as a shebang if the script were saved and executed directly. Moved the shebang to the first line with the comment after it.

4. **Incorrect resource count grep pattern (lines 48, 146)**: `grep -c "^kind:"` was used to count resources in kubectl YAML output, but `kubectl get -o yaml` wraps results in a `List` object where individual resources have indented `kind:` fields. The pattern `^kind:` only matches the top-level `kind: List` wrapper (count of 1), not individual resources. Changed to `grep -c "^- apiVersion:"` which correctly counts items in the kubectl list output.

## Review Notes
- The restore script uses `--namespace` flag, but since backups are taken with `--all-namespaces`, the exported YAML already contains namespace metadata in each resource. The `--namespace` flag only applies to resources without embedded namespace metadata, so it won't redirect resources to a different namespace. This is not incorrect but could be misleading if users expect to restore to a different namespace.
- The `sha256sum` command used in the backup and verification scripts is Linux-specific. On macOS, the equivalent is `shasum -a 256`. Since these scripts target Kubernetes environments (typically Linux), this is acceptable but worth noting for local development use.
- The Dapr CRD resource names (components, configurations, subscriptions, resiliencies, httpendpoints) are all correct and current as of Dapr 1.12+.
