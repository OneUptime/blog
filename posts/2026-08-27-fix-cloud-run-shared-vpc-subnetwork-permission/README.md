# How to Fix Cloud Run Shared VPC `Permission Denied on Subnetwork` by Granting the Service Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Run, Shared VPC, IAM, Networking

Description: Grant the Cloud Run service agent least-privilege access to a Shared VPC subnet and deploy Direct VPC egress with fully qualified resources.

---

With Direct VPC egress, Cloud Run allocates addresses from the selected VPC subnet without a Serverless VPC Access connector. In a Shared VPC design, the Cloud Run resource is in a service project while the network and subnet are in a host project.

The principal that must use the subnet is the Google-managed Cloud Run service agent from the service project:

```text
service-SERVICE_PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com
```

Granting subnet access to the deployment user or runtime service account does not give the Cloud Run control plane permission to allocate addresses.

## Identify the host and service projects

Set the resources explicitly:

```bash
SERVICE_PROJECT_ID='example-run-service-project'
HOST_PROJECT_ID='example-network-host-project'
REGION='us-central1'
NETWORK='shared-app-network'
SUBNET='cloud-run-us-central1'
SERVICE='orders-api'
```

Get the service project's number and construct the service-agent email:

```bash
SERVICE_PROJECT_NUMBER="$(
  gcloud projects describe "${SERVICE_PROJECT_ID}" \
    --format='value(projectNumber)'
)"

RUN_SERVICE_AGENT="service-${SERVICE_PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

printf '%s\n' "${RUN_SERVICE_AGENT}"
```

Use the service project number, not the host project number and not either project's ID.

Confirm the subnet and its region:

```bash
gcloud compute networks subnets describe "${SUBNET}" \
  --project="${HOST_PROJECT_ID}" \
  --region="${REGION}" \
  --format='yaml(name,region,network,ipCidrRange)'
```

The Cloud Run service region must match the subnet region.

## Choose project-wide or subnet-scoped access

Google documents two role layouts for Direct VPC egress in Shared VPC.

The simpler layout grants Compute Network User across the host project:

```bash
gcloud projects add-iam-policy-binding "${HOST_PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_AGENT}" \
  --role='roles/compute.networkUser' \
  --condition=None
```

This lets the service agent use subnets across the host project. For narrower scope, grant Network Viewer on the host project and Network User on only the selected subnet:

```bash
gcloud projects add-iam-policy-binding "${HOST_PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_AGENT}" \
  --role='roles/compute.networkViewer' \
  --condition=None

gcloud compute networks subnets add-iam-policy-binding "${SUBNET}" \
  --project="${HOST_PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${RUN_SERVICE_AGENT}" \
  --role='roles/compute.networkUser'
```

The subnet-scoped layout supplies `compute.subnetworks.use` on the exact subnet while allowing the service agent to discover the network. If the subnet has external IPv6, Google also requires `roles/compute.publicIpAdmin`; review whether that broader capability is acceptable before using an external IPv6 subnet.

Have a Shared VPC or IAM administrator apply the host-project bindings. Do not broaden the policy to `allUsers` or a generic runtime group.

## Verify the Cloud Run service-agent role

The same service agent must retain `roles/run.serviceAgent` in the service project:

```bash
gcloud projects get-iam-policy "${SERVICE_PROJECT_ID}" \
  --flatten='bindings[]' \
  --filter='bindings.role=roles/run.serviceAgent' \
  --format='table(bindings.role,bindings.members)'
```

If the role was manually removed, restore the documented service-agent binding through the organization's IAM process. Service-agent roles should be granted only to service agents.

## Deploy with fully qualified Shared VPC names

Avoid resolving a same-named local network by using complete resource paths:

```bash
IMAGE='us-central1-docker.pkg.dev/example-run-service-project/apps/orders:2026-08-27'

gcloud run deploy "${SERVICE}" \
  --project="${SERVICE_PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --network="projects/${HOST_PROJECT_ID}/global/networks/${NETWORK}" \
  --subnet="projects/${HOST_PROJECT_ID}/regions/${REGION}/subnetworks/${SUBNET}" \
  --vpc-egress=private-ranges-only
```

IAM changes can take time to propagate. After propagation, deploy a new revision and inspect its networking configuration:

```bash
gcloud run services describe "${SERVICE}" \
  --project="${SERVICE_PROJECT_ID}" \
  --region="${REGION}" \
  --format=export
```

## Separate deployment IAM from runtime networking

The Compute Network User grant lets Cloud Run attach to and allocate from the subnet. It does not automatically allow application traffic through VPC firewall rules, network firewall policies, routes, DNS, Private Google Access, or downstream service authentication.

After the revision deploys, test the intended destination and inspect the network path separately. Direct VPC egress uses the subnet address range, so design firewall rules for the documented range rather than individual ephemeral addresses.

Also ensure sufficient free addresses. Cloud Run reserves addresses in blocks and retains addresses during revision transitions. A deployment error about insufficient free IP addresses is a capacity problem, not the same IAM denial.

## Common principal and resource mistakes

- Building the service-agent email with the host project number.
- Granting `roles/compute.networkUser` to the runtime service account.
- Granting the role in the service project even though the subnet is in the host project.
- Applying a subnet binding to a same-named subnet in another region.
- Supplying short network names that resolve in the wrong project.
- Removing `roles/run.serviceAgent` while trying to reduce project permissions.
- Confusing Direct VPC egress with a Serverless VPC Access connector, whose service agents and Shared VPC setup differ.

Resolve the exact principal, project, region, and subnet before adding any binding.

## Official Documentation

- [Direct VPC egress with Shared VPC](https://cloud.google.com/run/docs/configuring/shared-vpc-direct-vpc)
- [Direct VPC egress for Cloud Run](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Cloud Run service agent IAM role](https://cloud.google.com/iam/docs/roles-permissions/run#run.serviceAgent)
- [Shared VPC overview and IAM roles](https://cloud.google.com/vpc/docs/shared-vpc)
- [Cloud Run Direct VPC egress IP allocation](https://cloud.google.com/run/docs/configuring/shared-vpc-direct-vpc#direct-vpc-ip-allocation)

## Conclusion

For Shared VPC Direct VPC egress, grant subnet use to the Cloud Run service agent from the service project. Apply Compute Network User in the host project or combine host-level Network Viewer with a subnet-level Network User grant. Then deploy with fully qualified resource paths and troubleshoot firewall and address capacity only after attachment IAM succeeds.
