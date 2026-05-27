# Validation Summary: How to Troubleshoot Common Cloud Build Permission Errors and IAM Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Build
- Google Cloud IAM
- Artifact Registry
- Container Registry
- Cloud Run
- Cloud Run functions / Cloud Functions
- Secret Manager
- Cloud Storage
- Google Kubernetes Engine
- VPC Service Controls
- Google Cloud CLI

## Sources Consulted
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build default service account change: https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates
- Configure user-specified Cloud Build service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Deploying to Cloud Run using Cloud Build: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Deploying to Cloud Run functions using Cloud Build: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-functions
- Cloud Run functions troubleshooting: https://docs.cloud.google.com/functions/docs/troubleshooting
- Cloud Run functions IAM documentation: https://cloud.google.com/functions/docs/concepts/iam
- Secret Manager with Cloud Build: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Artifact Registry IAM documentation: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Container Registry transition documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Cloud Build VPC Service Controls documentation: https://docs.cloud.google.com/build/docs/private-pools/using-vpc-service-controls
- Cloud Build GKE deployment documentation: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- GKE IAM and RBAC documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/iam
- gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- gcloud builds triggers create github reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- gcloud builds get-default-service-account reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- gcloud secrets add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/add-iam-policy-binding
- gcloud iam service-accounts add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding

## Issues Found
- The post described `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` as the default Cloud Build service account for every project. Current Cloud Build documentation says this is the legacy Cloud Build service account, and newer projects may use the Compute Engine default service account depending on organization settings. Updated the service account explanation and added guidance to replace `CB_SA` with the actual build identity.
- The post said Cloud Build uses the Compute Engine default service account for some operations. Updated this to clarify that Cloud Build may use it as the build identity and that Cloud Run / Cloud Run functions may use it as the runtime identity.
- The Container Registry guidance implied normal ongoing use of `gcr.io` Container Registry with Storage Admin. Container Registry writes are shut down; updated the text to distinguish legacy Container Registry buckets from `gcr.io` repositories hosted on Artifact Registry.
- The Cloud Functions runtime service account example used `${PROJECT_ID}@appspot.gserviceaccount.com`. Current Cloud Run functions documentation identifies the Compute Engine default service account as the default runtime service account. Updated the command to grant `roles/iam.serviceAccountUser` on `${PROJECT_NUMBER}-compute@developer.gserviceaccount.com` and noted additional roles often required for Cloud Run functions deployments.
- The GKE section only mentioned Google Cloud IAM. Added a note that Kubernetes RBAC may also be required inside the cluster.
- The VPC Service Controls section oversimplified the fix as adding Cloud Build to a service perimeter. Updated it to reflect Cloud Build's documented VPC Service Controls support through private pools, ingress/access rules, and compatible logging configuration.
- The diagnostic commands assumed the legacy Cloud Build service account. Added `CB_SA` and a `gcloud builds get-default-service-account` command so readers can identify the default build identity.
- The custom service account section omitted Cloud Build's log storage requirement for user-specified service accounts. Added `roles/logging.logWriter` for Cloud Logging and noted that user-specified service accounts cannot write to the default Cloud Build logs bucket.

## Review Notes
The `gcloud` and `gsutil` commands could not be tested locally because the Google Cloud CLI and gsutil are not installed in this workspace. Commands and flags were verified against official Google Cloud SDK and product documentation instead.
