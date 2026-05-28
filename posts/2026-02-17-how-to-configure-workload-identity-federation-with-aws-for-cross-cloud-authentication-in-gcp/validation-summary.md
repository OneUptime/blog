# Validation Summary: How to Configure Workload Identity Federation with AWS for Cross-Cloud Auth in

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Workload Identity Federation
- Google Cloud IAM and service account impersonation
- Google Cloud CLI
- AWS IAM roles
- AWS Security Token Service
- Python Google Cloud Storage client library
- Node.js Google Cloud Storage client library
- Application Default Credentials

## Sources Consulted
- Google Cloud IAM: Configure Workload Identity Federation with AWS or Azure VMs: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud IAM: Workload Identity Federation overview: https://docs.cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud SDK: gcloud iam workload-identity-pools providers create-aws: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-aws
- Google Cloud SDK: gcloud iam workload-identity-pools create-cred-config: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config
- Google Cloud SDK: gcloud auth login: https://cloud.google.com/sdk/gcloud/reference/auth/login
- Google Cloud Authentication: Authenticate for using client libraries: https://docs.cloud.google.com/docs/authentication/client-libraries
- AWS CLI: sts get-caller-identity: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
- The original flow described AWS STS returning a signed AWS token to the workload. Workload Identity Federation for AWS uses a signed GetCallerIdentity request as the subject token, and Google validates that request with AWS STS. Updated the diagram and explanation.
- The credential configuration command omitted `--enable-imdsv2`, which Google recommends for AWS IMDSv2-based EC2 metadata flows. Added the flag and the corresponding `imdsv2_session_token_url` field to the sample generated JSON.
- The AWS IAM step said the workload role needs an explicit `sts:GetCallerIdentity` permission policy. AWS documents that no permissions are required for this operation. Replaced the policy snippet with a note that the role is needed for discoverable AWS credentials, not for an explicit GetCallerIdentity allow.
- The security example used an exact ARN comparison ending at the role path, which would not match real assumed-role ARNs that include a session name. Changed the example to use the mapped `attribute.aws_role`.

## Review Notes
The Python, Node.js, `gcloud auth login --cred-file`, service account binding, provider creation, and credential configuration examples are consistent with current official documentation. The post uses service account impersonation; Google also supports direct resource access for some APIs, but that is outside this tutorial's chosen path.
