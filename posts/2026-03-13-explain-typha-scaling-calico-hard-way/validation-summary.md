# Validation Summary: Explaining Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Typha
- Felix
- calicoctl
- Kubernetes API datastore
- Mutual TLS

## Sources Consulted
- Calico Open Source documentation: Typha overview - https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Open Source documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Install Typha the hard way - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Install calico/node the hard way - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Installing on on-premises deployments - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source documentation: Schedule Typha for scaling to well-known nodes - https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes

## Issues Found
- The post described Typha as holding "a single watch connection per resource type." Calico documents Typha as maintaining datastore connectivity and watches on behalf of clients, caching state, deduplicating events, and fanning updates out. Updated the wording to avoid over-specifying the internal watch count.
- The replica guidance did not match current Calico documentation. Updated it to reflect Typha for clusters over 50 nodes, at least one Typha replica per 200 nodes, no more than 20 replicas, and at least three replicas for production availability.
- The post referenced `TYPHA_ADDR` as a Felix configuration variable. Calico documents the Felix variables as `FELIX_TYPHAADDR`, `FELIX_TYPHAK8SSERVICENAME`, and `FELIX_TYPHAK8SNAMESPACE`. Updated the text accordingly.
- The Kubernetes command comment said `calico-system` while the hard way installation and command use `kube-system`. Corrected the comment.
- The `FelixConfiguration` example set `typhaAddr: ""` and said Felix auto-discovers through `TYPHA_K8S_SERVICE_NAME`. `typhaAddr` overrides service discovery, and the Felix service discovery setting is `typhaK8sServiceName` / `FELIX_TYPHAK8SSERVICENAME`. Removed `typhaAddr` and corrected the explanation.
- The best practice "Never run Typha on the same nodes as Felix-heavy workloads" was too absolute. Calico documents scheduling Typha to well-known nodes as a way to reduce which nodes expose the Typha listen port. Updated the wording to a conditional recommendation.

## Review Notes
The post is technically relevant and contains implementation details. The remaining guidance is intentionally high-level; a future deployment-focused post should include full Typha Deployment, Service, RBAC, certificate, and `calico-node` DaemonSet snippets if it intends to be directly runnable.
