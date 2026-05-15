# Validation Summary: How to Automate Metrics Collection Using the metrics RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Performance Co-Pilot (PCP)

## Sources Consulted
- Red Hat documentation: Configuring performance monitoring with PCP by using RHEL system roles, RHEL 10, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/configuring-performance-monitoring-with-pcp-by-using-rhel-system-roles
- Red Hat documentation: Preparing a control node and managed nodes to use RHEL system roles, RHEL 10, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles
- Red Hat Ecosystem Catalog: redhat.rhel_system_roles collection, https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles

## Issues Found
- The post said the `rhel-system-roles` package installs roles under `/usr/share/ansible/roles/`. Current Red Hat documentation states that the package installs the collection under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`, so the install-path text was updated.
- The playbook used the older `rhel-system-roles.metrics` role name. Current Red Hat examples use `ansible.builtin.include_role` with `redhat.rhel_system_roles.metrics`, so the playbook was updated to match the supported collection-qualified role name.
- The role documentation commands pointed to `/usr/share/doc/rhel-system-roles/metrics/`, which does not match the current collection layout. They were updated to the metrics role README under the installed collection path.
- The verification step used placeholders for a service and config file. Red Hat's metrics role documentation verifies PCP by querying `kernel.all.load` with `pminfo`, so the placeholder commands were replaced with an Ansible ad hoc command that queries that metric on the managed hosts.

## Review Notes
The tutorial remains intentionally minimal. Future improvements could mention optional variables such as `metrics_manage_firewall`, `metrics_manage_selinux`, `metrics_graph_service`, and `metrics_query_service` when remote PCP access or Grafana visualization is required.
