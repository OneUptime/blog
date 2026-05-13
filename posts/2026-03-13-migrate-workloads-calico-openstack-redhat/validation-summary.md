# Validation Summary: How to Migrate Existing Workloads to Calico on OpenStack Red Hat

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source for OpenStack
- OpenStack Neutron
- OpenStackClient
- Red Hat Enterprise Linux
- Open vSwitch
- etcd v3
- Felix
- BIRD/BGP
- SELinux
- firewalld

## Sources Consulted
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico OpenStack RHEL installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/redhat
- Calico OpenStack configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStackClient server image create reference: https://files.openstack.org/docs/python-openstackclient/2025.2/cli/command-objects/server-image.html
- OpenStackClient server create reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient network agent reference: https://docs.openstack.org/python-openstackclient/3.11.0/command-objects/network-agent.html
- OpenStack Neutron agents and services documentation: https://docs.openstack.org/neutron/latest/admin/config-services-agent.html
- Red Hat Enterprise Linux SELinux troubleshooting guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original guide described an in-place OVS-to-Calico migration where VMs were stopped and restarted. Calico's RHEL OpenStack installation documentation warns that incompatible OpenStack state must be removed, so the post now says to back up workloads, remove incompatible state, and recreate workloads from verified snapshots.
- The prerequisites were too broad. Updated them to require RHEL 8 or later, Neutron OVS/ML2, an etcdv3 datastore, and BGP or route-reflector planning, matching Calico OpenStack requirements.
- The controller install used the incorrect package `python3-networking-calico` and omitted the Calico RPM repository, `calico-control`, `etcd3gw`, `service_plugins = qos`, and `[calico] etcd_host`. Updated the commands to match the documented RHEL Calico install flow.
- The compute install only installed Felix. Calico OpenStack also requires Neutron infrastructure, the Calico DHCP agent, BIRD, `calico-compute`, Nova metadata-related configuration, and an appropriate Felix config. Updated the command block accordingly.
- The Felix configuration used `EtcdEndpoints` with a URL and omitted `EndpointStatusPathPrefix = none`. The documented RHEL OpenStack example uses `EtcdAddr = <ip>:2379` and `EndpointStatusPathPrefix = none`, so the snippet was corrected.
- The post presented firewalld rules as essential. Calico's OpenStack requirements warn that firewalld and other iptables managers can interfere with Calico. The post now says to disable firewalld where possible, or explicitly allow required traffic only if it must stay enabled.
- The SELinux command generated a policy module without telling readers to inspect AVC denials first. Red Hat recommends analyzing denials before using `audit2allow`, so the post now includes an explicit review step.
- The verification step restarted existing VMs. It now recreates a server from a snapshot image and keeps the valid `calicoctl get workloadendpoints -A` check.

## Review Notes
- Calico's official RHEL OpenStack installation path is no longer actively tested, and this is now called out in the post.
- Exact service names can vary across Red Hat OpenStack releases and deployment styles, especially containerized RHOSP deployments, so production runbooks should adapt the commands to the deployed release.
