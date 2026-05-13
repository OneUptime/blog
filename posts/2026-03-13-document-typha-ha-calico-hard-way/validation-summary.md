# Validation Summary: Documenting Typha High Availability in Calico the Hard Way

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Typha
- Felix
- Kubernetes
- PodDisruptionBudget
- Pod topology spread constraints
- Topology-aware routing
- Prometheus metrics
- TLS/mTLS certificates
- kubectl
- calicoctl

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Felix-to-Typha TLS guidance: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico Typha scaling guidance for manifest installs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes topology-aware routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The architecture text claimed Typha holds one watch connection per resource type. Calico documents Typha as maintaining datastore watches, caching and deduplicating state, and fanning updates out to clients, so the wording was corrected to avoid an overly specific implementation claim.
- The topology-aware routing text stated that Felix agents prefer same-zone Typha endpoints and that topology routing reduces cross-zone traffic by two thirds on average. Kubernetes documents topology-aware routing as conditional on EndpointSlice hints and fallback safeguards, so the text now says same-zone preference may occur when hints are usable and should be validated.
- The TLS inventory used `typhaServerCN`, which is not the Felix configuration parameter name. It was corrected to `FELIX_TYPHACN`.
- The certificate expiry guidance used a fixed 825-day lifetime. Calico does not require that lifetime, so it now instructs operators to record the actual certificate `NotAfter` date.
- The runbook used a minimum of 2 Typha replicas. Calico recommends at least one Typha replica per 200 nodes, no more than 20, and a production minimum of 3, so the rule and calculation were updated.
- The HA decision log implied a PodDisruptionBudget protects against zone failures and said two remaining replicas would exceed `minAvailable=2`. Kubernetes documents PDBs as protecting voluntary evictions only, so the rationale now separates zone failure behavior from PDB behavior.
- The PDB decision heading compared `minAvailable=2` with `maxUnavailable=1` while the rationale discussed avoiding percentages. The heading was corrected to match the rationale.

## Review Notes
The command examples are syntactically valid for current `kubectl` and `calicoctl` usage. Topology-aware routing remains cluster-version and topology dependent; future posts that include the actual Service manifest should show the relevant Service annotation or `trafficDistribution` field and an EndpointSlice verification command.
