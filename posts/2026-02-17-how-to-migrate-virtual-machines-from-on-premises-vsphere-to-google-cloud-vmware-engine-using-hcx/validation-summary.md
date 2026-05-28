# Validation Summary: How to Migrate Virtual Machines from On-Premises vSphere to Google Cloud VMware

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud VMware Engine
- VMware HCX
- VMware vSphere and vCenter
- Google Cloud VPN
- Cloud Interconnect
- Google Cloud CLI
- Python post-migration validation checks

## Sources Consulted
- Google Cloud VMware Engine: Migrating VMware VMs using VMware HCX: https://docs.cloud.google.com/vmware-engine/docs/workloads/howto-migrate-vms-using-hcx
- Google Cloud VMware Engine: Migrating VMware VMs to your private cloud: https://docs.cloud.google.com/vmware-engine/docs/workloads/howto-migrate-workloads
- Google Cloud VMware Engine: About VMware Engine networks: https://docs.cloud.google.com/vmware-engine/docs/networking/vmware-engine-network
- Google Cloud VMware Engine: Peer a VPC network: https://docs.cloud.google.com/vmware-engine/docs/networking/peer-vpc-network
- Google Cloud SDK: gcloud vmware network-peerings create: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/network-peerings/create
- Google Cloud SDK: gcloud vmware private-clouds describe: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/describe
- Google Cloud SDK: gcloud compute vpn-tunnels create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK: gcloud compute interconnects attachments dedicated create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud Cloud Interconnect: Create VLAN attachments: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Broadcom Knowledge Base: HCX Bulk Migration operations and best practices: https://knowledge.broadcom.com/external/article/323663/hcx-bulk-migration-operations-and-best-p.html

## Issues Found
- The prerequisites stated a fixed on-premises vSphere minimum of 6.5. Current Google Cloud guidance says to verify that the source VMware product versions are supported for the selected HCX migration type using the VMware interoperability matrix, so the prerequisite was changed to that compatibility-based wording.
- The Cloud VPN example used a Classic VPN target gateway pattern. It was updated to an HA VPN tunnel example using `--vpn-gateway`, gateway interface flags, a peer external gateway, and Cloud Router.
- The Interconnect example used `gcloud compute interconnects attachments create` and `--vlan-tag`, which do not match the current Dedicated Interconnect CLI. It was changed to `gcloud compute interconnects attachments dedicated create` with `--vlan`.
- The VPC peering section claimed to create peering but used `gcloud vmware private-clouds vcenter credentials describe`, which only retrieves vCenter credentials. It was replaced with `gcloud vmware network-peerings create`.
- The HCX Cloud Manager step said to create site pairing before deploying the on-premises Connector. It was corrected to say the cloud-side step is used to download the Connector OVA and obtain an activation key.
- The HCX Connector activation wording said "license key"; GCVE documentation refers to HCX activation keys, so the text was corrected.
- The `gcloud vmware private-clouds describe` examples used a regional location. Current CLI examples use zonal locations for private clouds, so the examples were changed to `us-central1-a`.

## Review Notes
The Python validation script is syntactically valid, but it assumes Linux-compatible `ping` and `nc` command-line options are available on the machine running the script. The HCX UI labels can vary slightly between HCX versions, but the workflow described is consistent with the current Google Cloud VMware Engine migration guidance.
