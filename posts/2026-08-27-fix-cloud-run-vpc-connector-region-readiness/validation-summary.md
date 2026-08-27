# Validation Summary: Why a Cloud Run VPC Connector Fails with `Resource Readiness Deadline Exceeded` Across Regions

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Google Cloud Run
- Serverless VPC Access connectors
- Google Cloud VPC and Shared VPC networking
- Google Cloud CLI (`gcloud`)
- Cloud NAT
- Direct VPC egress
- Google Cloud IAM service agents and organization policies

## Sources Consulted

- [Configure Cloud Run with VPC connectors](https://cloud.google.com/run/docs/configuring/vpc-connectors)
- [Configure Serverless VPC Access](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
- [How Serverless VPC Access works](https://cloud.google.com/vpc/docs/serverless-vpc-access)
- [Serverless VPC Access Connector v1 resource](https://cloud.google.com/vpc/docs/reference/vpcaccess/rest/v1/projects.locations.connectors)
- [`gcloud compute networks vpc-access connectors create`](https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create)
- [`gcloud compute networks vpc-access connectors describe`](https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/describe)
- [`gcloud run services describe`](https://cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [`gcloud run services update`](https://cloud.google.com/sdk/gcloud/reference/run/services/update)
- [`gcloud` output formats](https://cloud.google.com/sdk/gcloud/reference/topic/formats)
- [Configure connectors in a Shared VPC host project](https://cloud.google.com/run/docs/configuring/shared-vpc-host-project)
- [Configure connectors in Shared VPC service projects](https://cloud.google.com/run/docs/configuring/shared-vpc-service-projects)
- [Serverless VPC Access IAM roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/vpcaccess)
- [Compare Direct VPC egress and VPC connectors](https://cloud.google.com/run/docs/configuring/connecting-vpc)
- [Configure Direct VPC egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Configure a static outbound IP with Cloud NAT](https://cloud.google.com/run/docs/configuring/static-outbound-ip)
- [Troubleshoot Cloud Run issues](https://cloud.google.com/run/docs/troubleshooting)

## Issues Found

- The connector inventory command selected the deprecated `minThroughput` and `maxThroughput` fields. It now selects the current `machineType`, `minInstances`, and `maxInstances` fields and includes `subnet`, which is relevant for connectors created from an existing subnet.
- The example used different Cloud Run and connector projects without limiting that topology to Shared VPC. The default example now keeps both resources in the same project and explains that a different connector project is supported through the documented Shared VPC host-project pattern.
- The `/28` guidance said the range must not overlap any route. A default route can overlap numerically without conflicting, so the text now distinguishes overlap with IP reservations or in-use CIDR ranges from conflict with an existing route, matching Google Cloud's terminology.
- The Shared VPC paragraph treated host-project and service-project connector setup as having the same subnet, IAM, and firewall requirements. It now distinguishes the manual subnet and firewall setup for service-project connectors from the host-project IAM flow and Google-managed connector firewall rules.
- The Shared VPC troubleshooting bullet applied Network User requirements too broadly. It now identifies the two service agents that need Network User for a service-project connector and the Cloud Run service agent that needs `roles/vpcaccess.user` for a host-project connector.

## Review Notes

- Google Cloud explicitly requires the connector region to match the Cloud Run region and documents cross-region access to eligible VPC destinations, with cross-region data transfer charges where applicable.
- Google Cloud documents `Resource readiness deadline exceeded` as a generic Cloud Run readiness message, but does not specifically document it as the guaranteed error for a connector region mismatch. The post correctly presents it as a possible symptom rather than proof of the cause.
- `private-ranges-only` also routes RFC 6598 and the documented Private Google Access VIP ranges through the VPC; the post's command and route-design guidance remain correct.
- All referenced documentation URLs resolve to the intended current Google Cloud pages. No version-specific deprecations remain in the examples after the connector projection update.
