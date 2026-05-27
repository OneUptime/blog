# Validation Summary: How to Study Security and Compliance Topics for the GCP Professional Cloud

## Status
validated

## Post Type
Certification study guide

## Technologies Covered
- Google Cloud Professional Cloud Architect certification
- Cloud KMS, CMEK, CSEK, and Google default encryption
- Cloud Storage and `gcloud storage`
- Organization Policy Service
- Workload Identity Federation
- VPC Service Controls and Access Context Manager
- Cloud Armor
- Private Google Access, Private Service Connect, and Cloud NAT
- Identity-Aware Proxy
- Security Command Center
- Sensitive Data Protection
- Secret Manager

## Sources Consulted
- Google Cloud Professional Cloud Architect exam guide: https://cloud.google.com/learn/certification/guides/professional-cloud-architect
- Google Cloud default encryption at rest: https://cloud.google.com/docs/security/encryption/default-encryption
- Cloud KMS `gcloud kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud Storage customer-managed encryption keys: https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Organization Policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Restricting resource locations: https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Workload Identity Federation: https://cloud.google.com/iam/docs/workload-identity-federation
- Workload Identity Federation with AWS or Azure: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- VPC Service Controls service perimeter documentation: https://cloud.google.com/vpc-service-controls/docs/create-service-perimeters
- Cloud Armor rate limiting documentation: https://cloud.google.com/armor/docs/configure-rate-limiting
- Identity-Aware Proxy backend service documentation: https://cloud.google.com/iap/docs/enabling-compute-howto
- Security Command Center Security Health Analytics documentation: https://cloud.google.com/security-command-center/docs/concepts-security-health-analytics
- Security Command Center threat detection documentation: https://cloud.google.com/security-command-center/docs/how-to-investigate-threats
- Web Security Scanner overview: https://cloud.google.com/security-command-center/docs/concepts-web-security-scanner-overview
- Secret Manager `gcloud secrets create` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Private access options for services: https://cloud.google.com/vpc/docs/private-access-options
- Private Service Connect overview: https://cloud.google.com/vpc/docs/private-service-connect
- Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Sensitive Data Protection documentation: https://cloud.google.com/sensitive-data-protection/docs
- Cloud Service Mesh overview: https://cloud.google.com/service-mesh/docs/overview

## Issues Found
- The Cloud Storage CMEK example used `gsutil mb --default-kms-key`, which is not the current documented command shape for setting a bucket default CMEK. I changed the example to create the bucket with `gsutil mb` and then set the default key with `gcloud storage buckets update --default-encryption-key`.
- The organization policy example used `constraints/compute.locations`, which is not the correct organization policy constraint for resource-location restrictions. I changed it to `constraints/gcp.resourceLocations` and updated the example values to location groups.
- The data residency command piped a here-document directly into `gcloud resource-manager org-policies set-policy` without the required policy file argument. I changed it to write `policy.yaml` first and then pass that file to `set-policy`.
- The Cloud Armor rate-based-ban example omitted the ban threshold flags shown in the documented rate-based-ban command format. I added `--ban-threshold-count` and `--ban-threshold-interval-sec`.
- The post referred to Anthos Service Mesh and Cloud DLP. I updated those names to the current Google Cloud product names, Cloud Service Mesh and Sensitive Data Protection.

## Review Notes
The post is technically relevant and aligns with the current Professional Cloud Architect exam guide. Some recommendations are intentionally exam-oriented heuristics, such as preferring CMEK for key-management compliance questions; these are reasonable study guidance but should not be read as universal production design rules without considering exact requirements.
