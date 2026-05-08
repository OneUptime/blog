# Validation Summary: Validate Calico CNI Plugin Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico CNI
- Kubernetes
- kubectl
- calicoctl
- Kubernetes pod networking
- Calico WorkloadEndpoint resources

## Sources Consulted
- Calico documentation: Configure the Calico CNI plugins: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: WorkloadEndpoint resource: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico documentation: calicoctl get command: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Configure calico/node: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes documentation: kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The `kubectl debug node` loop used `-it` for a scripted, non-interactive command. Kubernetes documents `kubectl debug node/mynode -it` for interactive sessions, but this example runs `cat` in a loop, so the command was changed to omit `-it`.
- The CNI binary check used `kubectl exec -n calico-system ds/calico-node`, which executes against a selected pod from the DaemonSet rather than checking each node. The example now loops over `calico-node` pods so it matches the stated goal of checking the binaries on nodes.
- The WorkloadEndpoint inspection used a fixed name, `cni-test-1-eth0`, but Calico WorkloadEndpoint names include node/orchestrator-derived components and pod-name escaping, as shown in the official WorkloadEndpoint examples. The command now discovers the WorkloadEndpoint name by matching `.Spec.Pod` before inspecting it.
- The CNI log check used `ds/calico-node` while describing a specific node. The example now selects a concrete `calico-node` pod before tailing `/var/log/calico/cni/cni.log`.

## Review Notes
- The post assumes the Calico components run in the `calico-system` namespace, which is correct for common Tigera Operator installs. Manifest-based installs may use `kube-system`, so users may need to adjust the namespace.
- The expected pod CIDR `192.168.0.0/16` is a common Calico default, but Calico can choose or be configured with other pools. The post already notes to use the configured pool.
