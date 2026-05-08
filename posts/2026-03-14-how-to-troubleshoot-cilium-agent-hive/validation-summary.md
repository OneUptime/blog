# Validation Summary: Troubleshooting Cilium Agent Hive Dependency Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium Agent Hive
- Cilium Hubble
- Cilium Key-Value Store / etcd integration
- Kubernetes
- kubectl
- Graphviz DOT
- eBPF filesystem checks

## Sources Consulted
- Cilium command reference for `cilium-agent hive`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive/
- Cilium command reference for `cilium-agent hive dot-graph`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph/
- Cilium command reference for `cilium-dbg status --brief`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium command reference for `cilium-dbg troubleshoot kvstore`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_troubleshoot_kvstore/
- Cilium Key-Value Store reference: https://docs.cilium.io/en/stable/cmdref/kvstore/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium Kubernetes troubleshooting documentation: https://docs.cilium.io/en/stable/network/kubernetes/troubleshooting/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
1. **Incorrect description of `cilium-agent hive dot-graph` output**: The post described the command as getting the full agent configuration. The official Cilium command reference says it outputs the dependency graph in Graphviz DOT format. Updated the comment accordingly.

2. **Overstated missing-dependency diagnosis**: The post said missing dependencies usually mean a feature is enabled without a configured component. That can happen, but Hive dependency errors may also indicate a Cilium version/build wiring issue. Updated the sentence to avoid overdiagnosing.

3. **Incorrect BGP/KVStore example**: The post implied Cilium BGP fails when KVStore is not configured. Current Cilium BGP Control Plane documentation enables BGP with `bgpControlPlane.enabled` and does not describe KVStore as a BGP prerequisite. Replaced this with a kvstore-specific example based on the official KVStore options.

4. **Incomplete Hubble fix**: The post suggested only patching `enable-hubble` in the ConfigMap. Official Cilium documentation recommends `cilium hubble enable`, which also handles Relay deployment and certificate setup. Updated the command to use the Cilium CLI.

5. **Case-sensitive Start hook log searches**: Cilium logs use `Start hook failed` with capitalized text. The original grep commands were case-sensitive and could miss real failures. Updated them to use case-insensitive matching.

6. **Less appropriate kvstore connectivity command**: The post used `cilium-dbg kvstore get --recursive /` for connectivity checking. Cilium documents `cilium-dbg troubleshoot kvstore` specifically for troubleshooting etcd kvstore connectivity, so the example was changed to that command.

7. **Non-portable error/fail grep**: The final verification pipeline used basic grep with escaped alternation. Changed it to `grep -iE "error|fail"` for clarity and portability.

## Review Notes
The remaining commands are general troubleshooting examples and depend on cluster installation method, Cilium version, and whether the deployment is Helm-managed. For production changes, prefer applying persistent Cilium configuration through the installation method used for the cluster, such as Helm values or the Cilium CLI, instead of one-off ConfigMap patches.
