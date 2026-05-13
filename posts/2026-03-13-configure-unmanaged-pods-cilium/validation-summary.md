# Validation Summary: Configure Unmanaged Pods with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEndpoint CRDs
- Kubernetes CNI networking
- Cilium network policy enforcement
- kubectl

## Sources Consulted
- Cilium troubleshooting documentation, "Ensure pod is managed by Cilium": https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post stated that unmanaged pods might be denied all traffic depending on policy configuration. Cilium documentation says pods whose networking is not managed by Cilium are not covered by Cilium security policy enforcement. Updated the explanation to reflect that unmanaged pods are not policy-enforced by Cilium.
- The post used `cilium endpoint list` as the primary cluster-wide endpoint inventory command. Current Cilium documentation describes CiliumEndpoint CRDs as the Kubernetes-wide endpoint view and `cilium-dbg endpoint list` as an agent-local debugging command. Updated the examples to use `kubectl get ciliumendpoints --all-namespaces`.
- The post compared pod names using only pod names, which can be ambiguous across namespaces. Updated comparisons to use `namespace/name` pairs and `comm` against sorted lists.
- The ConfigMap example used `policy-enforcement`, which is not the current Cilium agent configuration key. Cilium documents the Helm value as `policyEnforcementMode` and the configuration flag/ConfigMap key as `enable-policy`. Updated the configuration command to patch `enable-policy`.
- The ConfigMap example included `endpoint-status`, which was removed in Cilium 1.16, and `endpoint-gc-interval`, which is not the relevant Cilium agent key for unmanaged pod handling. Removed both keys.
- The post instructed users to apply a partial `cilium-config` ConfigMap manifest, which can overwrite existing Cilium settings. Replaced it with a merge patch against the existing ConfigMap followed by a Cilium DaemonSet restart.
- The validation count treated every CiliumEndpoint as a pod endpoint, but Cilium may also create `cilium-health-<node-name>` endpoints. Updated the count to intersect Kubernetes pod names with CiliumEndpoint names.
- The post used `cilium status --all-health`, but `--all-health` is documented for `cilium-dbg status`, not the top-level Cilium CLI `status` command. Updated the command to `cilium status`.
- The final `kubectl exec` example omitted the namespace for the placeholder pod. Added `-n <namespace>`.
- Best-practice references to `policy-enforcement` were updated to `enable-policy`.

## Review Notes
The corrected guide is technically valid for current Cilium documentation. For production migrations, using Helm or `cilium config set` is often preferable to directly patching `cilium-config`, but the patch command shown is valid and avoids replacing unrelated ConfigMap data.
