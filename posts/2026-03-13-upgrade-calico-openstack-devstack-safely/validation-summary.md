# Validation Summary: How to Upgrade Calico on OpenStack DevStack Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico OpenStack integration
- networking-calico
- DevStack
- OpenStackClient
- calicoctl
- systemd
- apt
- Git
- pip

## Sources Consulted
- DevStack plugin documentation: https://docs.openstack.org/devstack/latest/plugins.html
- DevStack configuration documentation: https://docs.openstack.org/devstack/latest/configuration.html
- DevStack systemd documentation: https://docs.openstack.org/devstack/pike/systemd.html
- networking-calico DevStack plugin documentation: https://static.openstack.org/docs/networking-calico/latest/devstack.html
- Calico OpenStack upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- OpenStackClient command list: https://docs.openstack.org/python-openstackclient/3.7.0/command-list.html
- OpenStackClient security group rule documentation: https://docs.openstack.org/python-openstackclient/3.7.0/command-objects/security-group-rule.html
- OpenDev networking-calico repository refs: https://opendev.org/openstack/networking-calico

## Issues Found
- The introduction stated that DevStack re-clones or updates all plugin repositories before installing them. DevStack documentation says `stack.sh` only clones project repositories if they do not exist by default, and refreshes repositories on each run only when `RECLONE=yes` is set. Updated the explanation and full re-stack example accordingly.
- The post said running `./unstack.sh` resets all data. DevStack documentation describes `unstack.sh` as shutting down OpenStack, while `clean.sh` is the more aggressive cleanup path. Updated the wording to avoid claiming that `unstack.sh` itself resets all data.
- The examples used literal `stable/yoga` to `stable/zed` replacements and `git checkout stable/zed` for `networking-calico`. The current official `networking-calico` repository does not expose those stable branch heads, so the examples now use `<old-ref>` and `<target-ref>` placeholders.
- The in-place package command used `pip3 install -e . --upgrade`. Reordered it to the standard documented pip option form, `pip3 install --upgrade -e .`.
- The Felix package upgrade command did not refresh apt metadata. Added `sudo apt-get update` before `sudo apt-get install --only-upgrade calico-felix`, matching the package update pattern in Calico's OpenStack upgrade documentation.
- The security group example used `openstack server set upgrade-test-vm --security-group upgrade-sg`, but OpenStackClient documents security group attachment as `openstack server add security group <server> <group>`. Updated the command.

## Review Notes
The post remains DevStack-specific and assumes a working Calico/OpenStack development environment. Current Calico OpenStack upgrade documentation focuses on package-based OpenStack deployments rather than DevStack source checkouts, so the in-place DevStack path should still be treated as a development workflow rather than production upgrade guidance.
