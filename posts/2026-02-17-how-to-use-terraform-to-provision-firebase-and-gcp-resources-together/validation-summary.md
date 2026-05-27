# Validation Summary: How to Use Terraform to Provision Firebase and GCP Resources Together

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Google and Google Beta Terraform providers
- Firebase project management
- Firebase Authentication / Google Cloud Identity Platform
- Cloud Firestore
- Firebase Web Apps
- Cloud Run
- Google Cloud IAM
- Cloud Storage and Cloud Storage for Firebase
- Firebase CLI

## Sources Consulted
- Firebase documentation: Get started with Terraform and Firebase, https://firebase.google.com/docs/projects/terraform/get-started
- Terraform Registry: google_firebase_project, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebase_project
- Terraform Registry: google_identity_platform_config, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/identity_platform_config
- Terraform Registry: google_firestore_database, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database
- Terraform Registry: google_firebase_web_app, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebase_web_app
- Terraform Registry: google_cloud_run_v2_service, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Registry: google_storage_bucket, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Registry: google_firebase_storage_bucket, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebase_storage_bucket
- Terraform documentation: GCS backend, https://developer.hashicorp.com/terraform/language/settings/backends/gcs
- Terraform documentation: provisioners and local-exec, https://developer.hashicorp.com/terraform/language/provisioners
- Google Cloud SDK documentation: gcloud services enable, https://cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud documentation: Cloud Run Admin API, https://docs.cloud.google.com/run/docs/reference/rest
- Google Cloud documentation: IAM API, https://docs.cloud.google.com/iam/docs/reference/rpc

## Issues Found
- The prerequisites listed only a subset of the APIs required by the examples. Added Service Usage, Cloud Run, IAM, Cloud Storage, Cloud Storage for Firebase, and Firebase Rules APIs because the post provisions or deploys resources that depend on those services.
- The provider configuration used Firebase beta resources but did not include the recommended `user_project_override = true` setting for Firebase project resources. Added it to the `google-beta` provider configuration.
- The configuration used `null_resource` without declaring the `hashicorp/null` provider. Added an explicit provider requirement so the example is complete and reproducible.
- The Cloud Storage section created only a `google_storage_bucket`, which provisions a GCS bucket but does not by itself make the bucket available to Firebase SDKs, Firebase Authentication, and Firebase Security Rules. Added a `google_firebase_storage_bucket` association and switched the bucket resource to the beta provider to match the Firebase Terraform examples.

## Review Notes
- The Firestore rules example using `null_resource` and `firebase deploy` is technically valid, but Firebase also documents Terraform-native Firebase Rules resources (`google_firebaserules_ruleset` and `google_firebaserules_release`) for Firestore and Storage rules.
- The GCS backend bucket must already exist before `terraform init`; this is correct but may be worth calling out in a future editorial pass.
