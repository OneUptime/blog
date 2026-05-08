# Validation Summary: How to Understand Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Typha
- Kubernetes API datastore
- Felix
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- kubectl
- etcd
- TLS/mTLS

## Sources Consulted
- Calico Open Source documentation: Typha overview - https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Open Source documentation: Calico the hard way overview - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico Open Source documentation: Install Typha - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: On-premises Calico installation options - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source documentation: Schedule Typha for scaling to well-known nodes - https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described Typha as a single proxy that maintains one API server watch connection. Updated this to say that each Typha replica maintains its own datastore watch connection, which matches the Calico architecture and the post's own multi-replica examples.
- The post said operator-based installations deploy Typha only after the cluster grows beyond a threshold. Current Calico documentation says operator installations always include Typha, with one or more instances depending on cluster scale. Updated the wording.
- The post called "Calico the Hard Way" a manual binary-based install. Current Calico hard-way documentation uses manifests. Updated the wording to "manifest-based."
- The post stated that Typha sends only the final state when a policy is updated multiple times rapidly. Official documentation describes caching datastore state and deduplicating events, so the wording was narrowed to that documented behavior.
- The post framed the 50-node recommendation too broadly. Updated it to apply specifically to Kubernetes API datastore manifest-style installs and noted that operator installs include Typha automatically.
- The post said etcd-based deployments were "OpenStack mode" and implied Typha should watch etcd there. Updated this to reflect Calico documentation: Typha can be used with etcd, but etcd v3 already handles many clients and Typha is generally redundant and not recommended.
- The datastore verification command used the `calico-system` namespace, but the Calico hard-way Typha deployment is installed in `kube-system`. Replaced the log grep with a command that checks the configured `TYPHA_DATASTORETYPE` in the hard-way Typha deployment manifest.

## Review Notes
The `kubectl get nodes --no-headers | wc -l` command is valid for a quick node count. `kubectl` was not installed in the local review environment, so CLI syntax was checked against Kubernetes documentation rather than local `kubectl --help` output.
