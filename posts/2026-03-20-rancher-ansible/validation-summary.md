# Validation Summary: How to Use Ansible to Automate Rancher Operations - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- Ansible
- Helm
- cert-manager
- Rancher Kubernetes API
- Rancher Backup Operator

## Sources Consulted
- Ansible inventory patterns documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- `kubernetes.core.helm` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- `kubernetes.core.helm_repository` module documentation: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/helm_repository_module.html
- `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- RKE2 installation configuration docs: https://docs.rke2.io/install/configuration
- RKE2 networking requirements: https://docs.rke2.io/install/requirements
- RKE2 quick start: https://docs.rke2.io/install/quickstart
- Rancher documentation versions page: https://ranchermanager.docs.rancher.com/versions
- Rancher Helm CLI quick start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher API tokens guidance: https://ranchermanager.docs.rancher.com/api/api-tokens
- Previous v3 Rancher API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher project workflow docs: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher backup/restore docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher backup examples: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/backup-restore-configuration/examples
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Rancher support matrix reference for supported Kubernetes/RKE2 ranges: https://www.suse.com/suse-rancher/support-matrix/all-supported-versions

## Issues Found
- The prerequisites omitted required Ansible collections and the OS/runtime assumptions implied by the playbooks. I updated the prerequisites to call out `ansible.posix`, `community.general`, `kubernetes.core`, RHEL-compatible hosts, and Python 3.9+.
- The node-preparation playbook configured `firewalld` without ensuring the package and Python bindings were installed or the service was started. I added `firewalld`, `python3-firewall`, `python3-pip`, and a task to enable/start `firewalld`.
- The firewall example used incorrect or irrelevant ports for an RKE2 server with `cni: cilium`, including Docker TLS (`2376`) and controller-manager/scheduler ports, while omitting required RKE2/Cilium ports like `9345`, `2381`, `30000-32767`, `4240`, and `51871`. I replaced the port list with the current RKE2 requirements for server nodes using Cilium.
- The swap-disable task always ran when enabled, which was not meaningfully idempotent. I gated it on `ansible_swaptotal_mb`.
- The sysctl list included `vm.max_map_count`, which is not an RKE2/Kubernetes baseline requirement in the referenced docs. I removed it.
- The RKE2 example pinned `v1.29.4+rke2r1`, which is an outdated branch relative to the current supported Rancher/RKE2 ranges. I switched the installer example to the supported `stable` channel.
- The RKE2 audit-log example wrote to `/var/log/kubernetes/audit.log` without creating the parent directory. I added a task to create `/var/log/kubernetes`.
- The Rancher install playbook lacked `become: true`, which would prevent writes to `/usr/local/bin`. I added privilege escalation at the play level.
- The cert-manager install used `wait_condition`, which is not a valid parameter for `kubernetes.core.helm`. I removed it and replaced it with supported `wait`/`timeout` usage.
- The cert-manager example used `installCRDs` while current upstream docs use `crds.enabled=true`. I aligned the Helm values with the official cert-manager Helm documentation.
- The `kubernetes.core` tasks did not account for required Python dependencies on the host executing them. I added `kubernetes`, `PyYAML`, and `jsonpatch` installation via `pip3`.
- The Rancher version was pinned to `2.8.3`, which is listed as a legacy/EOL line on the Rancher versions page as of April 24, 2026. I updated the example to `2.14.0`, the current latest Rancher release at validation time, and switched the repo reference to `rancher-latest`.
- The cluster-management example mixed legacy `/v3` API paths with an incorrect project-creation request body. I changed the example to use the Rancher Kubernetes API path for listing clusters and the correct namespaced project-creation endpoint/body shape from the official project workflow docs.
- The cluster-list loop expected a legacy `.json.data` response shape and fields that do not match the RK-API example. I updated it to iterate over `.json.items` and print stable cluster identifiers.
- The backup playbook installed `rancher-backup` without first adding the `rancher-charts` repository. I added the Helm repo task.
- The backup custom resource did not specify the Rancher resource set. I added `resourceSetName: rancher-resource-set-full` so the example explicitly targets the full Rancher backup set documented upstream.

## Review Notes
- The validated examples now assume a sequential flow through the post: Step 3 installs the Python dependencies used later by the backup playbook.
- Rancher’s legacy v3 API remains available, but the token docs note that legacy v3 API tokens are being phased out starting with Rancher v2.14. The corrected example therefore uses the Rancher Kubernetes API shape for project creation.
- In production, pin both Rancher and RKE2 to versions validated together in the Rancher support matrix rather than relying indefinitely on `stable` or `latest`.
