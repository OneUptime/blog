# Validation Summary: How to Test Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix / calico-node
- Kubernetes NetworkPolicy
- kubectl
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico the hard way overview: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico the hard way - Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico the hard way - Install calico/node: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico datastore behavior: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post used the non-current/non-documented Typha metric `typha_updates_sent`. I changed the example to use `typha_updates_total`, which is listed in the current Calico Typha metrics reference.
- The examples hardcoded `calico-system` and Typha metrics port `9093`. The current Calico hard-way documentation installs Typha and calico/node in `kube-system`, and Typha's default Prometheus metrics port is `9091`. I added `CALICO_NAMESPACE` and `TYPHA_METRICS_PORT` variables so the commands work for hard-way defaults and can still be overridden for custom installs.
- The connection tests used `typha_connections_active`, which includes connections that have not completed the handshake. I changed them to `typha_connections_streaming`, the metric for client connections that have completed the handshake.
- The connection tests queried only one Typha pod while comparing against the total node count. The hard-way guide deploys multiple Typha replicas, so I changed the snippets to sum the connection metric across all Typha pods.
- The policy enforcement test did not wait for test pods to become Ready and did not explicitly fail when the blocked request succeeded. I added `kubectl wait` checks and explicit pass/fail handling around the `wget` command.
- The conclusion described retained enforcement as "Felix failsafe mode." Calico failsafe rules are a separate Felix feature, so I changed the wording to state that Felix keeps its last applied dataplane state while new datastore updates cannot be applied.

## Review Notes
- The latency test relies on Felix log content containing the NetworkPolicy name. That is useful as an operational smoke test, but exact log text can vary by Calico version and log level. A future improvement would be to pair it with Felix or Typha metrics where available.
