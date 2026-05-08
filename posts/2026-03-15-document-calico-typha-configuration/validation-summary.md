# Validation Summary: How to Document Calico Typha Configuration for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Typha
- Kubernetes
- kubectl
- Prometheus metrics
- TLS configuration

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico hard way Typha installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico resource configuration guide: https://docs.tigera.io/calico/latest/reference/configure-resources
- Kubernetes kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Project Calico v3.25 Typha config source: https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/typha/pkg/config/config_params.go
- Project Calico v3.32 Typha config source: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/typha/pkg/config/config_params.go

## Issues Found
- Removed `calicoctl` from the prerequisites because the post does not use it for any command.
- Added a namespace caveat because operator-managed Calico commonly uses `calico-system`, while manifest-based installs often use `kube-system`.
- Clarified that direct `TYPHA_` environment-variable configuration applies to manifest-based installations. Official Calico documentation states that Typha configuration cannot be modified directly when Calico is installed via the operator.
- Corrected the Typha connection-limit defaults in the example table from `100`/`300` to `400`/`10000`, matching the Calico v3.25+ and current Typha source defaults.
- Corrected the example Prometheus metrics port from `9091` to `9093`, matching the Calico v3.25+ and current Typha source default.
- Added a manifest-based-installation caveat before the `kubectl set env` log-level change commands so operators do not treat direct Deployment edits as the persistent path for operator-managed installs.

## Review Notes
The commands are generally valid Kubernetes inspection commands, but several examples rely on Calico deployment labels and namespaces that can vary by installation method. Future improvements could use variables for namespace and metrics port to make the snippets more portable.
