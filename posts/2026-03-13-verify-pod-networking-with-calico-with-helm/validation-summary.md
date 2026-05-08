# Validation Summary: How to Verify Pod Networking with Calico with Helm

## Status
validated

## Post Type
Tutorial / Verification guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Helm
- kubectl
- calicoctl
- Kubernetes Services and pod networking

## Sources Consulted
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico installation API reference, including TigeraStatus and APIServer resources: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview and calicoctl reference: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses and https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Helm status and list command references: https://helm.sh/docs/helm/helm_status/ and https://helm.sh/docs/helm/helm_list/
- Kubernetes kubectl run, expose, and exec references: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/, and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The TigeraStatus verification omitted the `DEGRADED` condition shown by the operator status resource. Updated the expected status to include `DEGRADED: False`.
- The `calicoctl node status` command was presented without its execution context. Calico documents node commands as requiring direct execution on a compute host running the Calico node instance, so the command block now clarifies where to run it.

## Review Notes
The remaining commands and claims were consistent with current official Calico, Kubernetes, Helm, and calicoctl documentation. Operator-based Calico installations include Typha, and new operator-based installations include the Calico API server by default in current supported Calico versions.
