# Validation Summary: Securing Against Cilium Security Policy Limitations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- DNS-based network policy
- Cilium CLI and cilium-dbg

## Sources Consulted
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium policy language and DNS-based policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium DNS-based policy guide: https://docs.cilium.io/en/stable/security/dns.html
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- cilium-health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html

## Issues Found
- The proxy status example used `cilium status --verbose`, which is the standalone Kubernetes Cilium CLI. Changed it to execute `cilium-dbg status --verbose` inside the Cilium DaemonSet because Cilium documents proxy details under the agent-local debug CLI.
- The DNS `toEndpoints` examples used unprefixed Kubernetes labels for matching kube-dns. Changed them to the documented Cilium label form, `k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app`.
- The endpoint policy verification example used `cilium endpoint list`, which is an agent-local debug command in current Cilium documentation. Changed it to use the `CiliumEndpoint` CRD through `kubectl get ciliumendpoints --all-namespaces -o json`.
- The monitor example used `--output json`, but `cilium-dbg monitor` documents JSON output as `--json`. Updated the command and ran it through `kubectl exec ds/cilium`.
- The policy listing example used `cilium policy get`, which is documented as a deprecated agent-local policy command. Changed it to list the Kubernetes policy CRDs with `kubectl get ciliumnetworkpolicies --all-namespaces` and `kubectl get ciliumclusterwidenetworkpolicies`.
- The endpoint health example omitted the required endpoint ID for `cilium-dbg endpoint health`. Changed it to `cilium-health status --verbose`, which is the documented command for cluster connectivity health checks.
- Troubleshooting commands for endpoint and identity inspection used old/local `cilium` command forms. Updated them to use `kubectl get ciliumendpoints` and `kubectl exec ... cilium-dbg identity list`.

## Review Notes
The remaining policy concepts are consistent with Cilium documentation: Cilium policies can put selected endpoints into default-deny mode per direction, L7 and DNS policy rely on proxying, `toFQDNs` rules depend on DNS responses observed by Cilium, and Cilium honors DNS TTLs by default. The examples assume the Cilium DaemonSet is named `cilium`, runs in `kube-system`, and uses the `cilium-agent` container name, which matches common Helm installs but may vary in custom deployments.
