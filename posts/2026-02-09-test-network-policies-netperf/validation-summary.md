# Validation Summary: How to Test Kubernetes Network Policies Using Netperf

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Deployments, Services, and Namespaces
- kubectl
- netperf and netserver
- Calico CNI
- kind
- GitHub Actions
- kubectl-np-viewer

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- Calico Open Source installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- cilium/netperf Docker Hub page: https://hub.docker.com/r/cilium/netperf
- kubectl-np-viewer README: https://github.com/runoncloud/kubectl-np-viewer
- helm/kind-action GitHub Marketplace listing: https://github.com/marketplace/actions/kind-cluster

## Issues Found
- The post described Kubernetes NetworkPolicy as layer 4 only. Updated the explanation to state that NetworkPolicy primarily enforces layer 3 and layer 4 traffic using pod, namespace, IP block, port, and protocol matches.
- The client Deployment used the `test-client` namespace without creating it. Added a Namespace manifest before the Deployment.
- The sample policies claimed all tiers could access DNS, but only frontend and backend policies were present. Added a database policy and TCP/53 DNS rules alongside UDP/53 so the stated tier model is accurate.
- The connectivity matrix had reversed and inconsistent selector semantics, tested all connections on port 80, and included a target label that the sample policies did not define. Updated the matrix to use explicit source selectors, target selectors, and ports that match the policies.
- The connectivity test depended on netcat output containing `succeeded`, which is not portable across netcat implementations. Changed it to use the command exit status.
- The benchmark parsed the `MIGRATED` banner line and extracted the wrong field for throughput. Changed netperf to emit key-value output with `-k THROUGHPUT,THROUGHPUT_UNITS` and parse `THROUGHPUT=`.
- The benchmark deleted NetworkPolicies only in the current namespace and did not state that applied policies must select the measured path. Updated the delete command to include all namespaces and added a note about policy scope.
- The GitHub Actions example used an older checkout action and installed Calico over kind's default CNI. Updated checkout to v4, disabled kind's default CNI, aligned the pod CIDR with Calico's default custom resources, updated Calico manifests to the current documented version, and added a Calico readiness wait.
- The network policy viewer install command referenced a raw `deploy.yaml` URL that returns 404. Replaced it with the documented `kubectl krew install np-viewer` and `kubectl np-viewer` commands.

## Review Notes
The examples are now syntactically valid and aligned with current Kubernetes NetworkPolicy semantics. The performance threshold of 5% remains an example value; real acceptance criteria should be calibrated per cluster, CNI, workload, and benchmark environment.
