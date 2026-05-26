# Validation Summary: How to Use Ansible to Create GCP Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general Ansible collection
- Google Cloud Functions / Cloud Run functions
- Google Cloud CLI
- Google Cloud Storage
- Pub/Sub
- Eventarc
- Cloud Build
- Python
- Functions Framework for Python
- BigQuery Python client

## Sources Consulted
- Google Cloud CLI `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI `gcloud functions describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/describe
- Google Cloud CLI `gcloud functions delete` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/delete
- Cloud Run functions deployment documentation: https://docs.cloud.google.com/functions/docs/deploy
- Cloud Run functions runtime support schedule: https://docs.cloud.google.com/functions/docs/runtime-support
- Cloud Storage triggers for Cloud Run/Eventarc: https://cloud.google.com/run/docs/triggering/storage-triggers
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `community.general.archive` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/archive_module.html

## Issues Found
- The post listed Ansible 2.9+ while the current `google.cloud` collection documentation supports ansible-core 2.16.0 or newer. Updated the prerequisite.
- The packaging playbook used `ansible.builtin.archive`, but the current archive module for creating compressed archives is `community.general.archive`. Updated the module name and collection install command.
- The description claimed VPC connector coverage, but the post did not include any VPC connector examples. Updated the description to match the actual content.
- The prerequisites only enabled Cloud Functions and Cloud Build APIs, which is incomplete for second-generation Cloud Functions with Eventarc-based Pub/Sub and Cloud Storage triggers. Added Cloud Run, Artifact Registry, Eventarc, Pub/Sub, Cloud Storage, and Cloud Logging APIs.
- The source-code section stated that Cloud Functions expects source only as a Cloud Storage zip, but `gcloud functions deploy` also supports local directories and source repositories. Corrected the wording.
- The source upload example used a bucket without creating or checking it first. Added bucket existence and creation tasks before upload.
- The HTTP URL lookup used `httpsTrigger.url`, which is the first-generation field. Since the examples now consistently deploy second-generation functions, changed the lookup to `serviceConfig.uri` and added `--gen2`.
- The Pub/Sub and Cloud Storage handlers used CloudEvent-style Functions Framework decorators, but the deployment commands did not explicitly request second-generation functions. Added `--gen2` to deployment commands to match the handlers.
- The Pub/Sub playbook wrote files into `/tmp/{{ function_name }}` without creating that directory first. Added the directory task.
- The Pub/Sub topic idempotency checks only inspected stderr. Updated them to inspect stdout and stderr because Google Cloud CLI messages can appear in either stream.
- The Cloud Storage playbook wrote files into `/tmp/{{ function_name }}` without creating that directory first. Added the directory task.
- The Cloud Storage example imported `google.cloud.storage` and `vision` without providing corresponding dependencies, and neither client was needed. Removed the unused imports and used the CloudEvent payload size.
- The Cloud Storage trigger used legacy `--trigger-event=google.storage.object.finalize` and `--trigger-resource` syntax while the function body used CloudEvent payloads. Updated the deployment command to `--trigger-bucket` with `--gen2`.
- The multiple-functions example did not explicitly set the function generation. Added `--gen2` for consistency with the CloudEvent examples.

## Review Notes
- The examples still use `ansible.builtin.command`, so they are not fully idempotent for function deployments; each deploy task is marked changed. This is acceptable for a deployment tutorial but could be improved in a production playbook.
- The BigQuery example assumes the `analytics.user_events` dataset and table already exist and that the runtime service account has insert permissions.
- The storage-triggered function assumes the trigger bucket already exists and is compatible with the function and trigger location requirements.
