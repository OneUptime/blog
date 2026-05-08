# Validation Summary: How to Validate Resolution of Calico iptables Rules Not Applied

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Felix
- iptables
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Prometheus metrics

## Sources Consulted
- Calico Open Source documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Configure outgoing NAT, https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico Open Source documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Local iptables help output for iptables command syntax.

## Issues Found
- The MASQUERADE validation checked only the built-in `POSTROUTING` chain with `iptables -L`, which can miss Calico's actual NAT rule in the `cali-nat-outgoing` chain. Changed it to use `iptables-save -t nat` and count MASQUERADE rules attached to `cali-nat-outgoing`.
- The expected Felix metric name used `felix_int_dataplane_failures_total`, but Calico's metric reference lists `felix_int_dataplane_failures`. Updated the expected metric name.
- The NetworkPolicy test ran in the default namespace, where existing policies could additively allow traffic and produce a false failure. Updated the test to create and clean up an isolated namespace, and added waits for pod readiness before executing the traffic test.
- The BusyBox wget timeout flag was written as `--timeout=5`, which is less portable for BusyBox. Changed it to `-T 5`.
- The Felix health check used `calico-node -felix-health-check`, which is not the readiness flag shown in Calico's documented calico/node probe examples. Changed it to `calico-node -felix-ready`.

## Review Notes
- Felix Prometheus metrics are disabled by default in Calico unless enabled in FelixConfiguration, and the default metrics port is 9091 when enabled.
- The examples assume the calico-node DaemonSet is in `kube-system`; operator-based installs may use `calico-system`, so readers may need to adjust the namespace.
