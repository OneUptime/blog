# Validation Summary: Validating Disadvantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium in-agent `cilium-dbg` CLI
- Hubble
- Kubernetes
- kubectl
- Helm
- VXLAN encapsulation
- BusyBox test pods

## Sources Consulted
- Cilium routing modes and encapsulation documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium end-to-end connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Helm `helm get values` reference: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The Cilium connectivity-test examples used `--test pod-to-pod`, `--test pod-to-service`, and `--test dns-resolution`. Cilium documents `--test` as a regex filter, and scenario-targeted filters use slash-prefixed paths while the DNS test is named `dns-only`. Changed the examples to `--test /pod-to-pod`, `--test /pod-to-service`, and `--test dns-only`.
- The BusyBox client pod was created with `kubectl run ... -- sleep 300`, which passes `sleep 300` as arguments to the image default command unless `--command` is set. Added `--command` so the pod actually runs `sleep 300`.
- The BusyBox `wget` examples used the long `--timeout` option. Switched to `-T 5`, which is compatible with BusyBox `wget`.
- The custom workload section implied guaranteed same-node and cross-node testing, but the manifest only uses preferred pod anti-affinity. Updated the wording to state that anti-affinity helps exercise cross-node paths on multi-node clusters.
- The endpoint and metrics examples used `cilium endpoint list` and `cilium metrics list` inside Cilium agent pods. Current Cilium command references document these as `cilium-dbg endpoint list` and `cilium-dbg metrics list`. Updated the commands and troubleshooting note accordingly.
- The endpoint-count check said to verify that Cilium endpoint count matches running pod count. That can be inaccurate for host-network or unmanaged pods, so the wording now says to compare the counts and expect differences in those cases.

## Review Notes
- The post remains a general validation guide and is not pinned to a specific Cilium version. Some exact connectivity-test names can change over time, so future updates should re-check the Cilium CLI command reference for the version being used.
