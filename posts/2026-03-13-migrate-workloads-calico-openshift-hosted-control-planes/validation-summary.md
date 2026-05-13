# Validation Summary: How to Migrate Existing Workloads to Calico on OpenShift Hosted Control Planes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- OpenShift Hosted Control Planes
- HyperShift
- OVN-Kubernetes
- Kubernetes NetworkPolicy
- kubectl and oc CLI workflows

## Sources Consulted
- Calico documentation: Install Calico on an OpenShift HCP cluster: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: Install an OpenShift 4 cluster with Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- HyperShift documentation: Other SDN providers: https://hypershift.pages.dev/how-to/agent/other-sdn-providers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The original post described an in-place CNI replacement by deleting OVN-Kubernetes daemonsets from an existing hosted cluster. This was replaced with a supported cluster-to-cluster workload migration flow: create a destination hosted cluster with `--network-type Other`, install Calico there, restore workloads, and cut traffic over.
- The original Calico installation URLs referenced old raw manifest paths for Calico v3.27.0. These were replaced with the current documented Calico v3.32.0 OpenShift HCP `ocp.tgz` workflow and ordered `oc apply` sequence.
- The original post implied `kubectl get all -A -o yaml` could be used as the workload restore source. This was clarified as an inventory backup only, because `kubectl get all` is not a complete export of all Kubernetes resources and includes generated fields.
- The original node cordon, uncordon, and pod deletion workflow was removed because it was part of the unsupported in-place CNI replacement approach. Workloads are now restored onto the destination hosted cluster and verified there.
- The prerequisites were updated to include `oc`, `hypershift`, `curl`, and the required source, destination, and management cluster kubeconfigs.

## Review Notes
The guide now uses the Calico HCP installation path documented for OpenShift Hosted Control Planes. Cloud-provider-specific hosted cluster creation flags may still need adjustment for non-AWS environments.
