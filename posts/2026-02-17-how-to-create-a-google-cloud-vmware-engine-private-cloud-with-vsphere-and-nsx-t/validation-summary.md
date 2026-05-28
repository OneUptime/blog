# Validation Summary: How to Create a Google Cloud VMware Engine Private Cloud with vSphere and NSX-T

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud VMware Engine
- Google Cloud CLI
- VMware vSphere
- VMware vSAN
- VMware NSX-T / NSX Data Center
- VMware HCX
- VMware Aria integrations
- Google Cloud VPC Network Peering
- Google Cloud Monitoring
- Google Cloud Backup and DR Service

## Sources Consulted
- Google Cloud VMware Engine: Creating a VMware Engine private cloud: https://docs.cloud.google.com/vmware-engine/docs/private-clouds/howto-create-private-cloud
- Google Cloud SDK reference: `gcloud vmware private-clouds create`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/create
- Google Cloud SDK reference: `gcloud vmware networks create`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/networks/create
- Google Cloud VMware Engine: About VMware Engine networks: https://docs.cloud.google.com/vmware-engine/docs/networking/vmware-engine-network
- Google Cloud VMware Engine: Peer a VPC network: https://docs.cloud.google.com/vmware-engine/docs/networking/peer-vpc-network
- Google Cloud VMware Engine: VLANs and subnets on VMware Engine: https://docs.cloud.google.com/vmware-engine/docs/concepts-vlans-subnets
- Google Cloud VMware Engine: Configure and manage subnets: https://docs.cloud.google.com/vmware-engine/docs/networking/howto-manage-subnets
- Google Cloud SDK reference: `gcloud vmware private-clouds update`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/update
- Google Cloud SDK reference: `gcloud vmware network-policies external-access-rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/network-policies/external-access-rules/create
- Google Cloud VMware Engine: Manage external access rules: https://docs.cloud.google.com/vmware-engine/docs/networking/external-access-rules
- Google Cloud SDK reference: `gcloud vmware private-clouds clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/clusters/update
- Google Cloud VMware Engine: Private cloud VMware components: https://docs.cloud.google.com/vmware-engine/docs/concepts-vmware-components
- Google Cloud VMware Engine: Overview of VMware Engine monitoring: https://docs.cloud.google.com/vmware-engine/docs/concepts-monitoring
- Google Cloud VMware Engine: Set up Cloud Monitoring with a standalone agent: https://docs.cloud.google.com/vmware-engine/docs/environment/howto-cloud-monitoring-standalone
- Google Cloud VMware Engine: Workload VM backup solutions: https://docs.cloud.google.com/vmware-engine/docs/concepts-backup-vms

## Issues Found
- The post described Private Service Access as the default connectivity model. Updated it to use standard VMware Engine networks and VPC Network Peering, noting that Private Service Access is only required for legacy VMware Engine networks.
- The private cloud creation command used invalid/currently unsupported flags: `--node-count`, `--node-type-id`, and `--management-ip-range`. Replaced them with `--node-type-config=type=standard-72,count=3` and `--management-range`.
- The post said private cloud creation should be monitored until `ACTIVE`. Updated this to `READY`, matching the current `gcloud vmware private-clouds create` reference.
- The NSX-T workload segment command used a nonexistent `gcloud vmware private-clouds subnets create` command. Replaced it with guidance to create workload segments in NSX-T Manager and clarified that `gcloud vmware private-clouds subnets` is for list/describe/update operations.
- The DNS command used an unsupported `gcloud vmware private-clouds update --dns-server-ips` flag. Replaced it with current behavior: standard network peering creates a management DNS zone binding, while workload DNS is configured in NSX-T or guest systems.
- The external access rule command used the wrong command group and flag names. Updated it to `gcloud vmware network-policies external-access-rules create` with `--network-policy`, `--source-ranges`, and `--destination-ranges`.
- The cluster scaling command used unsupported `--node-count`. Updated it to `--update-nodes-config=type=standard-72,count=5`.
- Updated the VMware management tooling reference from vRealize to VMware Aria integrations.
- Clarified that Cloud Monitoring integration requires metrics forwarding with a standalone agent, rather than directly connecting vCenter to Cloud Monitoring.

## Review Notes
The corrected post is technically valid for standard VMware Engine networks used by new projects. Exact node type availability, region availability, quota, and network policy names remain environment-specific and should be checked in the target Google Cloud project before running the commands.
