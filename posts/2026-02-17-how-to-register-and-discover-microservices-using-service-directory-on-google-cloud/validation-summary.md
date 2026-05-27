# Validation Summary: How to Register and Discover Microservices Using Service Directory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Service Directory
- Cloud DNS
- Google Cloud CLI
- Python Google Cloud Service Directory client library
- GKE
- IAM

## Sources Consulted
- Google Cloud Service Directory documentation: https://docs.cloud.google.com/service-directory/docs
- Configure Service Directory: https://docs.cloud.google.com/service-directory/docs/configuring-service-directory
- Configure a Service Directory DNS zone: https://docs.cloud.google.com/service-directory/docs/configuring-service-directory-zone
- Query using DNS with Service Directory: https://docs.cloud.google.com/service-directory/docs/query-dns
- Service Directory Python `RegistrationServiceClient` reference: https://cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.services.registration_service.RegistrationServiceClient
- Service Directory Python `LookupServiceClient` reference: https://cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.services.lookup_service.LookupServiceClient
- Service Directory Python `Service` and `Endpoint` type references: https://cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.types.Service and https://cloud.google.com/python/docs/reference/servicedirectory/latest/google.cloud.servicedirectory_v1.types.Endpoint
- Google Cloud SDK `gcloud service-directory endpoints create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/service-directory/endpoints/create
- Google Cloud SDK `gcloud dns managed-zones create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Service Directory IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/servicedirectory

## Issues Found
- The post used `--metadata` in `gcloud service-directory` commands. Current Service Directory v1 CLI commands use `--annotations`, so the examples were updated.
- The Python examples assigned `service.metadata` and `endpoint.metadata`. Current Service Directory v1 Python types expose these fields as `annotations`, so the code and explanatory text were updated.
- The DNS SRV lookup example used `dig user-api.production.internal SRV`. Service Directory SRV queries must use `_SERVICE._tcp.SERVICE.ZONE`, so the command and sample output were corrected to `_user-api._tcp.user-api.production.internal`.
- The Service Directory DNS zone example used short resource paths for the network and namespace. Official examples use fully qualified URLs, so the command was updated to use full Compute Engine network and Service Directory namespace URLs.
- The IAM section implied IAM controls all discovery. Service Directory DNS queries are controlled by the VPC networks attached to the DNS zone, not per-query IAM, so the wording was clarified.

## Review Notes
The post is technically valid after the fixes. The GKE sidecar example is a workable pattern, but future revisions could mention Google's built-in Service Directory for GKE integration as an alternative.
