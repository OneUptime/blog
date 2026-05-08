# Validation Summary: How to Upgrade Calico on OpenShift Hosted Control Planes Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- OpenShift 4
- OpenShift Hosted Control Planes / HyperShift
- Kubernetes networking
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Upgrade Calico on OpenShift 4 — https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- Calico documentation: Upgrade Calico on Kubernetes — https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install Calico on an OpenShift HCP cluster — https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Kubernetes documentation: Communication between Nodes and the Control Plane — https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/
- Kubernetes kubectl reference: kubectl wait — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Red Hat OpenShift documentation: Hosted control planes — https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/hosted_control_planes/

## Issues Found
- The Tigera Operator upgrade command used `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml`, which currently returns 404 and does not match the official OpenShift upgrade procedure. Updated it to use the documented OpenShift upgrade manifest path, `manifests/tigera-operator-ocp-upgrade.yaml`, with `kubectl apply --server-side --force-conflicts`, pinned to current Calico v3.32.0.
- The API server connectivity check exec'd into a `calico-node` pod and assumed `curl` was available there. Replaced it with a temporary `curlimages/curl` pod that tests the API endpoint from the hosted cluster kubeconfig with `/readyz`.
- The post-upgrade pod connectivity test exec'd into the BusyBox pod immediately after creating it. Added `kubectl wait --for=condition=Ready pod/verify --timeout=60s` before running `kubectl exec`.

## Review Notes
- The guide is technically relevant and command-oriented, so it was reviewed as a technical guide.
- Local runtime validation against a live OpenShift Hosted Control Plane cluster was not possible in this workspace. Command syntax and upgrade behavior were verified against official Calico, Kubernetes, and Red Hat documentation, and the replacement raw GitHub manifest URL was checked for availability.
