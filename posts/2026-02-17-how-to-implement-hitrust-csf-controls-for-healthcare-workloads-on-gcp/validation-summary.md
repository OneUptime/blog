# Validation Summary: How to Implement HITRUST CSF Controls for Healthcare Workloads on GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud IAM
- Cloud Healthcare API and FHIR stores
- Google Cloud CLI
- Google Cloud organization policies
- VPC, subnet, firewall, and VPC Service Controls
- Cloud KMS and Cloud HSM
- Cloud SQL TLS configuration
- Cloud Storage CMEK and uniform bucket-level access
- Sensitive Data Protection / Cloud DLP Python client
- Security Command Center
- Cloud Audit Logs and logging sinks
- Terraform Google provider

## Sources Consulted
- Google Cloud IAM custom roles CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud IAM Conditions resource attributes: https://cloud.google.com/iam/docs/conditions-resource-attributes
- Cloud Healthcare API IAM binding CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/add-iam-policy-binding
- Cloud Healthcare API FHIR store create/update CLI references: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/create and https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/update
- Google Cloud resource location organization policy documentation: https://docs.cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Cloud SQL instance patch CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Cloud KMS key creation and Cloud HSM documentation: https://docs.cloud.google.com/kms/docs/create-key and https://docs.cloud.google.com/kms/docs/hsm
- Cloud Storage bucket creation CLI reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Sensitive Data Protection DLP job and infoType documentation: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-create-job and https://docs.cloud.google.com/sensitive-data-protection/docs/infotypes-reference
- Security Command Center service and notification CLI references: https://docs.cloud.google.com/sdk/gcloud/reference/scc/manage/services/update and https://docs.cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Cloud Audit Logs data access configuration: https://cloud.google.com/logging/docs/audit/configure-data-access
- Terraform Google provider resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/healthcare_fhir_store and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_service_perimeter
- Google Cloud HITRUST compliance overview: https://cloud.google.com/security/compliance/hitrust
- HITRUST CSF v11 control category references: https://hitrustalliance.net/hubfs/Authoritative%20Sources/FY24%20-%20Q1%20-%20NIST%202.0%20Guidance/FY24%20-%20Q1%20-%20HITRUST%20Approach%20to%20Cyber%20Resilience%20-%20NIST%202.0%20Guidance.pdf

## Issues Found
- The IAM binding used an IAM Condition with `resource.type == "healthcare.googleapis.com/FhirStore"`, but Cloud Healthcare API resource types are not listed as supported IAM Conditions resource attributes. Changed the example to grant the role directly on the FHIR store with `gcloud healthcare fhir-stores add-iam-policy-binding`.
- The MFA example used `gcloud identity groups update --group-email`, which is not a valid flag and does not enforce 2SV. Replaced it with the correct Google Workspace or Cloud Identity Admin Console configuration guidance.
- The Physical and Environmental Security heading used Domain 05, but current HITRUST CSF category numbering places Physical and Environmental Security under Domain 08. Updated the heading and removed the incorrect `05.i` reference from the resource-location example.
- The Cloud SQL TLS example used `--require-ssl`; current Cloud SQL CLI supports explicit `--ssl-mode`, so the example now uses `--ssl-mode=ENCRYPTED_ONLY`.
- The DLP Python example mixed typed proto construction with request dictionaries and imported unused modules. Updated it to the dictionary style used in official Python samples and removed unused imports.
- The FHIR store section included `gcloud healthcare fhir-stores update` with no update flags and described it as enabling audit logging. Removed the invalid command and clarified that FHIR operations are covered by Cloud Audit Logs configured later.
- The Security Command Center example used `gcloud scc settings update --enable-modules`, which is not the current service-enablement command. Replaced it with `gcloud scc manage services update` for Security Health Analytics and Event Threat Detection.

## Review Notes
The post is a technical implementation guide and is relevant. Some compliance mappings remain illustrative; teams pursuing HITRUST validation should verify exact requirement statements and evidence expectations with their assessor and the applicable HITRUST assessment version.
