# Validation Summary: Common Mistakes to Avoid in Calico Component Log Collection

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator custom resources
- Kubernetes kubectl logs and patch commands
- Fluent Bit monitoring API
- Grafana Loki logcli
- Mermaid diagrams

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Grafana Loki logcli documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The post used an unverified numeric estimate that Debug logging can generate "10-100x" more volume and "GBs per hour per component" on a 100-node cluster. I changed this to state that Debug is the most verbose level and can significantly increase log volume, which aligns with Calico documentation without asserting unsupported cluster-wide numbers.
- The CRD state example implied `tigerastatus` and `installation` are always present. I added a note that those resources are available on operator-managed installs, matching Calico's Installation API documentation.
- The Fluent Bit monitoring note referred to `output.errors` as if it were a single stable metric path. I changed it to refer to each output plugin's `errors` and `retries_failed` counters, matching the JSON structure from Fluent Bit's `/api/v1/metrics` endpoint.

## Review Notes
- `kubectl` and `logcli` were not installed in the local environment, so command validation used official Kubernetes and Grafana documentation instead of local `--help` output.
- The Calico `felixconfiguration default` patch commands use a valid resource and `logSeverityScreen` values. The `kubectl logs` examples use valid `--prefix`, `--tail`, label selector, container, and `--previous` behavior.
