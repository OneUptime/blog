# Validation Summary: How to Configure Key Access Justifications for Transparency in Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Key Access Justifications
- Google Cloud Assured Workloads
- Cloud KMS
- Cloud External Key Manager
- Cloud Audit Logs and log-based metrics
- Cloud Monitoring alerting policies
- BigQuery log export analysis

## Sources Consulted
- Google Cloud Key Access Justifications overview: https://docs.cloud.google.com/assured-workloads/key-access-justifications/docs/overview
- Google Cloud Key Access Justifications reason codes: https://docs.cloud.google.com/assured-workloads/key-access-justifications/docs/justification-codes
- Google Cloud view and act on justifications: https://docs.cloud.google.com/assured-workloads/key-access-justifications/docs/view-justifications
- Google Cloud configure Key Access Justifications with Cloud KMS and Cloud HSM: https://docs.cloud.google.com/assured-workloads/key-access-justifications/docs/configure-kaj
- Google Cloud External Key Manager overview: https://docs.cloud.google.com/kms/docs/ekm
- Google Cloud create an EKM connection: https://docs.cloud.google.com/kms/docs/create-ekm-connection
- Google Cloud create an external key: https://docs.cloud.google.com/kms/docs/create-external-key
- gcloud kms ekm-connections create reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/ekm-connections/create
- gcloud kms keys create reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- gcloud kms keys versions create reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Cloud KMS audit logging reference: https://docs.cloud.google.com/kms/docs/audit-logging
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The prerequisites enabled `ekms.googleapis.com`, but the official setup flow requires enabling the Cloud KMS API. Removed the nonessential API enable command and clarified that KAJ availability is tied to Assured Workloads control packages.
- The EKM connection command used the incorrect `--server-certificates-pem-file` flag. Changed it to the documented `--server-certificates-files` flag.
- The setup mixed an EKM-over-VPC connection with an `external` protection-level key and `--external-key-uri`, which is the internet-based EKM flow. Updated the key to `--protection-level=external-vpc`, added `--crypto-key-backend`, and changed the version command to use `--ekm-connection-key-path` with `--primary`.
- The sample KAJ policy used non-Cloud-KMS field names such as `allowed_justifications`, `denied_justifications`, and `default_action`. Replaced it with the documented `keyAccessJustificationsPolicy.allowedAccessReasons` structure and clarified that non-allowed reasons are denied.
- The policy example omitted Google's recommended `CUSTOMER_AUTHORIZED_WORKFLOW_SERVICING` reason. Added it to reduce outage risk for otherwise customer-authorized workflows when a more precise reason cannot be generated.
- The audit log examples used the outdated `protoPayload.serviceData.keyAccessJustification` field. Updated the logging filters and BigQuery query to use `protoPayload.metadata.entries.key_access_justification.reason`.
- The alerting policy command used unsupported threshold flags for `gcloud monitoring policies create`. Replaced them with the documented `--duration` and `--if='> 0'` flags.

## Review Notes
The post is now technically aligned with the Cloud EKM over VPC workflow it describes. Availability of KAJ enforcement and supported key types still depends on the chosen Assured Workloads control package and the external key manager's KAJ support.
