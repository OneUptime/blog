# Validation Summary: How to Test OpenStack Service IPs with Calico in Production-Like Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Compute and OpenStackClient
- Calico OpenStack networking
- Calico IPAM
- Calico GlobalNetworkPolicy
- Bash

## Sources Consulted
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient man page and authentication options: https://docs.openstack.org/python-openstackclient/latest/cli/man/openstack.html
- OpenStackClient compute service command reference: https://files.openstack.org/docs/python-openstackclient/latest/cli/command-objects/compute-service.html
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- OpenStack networking-calico documentation: https://docs.openstack.org/networking-calico/1.3.1/
- OpenStack networking-calico implementation notes: https://docs.openstack.org/networking-calico/1.3.1/implementation-notes.html

## Issues Found
- The allocation example used `openstack server create --project service-test`, but `server create` does not define a command-specific `--project` option. Updated the command to scope the operation with `OS_PROJECT_NAME=service-test`, matching OpenStackClient authentication/project scoping.
- The allocation and restart examples used `openstack server wait`, which is not a documented OpenStackClient server subcommand. Moved creation waiting to the documented `openstack server create --wait` option and added a Bash status polling helper for stop/start transitions.
- The Calico IPAM examples filtered `calicoctl ipam show` with `grep "allocated"`, but the documented summary output reports pool usage with fields such as IPs in use/free rather than an "allocated" line. Removed the filter so the test report shows the actual IPAM summary.
- The connectivity example started `python3 -m http.server` in the background over SSH without detaching it from the remote session. Updated it to use `nohup` with redirected output so the test service is more likely to remain running after SSH exits.
- The policy test referenced `SERVICE_IP`, `CONSUMER_IP`, and `UNAUTH_IP` without defining them in the script. Added the same OpenStack lookups used by the other examples.

## Review Notes
- The guide assumes that the referenced OpenStack project, networks, VMs, SSH access, Calico IP pools, and endpoint labels already exist. That is acceptable for a production-like test plan, but future revisions could make those environment-specific assumptions more explicit.
- The Calico policy selector example is syntactically valid, but it only works if the selected Calico workload endpoints actually carry the `role == 'service'` and `role == 'authorized-consumer'` labels.
