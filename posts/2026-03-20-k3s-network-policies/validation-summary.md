# Validation Summary: How to Set Up Network Policies in K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Kubernetes `NetworkPolicy`
- `kubectl`
- Flannel
- Canal / Calico
- Cilium

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI: https://docs.k3s.io/cli/server
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico / Canal install guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel

## Issues Found
- The introduction and setup section incorrectly said K3s's default Flannel setup did not support Network Policies and told readers to switch to Canal. K3s documentation says K3s includes an embedded network policy controller by default, so Step 1 was corrected to show that a standard K3s install supports standard Kubernetes `NetworkPolicy` resources, while custom CNIs should be installed with `--flannel-backend=none --disable-network-policy` to avoid conflicts.
- The explanation of NetworkPolicy behavior was too broad. Kubernetes documents ingress and egress isolation separately, so the wording was corrected to reflect that isolation is directional.
- The DNS example comment said it allowed traffic to CoreDNS in `kube-system`, but the policy only constrained egress by port and not by destination. The comment was corrected to match what the policy actually allows.
- Step 4 allowed backend ingress and database ingress but omitted the matching frontend and backend egress rules, even though Step 2 had already applied a namespace-wide default-deny egress policy. Matching egress policies were added so the examples work under the documented default-deny setup.
- The complete three-tier example in Step 8 was missing a database ingress policy, which meant backend-to-database traffic would still be denied. A database ingress policy was added, and the per-workload DNS examples were updated to allow both UDP and TCP on port 53.
- The testing section used labels and ports that did not match the documented policies, did not wait for pods to become ready, and attempted to delete a non-existent `blocked` pod from the `production` namespace. The commands were updated so the test scenario matches the example policies and the cleanup commands are correct.

## Review Notes
- The workspace did not have `kubectl` installed, so command validation was performed against the current Kubernetes command reference instead of local `kubectl --help` output.
- The ingress example still uses an `ingress-nginx` namespace selector as an example. That is valid if you run `ingress-nginx`; default K3s installations typically ship with Traefik instead.
