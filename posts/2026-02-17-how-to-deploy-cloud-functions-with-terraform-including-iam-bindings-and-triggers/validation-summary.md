# Validation Summary: How to Deploy Cloud Functions with Terraform Including IAM Bindings and Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions Gen 2 / Cloud Run functions
- Terraform
- Google Cloud IAM
- Eventarc
- Pub/Sub
- Cloud Storage
- Secret Manager
- Serverless VPC Access

## Sources Consulted
- Google Cloud Functions Gen 2 Terraform provider resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Google Cloud Run functions deployment documentation: https://docs.cloud.google.com/run/docs/deploy-functions
- Google Cloud Run Eventarc trigger documentation: https://docs.cloud.google.com/run/docs/triggering/trigger-with-events
- Eventarc roles and permissions documentation: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Cloud Functions IAM roles documentation: https://cloud.google.com/functions/docs/reference/iam/roles
- Terraform Google provider Serverless VPC Access connector documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/vpc_access_connector
- Terraform Archive provider archive_file data source documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Terraform CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands
- Google Cloud Secret Manager and Cloud Run secrets documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets

## Issues Found
- The Terraform configuration used the `archive_file` data source without declaring the `hashicorp/archive` provider. Added the provider declaration so the packaging examples are explicit and reproducible.
- The API enablement list omitted `pubsub.googleapis.com`, which is required for the Pub/Sub topic and Pub/Sub-triggered function examples. Added it.
- The VPC connector example referenced `google_vpc_access_connector.connector` without defining it, and the VPC Access API was not enabled. Added `vpcaccess.googleapis.com`, a connector resource, and a variable for the VPC network.
- The HTTP function snippet referenced `var.allowed_origins`, `google_secret_manager_secret.db_password`, and a latest secret version without defining the variable, secret, or version. Added the missing variable and Secret Manager resources.
- The Pub/Sub Eventarc trigger service account only had `roles/eventarc.eventReceiver`. Added `roles/run.invoker`, because Eventarc trigger identities must be able to invoke the Cloud Run function target.
- The Cloud Storage-triggered example referenced buckets, the image resizer service account, and packaged source objects that were not defined. Added those resources.
- The Cloud Storage-triggered example granted the Cloud Storage service account `roles/pubsub.publisher`, which is correct for direct Cloud Storage events, but the Eventarc trigger service account also needed Eventarc receiver and Cloud Run invoker permissions. Added those IAM bindings.
- The image resizer function needs permissions to read and write Cloud Storage objects. Added a storage object IAM binding for its runtime service account.

## Review Notes
The snippets are now technically consistent with the documented Terraform resources and IAM requirements. In a production implementation, scope storage permissions to specific buckets where possible instead of granting project-wide object administration, and avoid passing real secret values on the Terraform command line.
