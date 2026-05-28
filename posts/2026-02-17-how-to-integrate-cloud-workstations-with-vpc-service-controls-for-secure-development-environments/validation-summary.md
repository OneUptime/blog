# Validation Summary: How to Integrate Cloud Workstations with VPC Service Controls

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Workstations
- VPC Service Controls
- Access Context Manager access levels and service perimeters
- Private Google Access
- Cloud DNS
- Private Service Connect
- Google Cloud CLI
- Cloud Audit Logs / Cloud Logging

## Sources Consulted
- Google Cloud Workstations: Configure VPC Service Controls and private clusters: https://docs.cloud.google.com/workstations/docs/configure-vpc-service-controls-private-clusters
- Google Cloud SDK: `gcloud workstations clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/clusters/create
- Google Cloud SDK: `gcloud workstations configs create`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- Google Cloud SDK: `gcloud access-context-manager levels create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Access Context Manager: Creating a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud SDK: `gcloud access-context-manager perimeters create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- VPC Service Controls: Private Google Access with VPC Service Controls: https://docs.cloud.google.com/vpc-service-controls/docs/private-connectivity
- VPC Service Controls: Set up private connectivity to Google APIs and services: https://docs.cloud.google.com/vpc-service-controls/docs/set-up-private-connectivity
- VPC Service Controls: Ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- VPC Service Controls audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging

## Issues Found
- The prerequisites assumed an existing Cloud Workstations cluster, while the tutorial creates one. Changed this to say the cluster should be ready to create or update, and added the Cloud Workstations Admin role.
- The access-level explanation implied device/IP access levels controlled Cloud Workstations access generally. Clarified that this is for administrative access from outside the perimeter, such as Cloud Console access.
- The service perimeter command omitted `compute.googleapis.com`, which Cloud Workstations documentation requires restricting whenever `workstations.googleapis.com` is restricted. Added Compute Engine to restricted services.
- The service perimeter command did not enable VPC accessible services, even though Cloud Workstations requires Cloud Storage and Artifact Registry to be VPC-accessible for image pulls. Added `--enable-vpc-accessible-services` and `--vpc-allowed-services`.
- The private cluster section claimed private networking prevents workstation internet access. Corrected this to describe private endpoint behavior for client access, added the required Private Service Connect/DNS note, and added a workstation config command using `--disable-public-ip-addresses`.
- The DNS section only covered `googleapis.com`. Added a note that Artifact Registry and Container Registry hostnames such as `*.pkg.dev` and `*.gcr.io` also need private DNS when used directly with `restricted.googleapis.com`.
- The Cloud Logging sink filter used a narrow violation reason that is not the documented general VPC Service Controls audit-log filter. Replaced it with the documented policy audit-log metadata filter.

## Review Notes
The remaining examples are schematic and use placeholder project IDs, project numbers, and IP ranges. They are technically valid patterns, but a production deployment should also define the required Private Service Connect endpoint, private DNS zone for the Cloud Workstations cluster hostname, firewall/egress controls, and any organization policies such as `constraints/compute.vmExternalIpAccess`.
