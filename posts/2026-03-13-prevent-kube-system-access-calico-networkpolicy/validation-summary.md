# Validation Summary: How to Prevent kube-system Access Problems with Calico NetworkPolicy

## Status
validated

## Post Type
Guide / Prevention playbook

## Technologies Covered
- Calico (CNI / NetworkPolicy enforcement)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- kubectl
- CoreDNS (port 53 / kube-system)
- kube-apiserver (kubeadm static pods)
- OPA / Gatekeeper Constraints
- Bash scripting
- Helm / Kustomize / Flux / ArgoCD (mentioned)
- Mermaid (diagram)

## Sources Consulted
- Kubernetes NetworkPolicy reference — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- KEP-2161 (Automatic labelling of namespaces, GA in 1.22) — https://github.com/kubernetes/enhancements/tree/master/keps/sig-api-machinery/2161-apiserver-default-labels
- kubeadm static pod construction (`ComponentPod`, namespace `kube-system`, label `component: <container-name>`) — kubernetes/kubernetes `cmd/kubeadm/app/util/staticpod/utils.go` and `cmd/kubeadm/app/constants/constants.go` (`KubeAPIServer = "kube-apiserver"`)
- Calico NetworkPolicy compatibility with upstream `networking.k8s.io/v1` — https://docs.tigera.io/calico/latest/network-policy/
- OPA Gatekeeper Constraint vs ConstraintTemplate API groups (`constraints.gatekeeper.sh` for Constraint instances) — https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- kubectl `run`, `--rm`, `--restart=Never`, `nslookup kubernetes.default` — kubectl reference

## Issues Found
1. **Wrong namespace selector for the kube-apiserver egress rule.** The original YAML targeted `kubernetes.io/metadata.name: default`, but in a kubeadm-installed cluster the `kube-apiserver` static pod runs in `kube-system` (kubeadm hardcodes `Namespace: metav1.NamespaceSystem` in `ComponentPod`). Changed the selector to `kube-system`.
2. **Wrong `component` label value.** The original YAML used `component: apiserver`. kubeadm sets `component` to the container name, which is the constant `kube-apiserver`. Updated to `component: kube-apiserver`.
3. **OR vs AND semantics in the `to` block.** The two peer entries (`- namespaceSelector` and `- podSelector`) were sibling array items, which `NetworkPolicy` interprets as a logical OR — that is "any pod in default namespace, OR any pod with this label in any namespace" — instead of the intended AND. Combined them into a single peer (one `-` with both `namespaceSelector` and `podSelector` keys), which is the documented AND form.
4. **Comment/YAML mismatch in the Gatekeeper example.** The comment said "ConstraintTemplate" but the YAML uses `apiVersion: constraints.gatekeeper.sh/v1beta1`, which is the Constraint API group, not the ConstraintTemplate one (`templates.gatekeeper.sh`). Changed the comment to "Constraint example".

## Review Notes
- The `kubernetes.io/metadata.name` label is automatically applied on every namespace since Kubernetes 1.22 (GA), so it is a safe canonical selector as the post recommends.
- Caveat that is technically correct but worth knowing: kubeadm's `kube-apiserver` static pod runs with `hostNetwork: true`. Calico's standard upstream-Kubernetes NetworkPolicy implementation matches by pod IP, so a `podSelector`-based egress rule will often not match the apiserver's host-IP traffic. In practice many operators reach the API via the `kubernetes` Service ClusterIP or via an `ipBlock` covering control-plane node IPs. The example as written is a reasonable illustration of selector syntax, but in a real cluster you may need to substitute or supplement it with an `ipBlock` rule for control-plane node CIDRs. Left as-is because reworking the policy approach is outside the scope of a technical correction.
- The OPA/Gatekeeper snippet is labelled "(simplified)" and only shows the Constraint match block, not its rego logic; that is acceptable as an illustrative pointer.
- The diagnostic `grep -c "port: 53"` is a coarse heuristic (it will also match egress rules that allow port 53 outbound rather than specifically to kube-system DNS), but the author qualifies the script as an audit aid — left as-is.
