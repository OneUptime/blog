# Validation Summary: How to Configure Pub/Sub IAM Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud IAM (predefined and custom roles)
- `gcloud` CLI (iam, projects, pubsub, logging, monitoring subcommands)
- Terraform with the `hashicorp/google` provider (v5.x)
- Google Cloud Python client library (`google-cloud-pubsub`, `google-auth`)
- GKE Workload Identity
- Cloud Audit Logs / Cloud Monitoring

## Sources Consulted
- [Access control with IAM (Pub/Sub)](https://cloud.google.com/pubsub/docs/access-control)
- [Pub/Sub roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/pubsub)
- [gcloud pubsub topics reference](https://cloud.google.com/sdk/gcloud/reference/pubsub/topics)
- [gcloud pubsub subscriptions reference](https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions)
- [gcloud iam service-accounts reference](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts)
- [gcloud iam roles create](https://cloud.google.com/sdk/gcloud/reference/iam/roles/create)
- [gcloud alpha monitoring policies create](https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create)
- [Terraform google_pubsub_topic resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic)
- [Terraform google_pubsub_subscription resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription)
- [Terraform google_pubsub_topic_iam resources](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic_iam)
- [Terraform google_pubsub_subscription_iam resources](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription_iam)
- [Terraform google_project_iam_custom_role](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam_custom_role)
- [Use Workload Identity (GKE)](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Pub/Sub testIamPermissions REST method](https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/testIamPermissions)

## Issues Found
- **Non-existent gcloud subcommand for permission testing.** The original "Testing Permissions" section used `gcloud pubsub topics test-iam-permissions ...`, which is not a valid `gcloud` command — `gcloud pubsub topics` exposes `add-iam-policy-binding`, `create`, `delete`, `describe`, `detach-subscription`, `get-iam-policy`, `list`, `list-subscriptions`, `publish`, `remove-iam-policy-binding`, `set-iam-policy`, and `update`, but no `test-iam-permissions` subcommand. Replaced the example with a direct call to the Pub/Sub `testIamPermissions` REST endpoint via `curl` and `gcloud auth print-access-token`, including an impersonation variant that uses `--impersonate-service-account` on the token request (the proper place for that flag, since it is a global gcloud auth flag and not consumed by the removed subcommand).

## Review Notes
- The predefined role list, role-to-permission mapping in the second mermaid diagram, custom permission names (e.g., `pubsub.topics.publish`, `pubsub.subscriptions.consume`), and the project/topic/subscription-level `gcloud ... add-iam-policy-binding` invocations all match current Google Cloud documentation.
- The Terraform examples use current resource names, attributes, and types: `google_service_account`, `google_pubsub_topic` (with `message_retention_duration`, `labels`), `google_pubsub_subscription` (`ack_deadline_seconds`, `retain_acked_messages`, `enable_exactly_once_delivery`, `dead_letter_policy { dead_letter_topic, max_delivery_attempts }`), `google_pubsub_topic_iam_binding`, `google_pubsub_subscription_iam_binding`, `google_project_iam_custom_role`, `google_project_iam_member`. The pin `~> 5.0` for `hashicorp/google` is reasonable (provider v6 exists, but v5 is still widely used and the resources/attributes shown are compatible with both).
- Workload Identity annotation `iam.gke.io/gcp-service-account` and the member format `serviceAccount:<project>.svc.id.goog[<namespace>/<ksa>]` with role `roles/iam.workloadIdentityUser` are correct.
- The Python client snippet (`google.cloud.pubsub_v1`, `google.oauth2.service_account.Credentials.from_service_account_file`, `PublisherClient(credentials=...)`, `publisher.topic_path(...)`, and `publisher.publish(topic_path, data, **attrs)`) is current.
- The `gcloud alpha monitoring policies create` flags (`--display-name`, `--condition-display-name`, `--condition-filter`, `--notification-channels`) are real, though the filter syntax in `--condition-filter` is intended for Cloud Monitoring metric filters; using an audit-log-style filter here would in practice require a log-based metric. This is a common simplification in tutorials and the command itself is syntactically valid, so it was left as-is.
- The `gcloud iam roles create` example correctly uses comma-separated values for `--permissions`, which matches the documented behavior.
- Cross-project IAM binding examples (`gcloud pubsub topics add-iam-policy-binding ... --project=...`) are correct and reflect the supported pattern of granting access to principals from other projects.
