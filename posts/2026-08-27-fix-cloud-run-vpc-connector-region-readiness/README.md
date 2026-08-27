# Fix Cloud Run VPC Connector Readiness Across Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Run, Serverless VPC Access, VPC, Networking

Description: Diagnose a generic connector readiness failure by enforcing the documented same-region relationship between Cloud Run and its VPC connector.

---

A Serverless VPC Access connector is a regional resource. Google requires its region to match the region of the Cloud Run service that uses it.

When a deployment references a connector from another region, the surrounding operation can surface a generic readiness failure such as `Resource readiness deadline exceeded`. The message alone does not prove a region mismatch, but the same-region rule is the first invariant to check before troubleshooting connector capacity or application traffic.

## Inventory the service and connector independently

Set explicit project and region values:

```bash
RUN_PROJECT_ID='example-run-project'
SERVICE='inventory-api'
SERVICE_REGION='us-central1'
CONNECTOR_PROJECT_ID="${RUN_PROJECT_ID}"
CONNECTOR='serverless-egress'
CONNECTOR_REGION='us-east1'
```

For a standalone VPC, the connector and Cloud Run service use the same project. Set a different connector project only when using the documented Shared VPC host-project topology.

Export the Cloud Run configuration:

```bash
gcloud run services describe "${SERVICE}" \
  --project="${RUN_PROJECT_ID}" \
  --region="${SERVICE_REGION}" \
  --format=export
```

Describe the connector in the region where it actually exists:

```bash
gcloud compute networks vpc-access connectors describe "${CONNECTOR}" \
  --project="${CONNECTOR_PROJECT_ID}" \
  --region="${CONNECTOR_REGION}" \
  --format='yaml(name,network,ipCidrRange,subnet,state,machineType,minInstances,maxInstances)'
```

The connector resource name includes its location:

```text
projects/CONNECTOR_PROJECT_ID/locations/CONNECTOR_REGION/connectors/CONNECTOR
```

Compare that location with the Cloud Run service region. Do not infer the connector region from the VPC network, because VPC networks are global while connectors are regional.

## The destination region does not select the connector region

The connector must match the serverless service, not every private destination. A connector in `us-central1` used by a Cloud Run service in `us-central1` can route through the VPC to an eligible resource in another region. Cross-region network data transfer charges and latency can apply.

For example, a database in `us-east1` does not justify attaching a `us-east1` connector to a Cloud Run service in `us-central1`. Create the connector beside Cloud Run and let VPC routing reach the destination.

## Create a replacement connector in the service region

A connector cannot be moved to another region. Create a new connector in the Cloud Run region with an unused RFC 1918 `/28` range that does not overlap an existing IP address reservation or in-use CIDR range and does not conflict with existing routes:

```bash
NEW_CONNECTOR='run-egress-uc1'
NETWORK='application-network'
UNUSED_CIDR='10.8.0.0/28'

gcloud compute networks vpc-access connectors create "${NEW_CONNECTOR}" \
  --project="${CONNECTOR_PROJECT_ID}" \
  --region="${SERVICE_REGION}" \
  --network="${NETWORK}" \
  --range="${UNUSED_CIDR}"
```

For Shared VPC, use the documented host-project or service-project connector procedure instead of assuming the standalone-VPC command applies. A connector created in a service project requires a pre-created `/28` subnet, service-agent IAM grants, and manual connector firewall rules. A host-project connector uses the host-project IAM flow, and Google Cloud creates its required connector firewall rules.

Wait until the new connector reports `READY`:

```bash
gcloud compute networks vpc-access connectors describe "${NEW_CONNECTOR}" \
  --project="${CONNECTOR_PROJECT_ID}" \
  --region="${SERVICE_REGION}" \
  --format='value(state)'
```

Do not attach a connector that is still `CREATING` or is in `ERROR`.

## Attach the fully qualified connector resource

Use a complete resource name, especially when the connector lives in a Shared VPC host project:

```bash
CONNECTOR_RESOURCE="projects/${CONNECTOR_PROJECT_ID}/locations/${SERVICE_REGION}/connectors/${NEW_CONNECTOR}"

gcloud run services update "${SERVICE}" \
  --project="${RUN_PROJECT_ID}" \
  --region="${SERVICE_REGION}" \
  --vpc-connector="${CONNECTOR_RESOURCE}" \
  --vpc-egress=private-ranges-only
```

Choose `private-ranges-only` or `all-traffic` according to the required route design. If all traffic uses the connector, provide a valid path for internet egress, such as the documented Cloud NAT design, where needed.

Verify the new revision and test a private destination:

```bash
gcloud run services describe "${SERVICE}" \
  --project="${RUN_PROJECT_ID}" \
  --region="${SERVICE_REGION}" \
  --format=export
```

Keep the old connector until every service and revision has been moved and the new path has been validated. Then remove it through a separately reviewed cleanup change.

## If the regions already match

`Resource readiness deadline exceeded` is generic, so continue with the connector's own state and operation details when the regions match.

Check these documented causes:

- The connector's RFC 1918 `/28` overlaps an existing IP address reservation or in-use CIDR range, or conflicts with an existing route.
- The Serverless VPC Access service agent lost `roles/vpcaccess.serviceAgent`.
- The Google APIs service agent lacks the permissions needed to provision connector infrastructure.
- An organization policy blocks the `serverless-vpc-access-images` Compute Engine images or Cloud Deployment Manager.
- Shared VPC IAM is incomplete: service-project connectors require Network User for the Serverless VPC Access and Google APIs service agents on the host project or connector subnet; host-project connectors require `roles/vpcaccess.user` for the Cloud Run service agent on the host project.
- The Serverless VPC Access API is disabled in the connector project.
- The connector is still provisioning or has entered `ERROR`.

The Serverless VPC Access service agent has this form:

```text
service-CONNECTOR_PROJECT_NUMBER@gcp-sa-vpcaccess.iam.gserviceaccount.com
```

`roles/vpcaccess.serviceAgent` is a service-agent role and should never be granted to ordinary users or runtime service accounts.

Once attachment succeeds, a connection timeout to the destination is a separate data-plane problem. Check firewall rules, routes, DNS, connector source range, and destination service authorization rather than recreating the connector immediately.

## Consider Direct VPC egress

Google recommends Direct VPC egress for Cloud Run when it meets the workload's requirements. It removes the connector resource and its connector VM cost model, but it has its own subnet IAM, IP allocation, and operational considerations. Evaluate it as a planned networking change, not as an unreviewed workaround during an incident.

## Official Documentation

- [Configure Cloud Run with VPC connectors](https://cloud.google.com/run/docs/configuring/vpc-connectors)
- [Configure Serverless VPC Access](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
- [How Serverless VPC Access works](https://cloud.google.com/vpc/docs/serverless-vpc-access)
- [Create a connector with gcloud](https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create)
- [Configure connectors in a Shared VPC host project](https://cloud.google.com/run/docs/configuring/shared-vpc-host-project)
- [Configure connectors in Shared VPC service projects](https://cloud.google.com/run/docs/configuring/shared-vpc-service-projects)
- [Direct VPC egress for Cloud Run](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)

## Conclusion

A Cloud Run service and its Serverless VPC Access connector must be in the same region, even when the private destination is elsewhere. Inventory both full resource names, create a replacement connector beside the service, wait for `READY`, and attach it explicitly. If regions already match, use connector state and provisioning diagnostics instead of treating the generic readiness message as proof of one cause.
