# Validation Summary: How to Configure Cloud Interconnect with Shared VPC for Multi-Project Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC
- Shared VPC
- Cloud Interconnect
- Dedicated Interconnect VLAN attachments
- Cloud Router and BGP
- Google Cloud CLI
- Cloud Monitoring metrics scopes
- Google Cloud IAM

## Sources Consulted
- Google Cloud: Provision Shared VPC - https://docs.cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud: Shared VPC overview - https://docs.cloud.google.com/vpc/docs/shared-vpc
- Google Cloud: Create VLAN attachments for Dedicated Interconnect - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud SDK: gcloud compute interconnects attachments dedicated create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud SDK: gcloud compute routers add-interface - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK: gcloud compute routers add-bgp-peer - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud: Advertised routes - https://docs.cloud.google.com/network-connectivity/docs/router/concepts/advertised-routes
- Google Cloud: Advertise custom address ranges - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/advertising-custom-ip
- Google Cloud SDK: gcloud compute routers update - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update
- Google Cloud: Metrics scopes overview - https://docs.cloud.google.com/monitoring/settings
- Google Cloud: Configure a metrics scope by using the API - https://docs.cloud.google.com/monitoring/settings/manage-api

## Issues Found
- The VLAN attachment command used `--bandwidth=BPS_10G`, but current `gcloud` documentation uses values such as `10g`. Changed the example to `--bandwidth=10g`.
- The BGP peer command used a hard-coded `--peer-ip-address` without configuring matching custom BGP addresses on the VLAN attachment. Added a command to describe the attachment, removed the hard-coded peer IP, and noted that Cloud Router uses the allocated BGP addresses unless custom addresses are specified.
- The post stated that Cloud Router advertises all VPC subnets by default. Updated this to explain that default advertisement follows the VPC network's dynamic routing mode: regional or global.
- The post implied learned routes automatically apply uniformly to all VMs in the shared network. Updated the wording to reflect VPC dynamic routing mode behavior.
- The Shared VPC subnet IAM examples granted `roles/compute.networkUser` only to service project Google APIs service accounts. Updated examples to grant access to team groups that create resources, and clarified when the Google APIs service account is also needed.
- The VM examples did not apply the `onprem-access` tag required by the firewall rule example. Added `--tags=onprem-access` to both VM creation commands.
- The monitoring metrics scope commands used an invalid non-beta form and `--monitored-project` flag. Updated them to the documented `gcloud beta monitoring metrics-scopes create MONITORED_PROJECT --project=SCOPING_PROJECT` form.
- The prerequisites allowed Dedicated or Partner Interconnect, but the commands use Dedicated Interconnect-specific attachment commands. Updated the prerequisite to say the examples use Dedicated Interconnect and that Partner Interconnect uses a partner VLAN attachment flow.

## Review Notes
The corrected tutorial is accurate for the Dedicated Interconnect flow shown. A future enhancement could add a separate Partner Interconnect variant, but that would be new content rather than a technical correction.
