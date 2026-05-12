# Validation Summary: How to  Calico on OpenStack Upgrades

## Status
validated

## Post Type
Guide / Reference (short security checklist for Calico-on-OpenStack upgrades)

## Technologies Covered
- Calico (Felix, Neutron ML2 calico plugin)
- OpenStack (Keystone, Neutron, audit logging via oslo.log)
- Kubernetes / OpenShift (kubectl, oc)
- etcd
- Ansible

## Sources Consulted
- Project Calico documentation — OpenStack integration and Felix configuration: https://docs.tigera.io/calico/latest/getting-started/openstack/
- Felix configuration file reference (`/etc/calico/felix.cfg`): https://docs.tigera.io/calico/latest/reference/felix/configuration
- OpenStackClient command reference — `openstack role assignment list`: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/role-assignment.html
- Keystone middleware configuration (`auth_uri`, `identity_uri`, `www_authenticate_uri`): https://docs.openstack.org/keystonemiddleware/latest/middlewarearchitecture.html
- Neutron configuration reference: https://docs.openstack.org/neutron/latest/configuration/neutron.html
- Panko/Ceilometer event API deprecation notes: https://docs.openstack.org/panko/latest/ (project retired)

## Issues Found
- The last command in the "Key Steps" block was `openstack event list --project service --all-projects | grep calico`. This had two problems:
  1. `openstack event list` was provided by the Panko/Ceilometer plugin, which has been retired and is not present in modern OpenStack deployments.
  2. `--project service` and `--all-projects` are contradictory — `--all-projects` overrides any single-project scoping.
  
  Replaced with `grep -i calico /var/log/keystone/keystone.log | tail -50`, which is a reliable way to find Keystone activity for the calico service account on any standard OpenStack deployment that logs to the default location.

## Review Notes
- The post title ("How to  Calico on OpenStack Upgrades") has a double space and is missing a verb (likely "Secure" given the directory name and surrounding posts). This is a stylistic/typographical issue, not a technical one, so it was left untouched per the review scope.
- `auth_uri` in keystone_authtoken is technically deprecated in favor of `www_authenticate_uri` (since keystonemiddleware 4.18 / Pike), but `auth_uri` is still recognized for backward compatibility, so the `grep "auth_uri\|identity_uri"` check is still valid for inspecting existing deployments.
- `/etc/calico/felix.cfg` is the correct Felix configuration path for OpenStack-based Calico installations.
- `openstack role assignment list --user calico --project service` assumes the default domain for both user and project; in deployments using non-default domains, `--user-domain` and `--project-domain` would need to be added.
