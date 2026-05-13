# Validation Summary: How to Migrate Existing Workloads to Calico with Binary Management on Bare Metal

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes CNI
- Flannel
- Ansible
- systemd
- Bare metal Linux networking

## Sources Consulted
- Calico documentation: Calico the hard way overview: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico documentation: Install CNI plugin: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Configure the Calico CNI plugins: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: Install calico/node: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Project Calico GitHub release v3.27.0 assets: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Kubernetes documentation: kubectl drain: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: kubectl wait: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Ansible documentation: ansible.builtin.systemd_service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: ansible.builtin.unarchive module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The post described installing `calico-node` as a direct binary from `https://github.com/projectcalico/calico/releases/download/v3.27.0/calico-node-amd64`, but that asset does not exist in the official v3.27.0 release. The post now states that `calico/node` should be deployed through the official Calico manifests or operator, while the binary-managed part applies to the CNI plugins.
- The CNI plugin download URLs used non-existent direct release assets (`calico-cni-amd64` and `calico-ipam-amd64`) under the main Calico release. The playbook now downloads the official `release-v3.27.0.tgz` archive and copies the `bin/cni/amd64/calico` and `bin/cni/amd64/calico-ipam` binaries from that archive.
- The migration playbook cordoned nodes but did not drain existing workloads before replacing CNI configuration. The playbook now runs `kubectl drain` with `--ignore-daemonsets` and `--delete-emptydir-data`, matching Kubernetes maintenance guidance.
- The playbook attempted to create and manage a `calico-node` systemd service without showing a technically valid service definition. That task was replaced with a kubelet restart after writing the new CNI configuration, leaving `calico/node` deployment to the official Calico resources.

## Review Notes
The post still assumes the omitted `calico-cni.conflist.j2` template is correct for the target cluster, including Kubernetes API access and the intended IPAM settings. Future improvements should include the template and a clearer rollback example, because live CNI migration details vary by cluster topology, Flannel configuration, Calico encapsulation mode, and pod disruption budgets.
