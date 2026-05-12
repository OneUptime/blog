# Validation Summary: How to Prevent Kubernetes API Access Problems with Calico Egress Policy

## Status
validated

## Post Type
Guide / Tutorial (prevention-focused operations playbook)

## Technologies Covered
- Calico (GlobalNetworkPolicy, projectcalico.org/v3 API)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- kubectl
- calicoctl
- curl / curlimages/curl container image
- Bash shell scripting
- Mermaid diagrams

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy rule semantics (order, selector, action/protocol/destination): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- Kubernetes NetworkPolicy concepts (ipBlock, podSelector, namespaceSelector, kubernetes.io/metadata.name): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubeadm default service CIDR (10.96.0.0/12) and kubernetes Service ClusterIP (10.96.0.1): https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- kubectl run command reference and flags (--pod-running-timeout, --rm, --restart): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- curlimages/curl image (Alpine-based, includes sh): https://hub.docker.com/r/curlimages/curl

## Issues Found

1. **Validation script: command substitution evaluated on local host, not in the test pod.**
   - The original script invoked `kubectl run ... -- curl ... --header "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"`. Because `$(...)` inside double quotes is expanded by the caller's shell before kubectl is invoked, the script would attempt to read the token from the operator's workstation (where the file does not exist) instead of from inside the freshly-created pod. The resulting `Authorization: Bearer` header would be empty, making the API call always fail and rendering the whole validation step meaningless.
   - Fix: wrapped the in-pod command in `sh -c '...'` with single quotes so the substitution is deferred and evaluated inside the curlimages/curl container (which is Alpine-based and has `sh`).

2. **Invalid `--timeout=30s` flag on `kubectl run`.**
   - `kubectl run` does not accept `--timeout`; that flag belongs to commands like `kubectl wait`, `kubectl rollout`, and `kubectl delete`. On `kubectl run` the equivalent is `--pod-running-timeout` (a duration bounding how long kubectl waits for the pod to reach Running). The script as written would error out with "unknown flag: --timeout" on any modern kubectl.
   - Fix: replaced `--timeout=30s` with `--pod-running-timeout=30s`.

## Review Notes
- The Calico GlobalNetworkPolicy in Prevention 1 is syntactically correct (`projectcalico.org/v3`, `selector: all()`, `types: [Egress]`, `order` semantics where lower = higher priority, `destination.ports` + `destination.nets`). Readers should remember that Calico evaluates policies in ascending `order`; the chosen value of `10` is fine but is only "highest priority" relative to other policies the cluster operator deploys — if another policy uses an order < 10 it will win.
- The native Kubernetes NetworkPolicy in Prevention 2 uses `ipBlock: 10.96.0.1/32` to allow traffic to the `kubernetes` Service ClusterIP. This is a widely cited pattern, but readers should be aware of a long-standing caveat documented by the Kubernetes project: with most CNIs, kube-proxy DNATs the Service ClusterIP to a real endpoint (control-plane node IP) *before* NetworkPolicy is evaluated, so an `ipBlock` matching the ClusterIP may not match traffic in some plugin/configuration combinations. In a Calico-managed cluster this works in practice because Calico evaluates the original pre-DNAT destination. The post is targeted at Calico users, so the pattern is appropriate.
- The default kubeadm service CIDR `10.96.0.0/12` and Service IP `10.96.0.1` are correct for stock kubeadm clusters, and the post explicitly tells readers to adjust to their own cluster.
- Allowing both 443 and 6443 in the GlobalNetworkPolicy is reasonable since the API is reachable via the Service ClusterIP on 443 and directly on the control-plane node IPs on 6443; the post's choice covers both paths.
- The `kubernetes.io/metadata.name` namespace label used to select `kube-system` is automatically applied by kube-apiserver since Kubernetes 1.22 (GA in 1.22), so this selector is portable across all supported versions at the time of writing.
- Style nit (not changed, per scope): the `curl -k` flag disables TLS verification against the API server. For a validation script this is pragmatic, but readers running this in security-sensitive environments may want to mount and trust the CA at `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` instead.
