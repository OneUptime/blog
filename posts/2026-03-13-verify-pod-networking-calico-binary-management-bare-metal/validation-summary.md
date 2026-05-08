# Validation Summary: How to Verify Pod Networking with Calico with Binary Management on Bare Metal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- CNI
- Calico IPAM
- BGP routing with BIRD
- kubectl
- calicoctl
- Ansible
- systemd

## Sources Consulted
- Calico Open Source documentation: Configure the Calico CNI plugins, https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source documentation: Install CNI plugin, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico Open Source documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Open Source documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: Assigning Pods to Nodes, https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Ansible documentation: ansible.builtin.systemd_service module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: ansible.builtin.stat module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible documentation: ansible.builtin.shell module, https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html

## Issues Found
- The BusyBox test pod examples used `kubectl run ... -- sleep ...` without `--command`. Current `kubectl run` treats trailing values as container args unless `--command` is set, so the examples might not reliably run `sleep` as intended. Changed the examples to use `--command -- sleep ...`.
- The test pod examples queried pod state and pod IPs immediately after creating pods. This can race pod startup and IP assignment. Added `kubectl wait --for=condition=Ready ... --timeout=120s` before checking pod placement, reading the target pod IP, or running `kubectl exec`.
- The IPAM cleanup command used `kubectl delete pods -l run`, which could delete unrelated pods in the namespace that happen to have any `run` label. Changed it to delete only the named test pods created by the example.
- The Ansible playbook used the `systemd` module without `state`, `enabled`, or another action. The current `ansible.builtin.systemd_service` documentation requires an action parameter for service management, so this was not a valid read-only health check. Changed the task to run `systemctl is-active calico-node` with `changed_when: false`.
- The Ansible playbook checked only `/opt/cni/bin/calico` and only for existence, while the earlier command and Calico hard-way documentation require both `calico` and `calico-ipam` CNI binaries to be executable. Added a separate executable check for `/opt/cni/bin/calico-ipam` and changed both checks to require executable files.

## Review Notes
The `ip route show | grep -c 'proto bird'` check is technically correct for Calico deployments using the BIRD/BGP backend, and Calico's troubleshooting documentation shows BGP-learned routes with `proto bird`. It is not a universal Calico routing check for deployments using VXLAN-only, eBPF, or other non-BIRD dataplane configurations, so the article's bare-metal BGP assumption should remain clear in future revisions.
