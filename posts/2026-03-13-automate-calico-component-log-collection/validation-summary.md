# Validation Summary: How to Automate Calico Component Log Collection

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source / Tigera operator components
- Kubernetes
- kubectl
- Bash scripting
- Kubernetes CronJob
- Calico FelixConfiguration

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Calico component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico configuring Felix documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview

## Issues Found
- The post described the temporary debug script as enabling debug logging for a generic "specific component", but the script patches the global `FelixConfiguration` resource and affects Felix logging. Updated the wording to say Felix debug logging.
- The `kubectl logs` examples used label selectors but did not set `--max-log-requests`. The official kubectl reference documents a default concurrency of 5 for selector-based log requests. Added `--max-log-requests=50` to make collection behavior explicit for larger node pools.
- The post described `calico-apiserver` as "if Enterprise/EE". Current Calico documentation notes that new operator-based open source installations include the API server component by default, and non-operator installs can also install it. Changed the comment to "if installed".
- The conclusion referred to the temporary debug script generically. Updated it to "temporary Felix debug script" to match the actual resource being patched.

## Review Notes
- The examples assume an operator-style Calico installation using the `calico-system` namespace and operator CRDs such as `installation.operator.tigera.io` and `tigerastatus`. Manifest-based installations may use different namespaces, and the operator resources may not exist.
- The CronJob manifest is structurally valid for `batch/v1`, but it depends on a pre-created `calico-log-collector` ServiceAccount with RBAC allowing pod log access and a pre-created `calico-log-archive` PersistentVolumeClaim.
- `kubectl` was not installed in the local environment, so CLI flags were verified against official Kubernetes documentation instead of local `kubectl --help` output.
