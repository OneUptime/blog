# Fix `iam.serviceAccounts.actAs` for Cloud Run Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Run, IAM, Service Account, Security

Description: Grant a Cloud Run deployer the narrowly scoped Service Account User role required to attach a custom runtime service identity.

---

A Cloud Run service identity is a service account that is both a resource and a principal in the deployment model:

- As a resource, it can be attached to a Cloud Run revision only by a deployer with `iam.serviceAccounts.actAs` on that service account.
- As a principal, it receives the API permissions that the running container needs.

An error mentioning `iam.serviceAccounts.actAs` concerns the resource side of this model. Granting more runtime API access to the service account does not let a deployer attach it.

## Identify the deployment scope and identities

Set the deployment project, deployer, and runtime identity explicitly:

```bash
RUN_PROJECT_ID='example-run-project'
REGION='us-central1'
SERVICE='orders-api'
RUNTIME_SA='orders-runtime@example-run-project.iam.gserviceaccount.com'
SA_PROJECT_ID='example-run-project'
DEPLOYER_MEMBER='user:developer@example.com'
```

For CI, the deployer member commonly looks like this:

```text
serviceAccount:cloud-run-deployer@example-cicd-project.iam.gserviceaccount.com
```

Confirm the active gcloud identity before testing an interactive deployment:

```bash
gcloud auth list --filter=status:ACTIVE \
  --format='value(account)'
```

Do not grant `actAs` to the runtime service account itself unless it is genuinely also the deployer. The permission belongs to the principal creating or updating the Cloud Run revision.

## Grant Service Account User on the runtime identity

The predefined Service Account User role contains `iam.serviceAccounts.actAs`. Grant it on the specific runtime service account:

```bash
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --project="${SA_PROJECT_ID}" \
  --member="${DEPLOYER_MEMBER}" \
  --role='roles/iam.serviceAccountUser'
```

This service-account-level grant is narrower than granting Service Account User across the project. An IAM administrator should apply it according to the organization's separation-of-duties policy.

The deployer also needs permissions for the deployment operation. Google's documented roles for deploying an existing container include Cloud Run Developer on the Cloud Run service, Artifact Registry Reader on the image repository, and Service Account User on the service identity. When creating a new service, grant Cloud Run Developer at the project level because the service does not exist yet. These are separate grants on separate resources.

## Deploy with the intended identity

Use explicit project, region, image, and service account values:

```bash
IMAGE='us-central1-docker.pkg.dev/example-run-project/app-images/orders:2026-08-27'

gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --service-account="${RUNTIME_SA}" \
  --region="${REGION}" \
  --project="${RUN_PROJECT_ID}"
```

After deployment, inspect the exported service configuration:

```bash
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${RUN_PROJECT_ID}" \
  --format=export
```

Confirm `serviceAccountName` is the expected email address. IAM policy changes can require propagation time, so retry after the binding has propagated before changing other roles.

## Grant runtime permissions separately

The Cloud Run container uses `RUNTIME_SA` when it calls Google Cloud APIs. Grant that service account only the roles its code needs on target resources. Examples might include access to one Secret Manager secret, one Pub/Sub subscription, or one Cloud SQL instance.

`roles/iam.serviceAccountUser` does not give the runtime identity access to those services. Conversely, roles such as Secret Manager Secret Accessor do not give the deployer `iam.serviceAccounts.actAs`.

Avoid using the Compute Engine default service account for unrelated services. Dedicated runtime identities reduce permission sharing and make audit logs clearer.

## Handle a cross-project service account

When the runtime service account is in a different project from the Cloud Run service, two additional controls apply.

First, grant the Cloud Run service agent from the Cloud Run resource project the Service Account Token Creator role on the runtime service account:

```bash
RUN_PROJECT_NUMBER="$(
  gcloud projects describe "${RUN_PROJECT_ID}" \
    --format='value(projectNumber)'
)"

RUN_SERVICE_AGENT="service-${RUN_PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --project="${SA_PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_AGENT}" \
  --role='roles/iam.serviceAccountTokenCreator'
```

Use the Cloud Run project's number, not the service account project's number, to construct the service-agent address.

Second, the project containing the service account must not enforce the `iam.disableCrossProjectServiceAccountUsage` organization policy constraint. That constraint is enforced by default and can be configured only at the project level, not at the folder, organization, or individual service-account level. Disabling enforcement removes this organization-policy block for every service account in `SA_PROJECT_ID`, so have the organization-policy administrator review the project-wide exception rather than disabling it casually.

The Cloud Run service agent must also retain `roles/run.serviceAgent` in the Cloud Run project. Do not replace that service-agent role with a grant to the runtime identity.

## Common incorrect fixes

- Granting Service Account User to the runtime service account rather than to the deployer.
- Granting the role on a different service account with a similar name.
- Granting the role in the Cloud Run project when the service account resource is in another project.
- Giving the deployer Owner to bypass a narrow missing permission.
- Granting runtime data roles to the deployer or deployment roles to the runtime identity.
- Using a service account key to avoid IAM attachment checks.

Service account impersonation, attaching a service account to a resource, and running as that service account are related but distinct operations. Follow the exact principal and resource named in the denial.

## Official Documentation

- [Configure Cloud Run service identity](https://cloud.google.com/run/docs/configuring/services/service-identity)
- [Cloud Run deployment permissions](https://cloud.google.com/run/docs/reference/iam/roles#additional-configuration)
- [Attach service accounts to resources](https://cloud.google.com/iam/docs/attach-service-accounts)
- [Troubleshoot Cloud Run deployment permissions](https://cloud.google.com/run/docs/troubleshooting#sa-missing-permissions)
- [Cloud Run service agent role](https://cloud.google.com/iam/docs/roles-permissions/run#run.serviceAgent)

## Conclusion

Fix the `actAs` error by granting the deployer `roles/iam.serviceAccountUser` on the exact runtime service account. Keep the deployer's deployment permissions separate from the runtime identity's API permissions. For a cross-project identity, also configure the Cloud Run service agent and organization-policy control explicitly.
