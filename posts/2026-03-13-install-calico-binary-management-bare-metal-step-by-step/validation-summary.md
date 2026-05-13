# Validation Summary: How to Install Calico with Binary Management on Bare Metal Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes CNI
- Bare metal Kubernetes networking
- Ansible
- kubectl

## Sources Consulted
- Calico documentation: Install Calico networking and network policy for on-premises deployments: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: Kubernetes system requirements and CNI directories: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Binary install without package manager for non-cluster hosts: https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Project Calico v3.27.0 release page: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Project Calico v3.27.0 raw Kubernetes manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Project Calico v3.27.0 CRD manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml

## Issues Found
- The original playbook downloaded `calico-node-amd64`, `calico-cni-amd64`, and `calico-ipam-amd64` from the GitHub release as direct assets. Those URLs return 404 for v3.27.0; the release provides a release bundle and manifests instead. Replaced the broken binary download workflow with an Ansible-managed application of the official `calico.yaml` manifest.
- The original post described Kubernetes Calico as a native systemd service with no container runtime dependency. Official Kubernetes installs use the Tigera Operator or Kubernetes manifests that deploy `calico/node`, `calico/cni`, and `calico/kube-controllers` as Kubernetes resources. Updated the explanation and conclusion accordingly.
- The original playbook referenced `calico-cni.conflist.j2` and `calico-node.service.j2` without providing technically valid templates. Removed those unsupported template steps and used the upstream manifest, which includes the required CRDs, RBAC, CNI install init containers, DaemonSet, and kube-controllers Deployment.
- The original Step 4 separately applied `crds.yaml` after installing node services. The official `calico.yaml` manifest already includes CRDs for this raw-manifest install path, so Step 4 was changed to optional additional Calico resource application.
- The original verification checked `systemctl is-active calico-node`, which does not apply to the official Kubernetes manifest install. Replaced it with `kubectl` checks for the Calico DaemonSet pods, nodes, and IPPool resources.

## Review Notes
Calico v3.27.0 is an older release. The latest Calico documentation recommends the Tigera Operator for new on-premises Kubernetes installations, while raw manifests remain available for installations that require direct manifest customization.
