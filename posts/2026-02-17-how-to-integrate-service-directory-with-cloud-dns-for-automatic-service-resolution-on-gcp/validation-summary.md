# Validation Summary: How to Integrate Service Directory with Cloud DNS for Auto Service Resolution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Service Directory
- Cloud DNS
- Google Cloud CLI
- Python Cloud Functions
- Terraform Google provider
- DNS A, AAAA, and SRV lookups

## Sources Consulted
- Google Cloud Service Directory overview: https://docs.cloud.google.com/service-directory/docs/overview
- Google Cloud Service Directory configuration guide: https://docs.cloud.google.com/service-directory/docs/configuring-service-directory
- Google Cloud Service Directory DNS zone guide: https://docs.cloud.google.com/service-directory/docs/configuring-service-directory-zone
- Google Cloud Service Directory DNS query guide: https://docs.cloud.google.com/service-directory/docs/query-dns
- Google Cloud CLI reference for `gcloud dns managed-zones create`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud CLI reference for Service Directory endpoints: https://docs.cloud.google.com/sdk/gcloud/reference/service-directory/endpoints/create
- Google Cloud Python client reference for `RegistrationServiceClient`: https://docs.cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.services.registration_service.RegistrationServiceClient
- Google Cloud Python client reference for Service Directory `Service`: https://docs.cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.types.Service
- Google Cloud Python client reference for Service Directory `Endpoint`: https://docs.cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.types.Endpoint
- Terraform Registry for `google_dns_managed_zone`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Terraform Registry for `google_service_directory_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_directory_service
- Terraform Registry for `google_service_directory_endpoint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_directory_endpoint

## Issues Found
- The post claimed a basic DNS lookup returns both IP address and port for a healthy endpoint. Cloud DNS A/AAAA lookups return endpoint addresses; SRV lookups return endpoint names and ports. Updated the explanation to distinguish A/AAAA from SRV lookups and removed the unsupported health implication.
- The `gcloud service-directory services create` and `gcloud service-directory endpoints create` examples used `--metadata`, but the current Google Cloud CLI uses `--annotations` for Service Directory v1 resources. Updated all affected CLI examples.
- The Cloud DNS zone examples used short resource names for `--networks` and `--service-directory-namespace`. Official examples use fully qualified URLs for these flags. Updated the production and staging examples.
- The SRV lookup example used `_http._tcp.user-api.production.internal`, but Service Directory DNS SRV queries use `_<service-name>._tcp.<service-name>.<zone-domain>` by default. Updated the shell and Python examples to use `_user-api._tcp.user-api.production.internal` and `_{service_name}._tcp.{service_name}.{namespace}.internal`.
- The Python Cloud Function example used the removed/incorrect v1 `metadata` field on Service Directory `Service` and `Endpoint` types. Updated these to `annotations`, matching the current Python client.
- The Python Cloud Function example treated the Pub/Sub event as an already-decoded dictionary and included an unused Container API import. Updated it to decode the Pub/Sub payload, removed the unused import, and added a `FieldMask` for endpoint updates.

## Review Notes
The GKE automation sample still assumes another component publishes service-change events to Pub/Sub; GKE does not provide that exact payload shape automatically. The Terraform Service Directory resources still use `metadata`, which is correct for the current Terraform Google provider schema even though the v1 API and gcloud terminology use annotations.
