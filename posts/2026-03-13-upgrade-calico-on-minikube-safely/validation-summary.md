# Validation Summary: How to Upgrade Calico on Minikube Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Minikube
- kubectl
- calicoctl
- Kubernetes CNI networking

## Sources Consulted
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico minikube quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#status
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Project Calico v3.27.0 manifest URL: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

## Issues Found
- The post said Calico supports upgrading one minor version at a time for major version upgrades. Current Calico Open Source Kubernetes upgrade documentation describes supported upgrades by installation method and version range rather than that rule, so the wording was replaced with guidance to follow the official upgrade documentation and release notes.
- The manifest upgrade command used plain `kubectl apply -f` directly against the remote URL. Calico's manifest-based upgrade documentation recommends downloading the matching manifest, carrying over manual manifest changes, and applying it with `kubectl apply --server-side --force-conflicts`, so the command was updated.
- The backup commands omitted Calico `GlobalNetworkPolicy` resources. A `calicoctl get globalnetworkpolicy -o yaml` backup command was added because global policies are separate from namespaced `NetworkPolicy` resources.
- The connectivity test passed `ping` as container arguments without explicitly setting it as the command. The command was updated to use `--command -- ping ...`, matching kubectl's documented form for running a different command.
- The calicoctl install command wrote to `/usr/local/bin` without elevated privileges, which commonly fails for non-root users. The `curl` and `chmod` commands were updated to use `sudo`.

## Review Notes
- The guide assumes a manifest-based Calico install in the `kube-system` namespace, which matches the Calico manifest/minikube path. Operator-based installs use different upgrade commands and commonly use `calico-system`.
- `calicoctl node status` is useful for BGP status, but on a single-node Minikube cluster there may be no BGP peers to report.
