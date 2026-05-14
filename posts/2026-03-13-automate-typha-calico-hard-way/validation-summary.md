# Validation Summary: How to Automate Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Typha
- Kubernetes
- Ansible
- kubectl
- OpenSSL

## Sources Consulted
- Calico Open Source documentation, "Calico the hard way": https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico Open Source documentation, "Install Typha": https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation, "Install calico/node": https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation, "Typha overview": https://docs.tigera.io/calico/latest/reference/typha/overview
- Ansible documentation, `ansible.builtin.command`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation, `ansible.builtin.shell`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible documentation, `ansible.builtin.slurp`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible documentation, `kubernetes.core.k8s`: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible documentation, `kubernetes.core.k8s_scale`: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_scale_module.html
- Kubernetes documentation, Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation, ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation, CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl reference, rollout commands: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenSSL documentation, `openssl x509`: https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The inventory example used `worker-[01:50] ansible_host=10.0.0.[11:60]`, which is not a valid way to map each worker host to a matching IP address in a static INI inventory. Replaced it with explicit example host entries and an ellipsis comment.
- The Typha certificate and Kubernetes object names did not match the Calico hard-way documentation. Updated the examples to use `typhaca.crt`, `typha.crt`, `typha.key`, the `calico-typha-ca` ConfigMap, the `calico-typha-certs` Secret, and the `kube-system` namespace.
- The Ansible examples used `lookup('file', ...)` for files generated on the remote control-plane host. Ansible file lookups run on the controller, so these would fail or read the wrong files. Added `ansible.builtin.slurp` tasks and used their base64 content for Kubernetes Secret data.
- The scaling playbook used `ansible.builtin.command` with a shell pipeline. The command module does not process shell metacharacters such as `|`, so this was changed to `ansible.builtin.shell` with `changed_when: false`.
- The Typha replica calculation used floor division, causing 201 nodes to still produce one replica. Updated the expression to round up to one Typha replica per 200 nodes, with a minimum of one.
- The scaling task omitted `api_version` for the Deployment scale target. Added `api_version: apps/v1`.
- The certificate rotation playbook regenerated only the CA and updated only one Secret key, leaving the Typha server certificate and calico/node client certificate out of sync. Updated the example to regenerate and apply the Typha and calico/node certificates alongside the CA, then restart both `calico-typha` and `calico-node`.
- The CronJob mounted the old Secret name and checked the old `tls.crt` key. Updated it to mount `calico-typha-certs` and check `typha.crt`.
- The CronJob only printed the certificate end date, which did not actually detect impending expiry. Changed it to use `openssl x509 -checkend 2592000`, which exits non-zero when the certificate expires within 30 days.

## Review Notes
- The snippets were validated for YAML syntax locally. They were not applied to a live Kubernetes cluster because no target cluster or kubeconfig was provided.
- The hard-way Calico documentation states that this installation path is optimized for learning how components fit together and is not a production-ready install path.
