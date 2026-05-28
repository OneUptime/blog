# Validation Summary: How to Configure CMEK with Cloud External Key Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Cloud External Key Manager
- Customer-managed encryption keys
- Service Directory
- Private Service Connect for Cloud EKM
- Google Cloud CLI
- Terraform Google provider
- Cloud Monitoring

## Sources Consulted
- Google Cloud KMS Cloud EKM overview: https://cloud.google.com/kms/docs/ekm
- Google Cloud KMS create an EKM connection: https://cloud.google.com/kms/docs/create-ekm-connection
- Google Cloud KMS create an external key: https://cloud.google.com/kms/docs/create-external-key
- gcloud `kms ekm-connections create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/ekm-connections/create
- gcloud `kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- gcloud `kms keys versions create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- gcloud `service-directory endpoints create` reference: https://cloud.google.com/sdk/gcloud/reference/service-directory/endpoints/create
- Google Cloud KMS Monitor EKM usage: https://cloud.google.com/kms/docs/monitor-ekm-usage
- Cloud Monitoring Google Cloud metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_c
- gcloud `monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider `google_kms_ekm_connection`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_ekm_connection
- Terraform Google provider `google_kms_crypto_key`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Terraform Google provider `google_kms_crypto_key_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key_version
- Terraform Google provider `google_service_directory_endpoint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_directory_endpoint

## Issues Found
- The Cloud EKM architecture explanation said the actual cryptographic operations happen outside Google Cloud. Updated it to reflect the documented model: external key material remains in the EKM, and symmetric Cloud EKM keys also use internal Cloud KMS key material as an additional layer.
- The architecture diagram implied only VPC connectivity. Updated it to show internet or VPC connectivity.
- The supported external key manager list included Atos Trustway and Securosys Primus, which are not listed in the current Google Cloud supported key managers list. Removed them and kept Fortanix, Futurex, and Thales.
- The VPC setup included an incomplete VPN tunnel command that would not work without other Classic VPN resources. Replaced it with a note to configure Cloud VPN or Cloud Interconnect separately.
- The VPC-based EKM setup omitted the Cloud EKM service agent authorization for Service Directory. Added commands to create the service identity and grant `roles/servicedirectory.viewer` and `roles/servicedirectory.pscAuthorizedService`.
- The Service Directory endpoint command omitted the `--network` field, which Google documents as required for EKM via VPC endpoint resolution. Added the network value using the project number.
- The EKM connection command used the wrong `--service-resolvers` form for current documented `gcloud` usage. Replaced it with `--service-directory-service`, `--hostname`, `--server-certificates-files`, and `--key-management-mode=manual`.
- The setup order created the EKM connection before the Service Directory service existed. Reordered the steps so Service Directory registration comes before connection creation.
- The external-vpc key creation command omitted `--default-algorithm` and `--crypto-key-backend`, both required for external keys over VPC in the documented `gcloud kms keys create` flow. Added both.
- The key version command used `--external-key-uri` with a `vpc://` URI for an external-vpc key. Replaced it with `--ekm-connection-key-path` and added `--primary` for the symmetric encryption key version.
- The post claimed external keys work with the same services that support CMEK. Updated it to state that only CMEK services that also support Cloud EKM can use external keys.
- The Terraform example omitted the Service Directory endpoint `network`, the EKM connection management mode, the Cloud KMS key `crypto_key_backend`, and the key version resource needed to point at the external EKM key path. Added these fields and the `google_kms_crypto_key_version` resource.
- The Cloud Monitoring alert used a non-current metric name and unsupported threshold flags. Replaced it with the documented EKM metric namespace and current `gcloud monitoring policies create` flags.

## Review Notes
The examples remain illustrative and still assume prerequisite APIs, IAM permissions, provider configuration, TLS certificate files in DER format, and working private connectivity to the external key manager. Cloud EKM monitoring metrics are currently documented as Preview by Google Cloud.
