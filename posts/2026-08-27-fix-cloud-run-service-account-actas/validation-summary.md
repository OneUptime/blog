# Validation Summary: How to Fix `iam.serviceAccounts.actAs` When Deploying Cloud Run with a Custom Service Account

## Status

validated

## Post Type

Troubleshooting Guide

## Technologies Covered

- Google Cloud Run services, revisions, service identities, and service agents
- Google Cloud Identity and Access Management (IAM)
- Google Cloud service accounts and IAM allow policies
- Artifact Registry
- Google Cloud Organization Policy Service
- Google Cloud CLI (`gcloud`)
- Bash and zsh shell syntax

## Sources Consulted

- [Configure service identity for Cloud Run services](https://cloud.google.com/run/docs/configuring/services/service-identity) - the service identity's resource and principal functions, `roles/iam.serviceAccountUser`, `serviceAccountName`, and the Cloud Run-specific cross-project procedure.
- [Cloud Run deployment permissions](https://cloud.google.com/run/docs/reference/iam/roles#additional-configuration) - the Cloud Run Developer, Artifact Registry Reader, and Service Account User grants and their underlying permissions.
- [Deploy container images to Cloud Run](https://cloud.google.com/run/docs/deploying) - deployment-role requirements, supported image URI forms, and new-service versus new-revision behavior.
- [Cloud Run services create method](https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/create) - the requirement for `run.services.create` on the parent project and location when creating a service.
- [Attach service accounts to resources](https://cloud.google.com/iam/docs/attach-service-accounts) - `iam.serviceAccounts.actAs`, service-account-level role grants, cross-project Token Creator grants, and the project-only organization-policy controls.
- [Roles for service account authentication](https://cloud.google.com/iam/docs/service-account-permissions) and the [service accounts overview](https://cloud.google.com/iam/docs/service-account-overview) - the distinction between a service account as a principal and as a resource, and the difference between attachment and impersonation permissions.
- [Troubleshoot missing Cloud Run service-account permissions](https://cloud.google.com/run/docs/troubleshooting#sa-missing-permissions) - the documented `actAs` denial and its Service Account User resolution.
- [Cloud Run Service Agent role](https://cloud.google.com/iam/docs/roles-permissions/run#run.serviceAgent) - the purpose and permissions of `roles/run.serviceAgent`.
- [`gcloud iam service-accounts add-iam-policy-binding`](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding) - positional service-account identifiers, IAM member syntax, role flags, and the global `--project` flag.
- [`gcloud run deploy`](https://cloud.google.com/sdk/gcloud/reference/run/deploy) and [`gcloud run services describe`](https://cloud.google.com/sdk/gcloud/reference/run/services/describe) - the `--image`, `--service-account`, `--region`, `--project`, and `--format=export` usage shown in the post.
- [`gcloud auth list`](https://cloud.google.com/sdk/gcloud/reference/auth/list) and [project metadata lookup](https://cloud.google.com/resource-manager/docs/view-update-projects) - the active-account filter and `value(projectNumber)` projection.
- [IAM access-change propagation](https://cloud.google.com/iam/docs/access-change-propagation) - eventual consistency and propagation time for IAM policy changes.

## Issues Found

1. **The introduction incorrectly called the service identity's resource and principal functions “IAM roles.”** IAM roles are permission collections; resource and principal are the two capacities in which the service account participates. Changed the introduction to use Google's resource/principal terminology and changed “the first role” to “the resource side of this model.”
2. **The heading “Identify all three principals” counted the deployment project as a principal.** A project is a resource scope, while the deployer and runtime service account are principals. Renamed the heading to “Identify the deployment scope and identities.”
3. **The deployment-role scope did not distinguish creating a service from updating one.** An existing service can carry a service-level Cloud Run Developer grant, but `run.services.create` is checked on the parent when the named service does not yet exist. Added the project-level requirement for creating a new service.
4. **The organization-policy guidance implied that the cross-project exception could be narrowly scoped below a project.** The legacy `iam.disableCrossProjectServiceAccountUsage` constraint is enforced by default and can be configured only at the service-account project level. Clarified that disabling enforcement removes this policy block for every service account in `SA_PROJECT_ID` and that the exception is project-wide.
5. **The Cloud Run deployment-permissions URL used a stale fragment.** The current page has no `deployment_permissions` anchor. Updated it to the current `additional-configuration` anchor for the Deployment permissions section.
6. **The “Attach service accounts to resources” link targeted a different legacy-enforcement page.** Replaced `/iam/docs/service-accounts-actas` with the current attachment guide, which directly documents `actAs`, resource-level bindings, and cross-project controls.
7. **The Cloud Run troubleshooting URL used a stale fragment.** The current page has no `service-account` anchor. Updated it to `sa-missing-permissions`, the section that documents the relevant service-account permission failure.

## Review Notes

- All shell snippets are syntactically valid in Bash and zsh. The shown `gcloud` commands, flags, IAM member strings, role identifiers, Artifact Registry image URI, and `projectNumber` projection are current and non-deprecated.
- The cross-project binding correctly grants `roles/iam.serviceAccountTokenCreator` on the runtime service account to the Cloud Run resource project's service agent, constructed with the Cloud Run project number. The service agent's separate `roles/run.serviceAgent` grant remains in the Cloud Run project.
- `gcloud auth list` correctly reports the selected credentialed account. If service account impersonation is configured through a flag, property, or environment variable, the impersonated account is the effective deployer and should be checked separately.
- Disabling `iam.disableCrossProjectServiceAccountUsage` creates a project lien. Google additionally recommends enforcing `iam.restrictCrossProjectServiceAccountLienRemoval`; this is a security-hardening recommendation rather than a prerequisite for resolving `actAs`.
- The post does not pin a Google Cloud CLI or API version. The reviewed commands use generally available interfaces documented as of the validation date.
