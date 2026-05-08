# Validation Summary: How to Upgrade Calico on OpenShift Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Tigera Operator
- OpenShift
- Kubernetes
- CNI networking
- `oc` CLI
- `calicoctl`

## Sources Consulted
- Calico documentation: Upgrade Calico on OpenShift 4, https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install Calico on an OpenShift HCP cluster, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: Install an OpenShift 4 cluster with Calico, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico GitHub release assets for v3.27.0, https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes documentation: kubectl rollout, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The Tigera Operator upgrade command used `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml`, but that raw URL does not exist for the v3.27.0 release. The current Calico OpenShift upgrade documentation uses `tigera-operator-ocp-upgrade.yaml` with server-side apply and forced conflict handling, so the command was updated to the documented OpenShift upgrade manifest for v3.32.0.
- The OpenShift system namespace monitoring command repeated `-n` three times in one `oc get pods` invocation. Kubernetes namespace selection accepts one namespace for namespaced resources, so that command would not monitor all three namespaces as intended. It was changed to run the three namespace checks inside one `watch` invocation.

## Review Notes
- The guide assumes Calico is operator-managed on OpenShift. That matches the stated prerequisites and the documented OpenShift upgrade path.
- For clusters upgrading from versions before Calico v3.28, the official OpenShift upgrade documentation calls out an OwnerReferences caveat for resources in the `projectcalico.org/v3` API group. The post does not cover that edge case, but the omission does not make the provided commands incorrect for the stated general procedure.
