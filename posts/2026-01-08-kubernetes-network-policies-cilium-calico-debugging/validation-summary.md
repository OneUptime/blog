# Validation Summary: How to Debug Network Policy Issues with Cilium or Calico

## Status
validated

## Post Type
Tutorial / Guide (hands-on debugging walkthrough)

## Technologies Covered
- Kubernetes Network Policies (`networking.k8s.io/v1`)
- Cilium CNI and Cilium CLI
- Hubble (flow observability)
- Calico CNI and `calicoctl`
- Calico Felix / FelixConfiguration
- kubectl
- netshoot diagnostic container

## Sources Consulted
- Cilium `policy trace` command reference — https://docs.cilium.io/en/v1.9/cmdref/cilium_policy_trace/
- Cilium troubleshooting docs (stable) — https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium drop reason codes (verified `133` = "Policy denied") via cilium/cilium GitHub issues and Hubble docs
- Calico Felix configuration reference — https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Enterprise/Cloud Felix configuration reference — https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- projectcalico/calico releases (verified `v3.27.0` calicoctl asset path)

## Issues Found
1. **Invalid `--protocol` flag on `cilium policy trace`** (Cilium Policy Tracing section).
   The command used `--dport 80 --protocol TCP`. The `cilium policy trace` command has no `--protocol` flag; the protocol is specified inside the `--dport` argument using the `port/protocol` format (e.g. `80/tcp`, `53`, `23/udp`).
   **Fix:** Removed the `--protocol TCP` line and changed `--dport 80` to `--dport 80/tcp`.

2. **Calico file-based flow log settings presented as open-source Calico** (Enabling Calico Flow Logs section).
   The `FelixConfiguration` example uses `flowLogsFileEnabled`, `flowLogsFileInclude*`, `flowLogsFlushInterval`, and `flowLogsEnableNetworkSets`. These file-based flow log fields are **Calico Enterprise / Calico Cloud** features and are not part of open-source (project) Calico's FelixConfiguration. Applying them to an open-source cluster via `calicoctl apply` has no effect / is not supported. Open-source Calico (v3.30+) exposes flows through the Goldmane and Whisker components instead.
   **Fix:** Added a clear note above the YAML stating these settings require Calico Enterprise/Cloud and pointing open-source users to Goldmane/Whisker.

3. **Misleading comment on `flowLogsEnableNetworkSets`** (same section).
   The original comment `# For denied flows` is incorrect — this field controls whether NetworkSet metadata is included in flow logs, not denied-flow logging (denied flows are captured via the per-flow action regardless).
   **Fix:** Changed the comment to "Include NetworkSet metadata in flow logs".

## Review Notes
- Verified correct: Cilium CLI install snippet, `cilium hubble enable --ui`, `cilium hubble port-forward`, `hubble observe` filters (`--namespace`, `--pod`, `--verdict DROPPED`, `--protocol`, `--port`), `drop_reason: 133` = "Policy denied", endpoint inspection commands, `kubectl get ciliumnetworkpolicies/ciliumclusterwidenetworkpolicies`.
- Verified correct: `calicoctl` v3.27.0 download URL, datastore env vars (`CALICO_DATASTORE_TYPE`, `CALICO_KUBECONFIG`), `calicoctl get networkpolicy/globalnetworkpolicy/workloadendpoint/ippool`, `calicoctl node status`.
- Verified correct: all Kubernetes `NetworkPolicy` manifests (ingress/egress/cross-namespace/default-deny) are syntactically valid; the OR-vs-AND `from`/`to` selector explanation is accurate.
- The in-agent Cilium CLI (e.g. `cilium endpoint list`, `cilium policy trace`) was renamed to `cilium-dbg` in newer Cilium agent images (1.16+); `cilium` still works as a symlink/alias in current releases, so the examples remain functional. Worth noting if the post is revisited for very recent Cilium versions.
- Calico's `calico-system` namespace assumes a Tigera-operator install; clusters using the manifest install place pods in `kube-system`. The post's commands target `calico-system`, which is the modern default — acceptable as-is.
