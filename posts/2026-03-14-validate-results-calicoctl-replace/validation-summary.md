# Validation Summary: How to Validate Results After Running calicoctl replace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Felix
- Bash
- Python
- YAML and JSON

## Sources Consulted
- Calico calicoctl replace documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico datastore setup documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The prerequisites listed only python3, but the comparison script imports the external `yaml` module. Updated the prerequisite to require PyYAML.
- The resource comparison script assumed `calicoctl get -o json` returns a single object. Calico documents JSON/YAML output as list-style output suitable for resource management commands, so the script now handles list output and Kubernetes-style `items` output before comparing the matching resource.
- The comparison logic only checked fields present in the intended spec, even though the post says validation should catch unintended removed or extra fields. Updated the recursive comparison to report extra fields and type mismatches.
- The Felix sync script assumed the `calico-system` namespace, but Calico installations may use `kube-system` depending on installation method. Added a configurable `CALICO_NAMESPACE` variable and noted the manifest-installation case in the verification block.
- The Felix sync script printed the raw `felix_resync_state` metric but did not interpret whether Felix was actually in sync. Updated it to map values according to the official metric definition: 1 waiting for datastore, 2 resync in progress, 3 in sync with datastore.
- The Felix sync script assumed metrics were available without mentioning that Felix Prometheus metrics are disabled by default. Added the metrics-enabled prerequisite.
- The blocked connectivity example used an HTTP request against a database port, which could fail because of protocol mismatch rather than network policy enforcement. Changed the example to use an HTTP admin endpoint so pass/fail behavior reflects connectivity policy more accurately.

## Review Notes
The examples remain illustrative and still depend on the user's actual Calico install mode, workload names, namespaces, and test endpoints. Future improvements could include using `calicoctl get --export` when comparing user-managed fields, or adding a TCP-specific probe function for policies that govern non-HTTP services.
