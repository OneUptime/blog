# Validation Summary: How to Upgrade Calico with Binary Management on Bare Metal Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Ansible
- systemd
- Bare metal networking

## Sources Consulted
- Calico binary install documentation: https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Project Calico v3.27.0 GitHub release metadata: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Ansible serial execution documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The playbook downloaded `calico-node-amd64` from the Calico GitHub release URL, but the v3.27.0 release does not publish a `calico-node-amd64` asset. Updated the guide to use a `calico-node` binary extracted from the matching `calico/node` image or Calico release bundle, which matches Calico's binary installation documentation and release artifacts.
- The `group_vars/all.yml` example was marked as `ini` despite containing YAML. Changed the code fence to `yaml`.
- The text claimed automatic rollback, but the original playbook did not contain rollback logic. Updated the wording and added an Ansible `block`/`rescue` rollback path that restores the previous binary and restarts `calico-node` if validation fails.
- The introduction said each node should verify service health and BGP session state before proceeding, but the original playbook only checked service status. Added a `calicoctl node status` verification task that fails when discovered BGP peers are not established.
- The original service health check used the `systemd` module only to inspect status. Replaced it with `systemctl is-active calico-node`, which directly checks the active state in a retry loop.

## Review Notes
The commands and concepts are technically valid for a Calico binary-managed bare metal environment, but the workflow assumes `calicoctl` is available on each upgraded node for BGP validation. Ansible and kubectl were not installed in the local workspace, so the playbook could not be executed or syntax-checked with local CLI tooling.
