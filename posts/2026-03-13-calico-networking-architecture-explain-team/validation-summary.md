# Validation Summary: How to Explain Calico Networking Architecture to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Container Network Interface (CNI)
- Calico Felix
- BIRD and BGP routing
- confd
- Typha
- iptables and eBPF dataplanes
- kubectl

## Sources Consulted
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico BGP peering configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calico/node configuration: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The component table described BIRD as advertising pod routes to the outside world. Calico documents BIRD as distributing routes to BGP peers, which may be other Calico nodes, route reflectors, or external network infrastructure. Updated the wording to "BGP peers when BGP routing is enabled."
- The component table said confd keeps BIRD configuration in sync with policy data. Calico documents confd as monitoring BGP configuration and related defaults, then rendering BIRD configuration files. Updated the wording to "BGP configuration data."
- The Typha description said it fans out changes from one API server to all Felix instances. Calico documents Typha as sitting between the datastore and clients such as Felix and confd, caching and deduplicating events. Updated the wording to "datastore updates to Felix and confd instances."
- The configuration flow implied a fixed Kubernetes API to Typha to Felix path and said the delay is typically sub-second. Reworded it to describe datastore watch delivery, Typha fanout when Typha is in use, and Felix reconciliation without asserting an unsupported fixed latency.
- The failure mode section overstated Felix, BIRD, and Typha failures. Updated Felix to say programming stops being updated while existing kernel state persists; scoped BIRD failure to BGP deployments; and clarified that Typha failure matters when Felix cannot connect to any Typha instance.
- The log filtering command used a basic `grep` alternation form that is less portable. Updated it to `grep -Ei "error|warn"`.
- The BIRD diagnostic command used `kubectl exec -l`, but the official `kubectl exec` syntax accepts a pod or resource name, not a label selector. Replaced it with a two-step command that selects a `calico-node` pod using `kubectl get ... -o jsonpath` and then runs `kubectl exec` against that pod.

## Review Notes
The commands assume the `calico-system` namespace used by operator-based Calico installations. Calico documentation notes that manifest-based installations often use `kube-system`, so future revisions could mention both namespaces if the post becomes more command-focused.
