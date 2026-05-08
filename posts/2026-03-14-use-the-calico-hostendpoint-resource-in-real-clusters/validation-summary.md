# Validation Summary: Using the Calico HostEndpoint Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico HostEndpoint
- Calico KubeControllersConfiguration
- Calico FelixConfiguration and health endpoints
- Calico Typha
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico Kubernetes node protection and automatic HostEndpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico KubeControllersConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl auth can-i documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post suggested checking effective HostEndpoint configuration on a Kubernetes Node object with `kubectl get node ... | grep projectcalico`. HostEndpoint resources are separate Calico resources, so this was changed to inspect HostEndpoints with `calicoctl get hostendpoint -o wide | grep <node-name>`.
- The post said to use node labels in a HostEndpoint manifest's node selectors. HostEndpoint does not have a `nodeSelector` field; `nodeSelector` is part of automatic HostEndpoint templates in `KubeControllersConfiguration`. The wording was corrected to distinguish template selectors from HostEndpoint metadata labels used by policy selectors.
- The scale guidance recommended increasing reconciliation intervals without naming the resource or tradeoff. This was corrected to refer specifically to `KubeControllersConfiguration` `reconcilerPeriod` and to note that increasing it delays drift correction.
- The Felix health check examples used `<node-ip>:9099`, but Felix `HealthHost` defaults to `localhost`. The commands were changed to `127.0.0.1:9099` and the text now says to run them from the node or calico-node network namespace.
- The RBAC example combined `kubectl auth can-i` action checking with `--list`, which is a separate mode. The command was corrected to `kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org`.

## Review Notes
The guide is technically relevant and the remaining commands are broadly valid for Calico clusters, but several examples depend on installation mode and resource API exposure. In clusters using the Calico API server or native `projectcalico.org/v3` CRDs, equivalent `kubectl` resource names may differ from legacy `crd.projectcalico.org` CRD names.
