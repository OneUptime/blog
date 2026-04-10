# Validation Summary: How to Automate Ceph Cluster Deployment with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Ansible (automation / configuration management)
- Kubernetes (container orchestration)
- kubectl CLI

## Sources Consulted
- Rook GitHub repository file structure: https://github.com/rook/rook/tree/master/deploy/examples
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ansible `community.general.modprobe` module docs: https://docs.ansible.com/ansible/latest/collections/community/general/modprobe_module.html
- Ansible `ansible.builtin.package` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.git` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ceph container images documentation: https://docs.ceph.com/en/latest/install/containers/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found

1. **Playbook `hosts` targeting error (deploy.yml)**: The main deployment playbook used `hosts: localhost` for all roles including `k8s-prereqs`. The prerequisites role runs `modprobe` and `package` tasks that must execute on the actual Ceph storage nodes, not the Ansible controller. Fixed by splitting into two plays: one targeting `ceph_nodes` with `become: true` for the prerequisites role, and one targeting `localhost` for the kubectl-based roles (rook-operator, ceph-cluster, ceph-pool).

2. **Missing `rook_version` variable in example command**: The `rook-operator` role uses `{{ rook_version }}` to clone the correct Rook Git tag, but the example `ansible-playbook` command did not pass this variable via `-e`. This would cause an undefined variable error at runtime. Fixed by adding `-e rook_version=v1.16.0` to the example command.

3. **Redundant labeling task execution**: With the playbook fix targeting `ceph_nodes`, the node labeling task (which uses `loop` over all ceph_nodes and `delegate_to` master) would execute redundantly from every host in the play. Added `run_once: true` to ensure the labeling loop executes only once.

## Review Notes
- The `ceph` kernel module listed in prerequisites is for the kernel CephFS client. Rook-Ceph typically only requires the `rbd` module since Ceph daemons run in containers. Including `ceph` is not incorrect but may be unnecessary for most Rook deployments.
- The post does not show role defaults files (e.g., `roles/rook-operator/defaults/main.yml`). In a production setup, `rook_version` and other variables would typically have defaults defined there rather than always being passed on the command line.
- The `kubectl wait --for=jsonpath` syntax requires Kubernetes 1.23+. This is not called out in the post but is unlikely to be an issue for any current deployment.
