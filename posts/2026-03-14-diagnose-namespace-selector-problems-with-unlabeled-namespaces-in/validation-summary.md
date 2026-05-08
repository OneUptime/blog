# Validation Summary: Diagnosing Namespace Selector Problems with Unlabeled Namespaces in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico FelixConfiguration and Felix logging
- Kubernetes namespaces, labels, pods, and NetworkPolicy selectors
- kubectl
- BusyBox diagnostic containers

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix runtime configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The diagnostic `wget` commands used `--timeout=5` with a BusyBox client image. BusyBox `wget` commonly supports the short `-T` timeout option, so the commands were changed to `wget -qO- -T 5` to match the selected diagnostic image.
- The Felix debug logging example attempted to set `FELIX_LOGSEVERITYSCREEN=debug` through `kubectl exec`. That only sets an environment variable for the short-lived shell process and does not reconfigure the running Felix process. The example was changed to patch the `FelixConfiguration` resource with `logSeverityScreen: Debug`, then restore it to `Info`.
- The troubleshooting text said that a deny in any Calico policy takes precedence. Calico evaluates policies by tier and order, and `Allow` and `Deny` rule actions are final when matched. The text was updated to direct readers to check tier, order, and rule sequence instead of assuming deny always wins globally.

## Review Notes
The post is technically relevant and the main Calico namespace selector concepts are accurate. The Felix log examples assume Calico is installed in the `calico-system` namespace with pods labeled `k8s-app=calico-node`; some installations use a different namespace, such as `kube-system`, so readers may need to adjust the namespace in those commands.
