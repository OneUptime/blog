# Validation Summary: How to Pass Backend Credentials via Environment Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu backends
- AWS S3
- Azure Blob Storage (`azurerm` backend)
- Google Cloud Storage (`gcs` backend)
- Consul
- PostgreSQL
- HTTP remote state backends
- Kubernetes
- GitHub Actions
- AWS Secrets Manager
- HashiCorp Vault
- Google Cloud Secret Manager

## Sources Consulted
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu AzureRM backend docs: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu GCS backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu Consul backend docs: https://opentofu.org/docs/language/settings/backends/consul/
- OpenTofu PostgreSQL backend docs: https://opentofu.org/docs/language/settings/backends/pg/
- OpenTofu HTTP backend docs: https://opentofu.org/docs/language/settings/backends/http/
- OpenTofu Kubernetes backend docs: https://opentofu.org/docs/language/settings/backends/kubernetes/
- AWS Secrets Manager CLI docs: https://docs.aws.amazon.com/en_us/secretsmanager/latest/userguide/retrieving-secrets_cli.html
- Vault `login` command docs: https://developer.hashicorp.com/vault/docs/commands/login
- Vault `kv get` command docs: https://developer.hashicorp.com/vault/docs/commands/kv/get
- Google Cloud Secret Manager access docs: https://cloud.google.com/secret-manager/docs/access-secret-version
- GitHub Actions OIDC for AWS docs: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws?apiVersion=2022-11-28
- `aws-actions/configure-aws-credentials` repository: https://github.com/aws-actions/configure-aws-credentials
- `opentofu/setup-opentofu` repository: https://github.com/opentofu/setup-opentofu
- PostgreSQL libpq connection string docs: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The introduction and conclusion overstated backend support by saying every OpenTofu backend accepts credentials through environment variables. I tightened that language to match the OpenTofu backend configuration guidance.
- The S3 section listed `AWS_S3_BUCKET` as a supported backend environment variable. OpenTofu documents environment variables for S3 credentials and region, but not for `bucket`, so I removed that example.
- The GCS section treated `GOOGLE_CREDENTIALS` as inline JSON and listed `GOOGLE_PROJECT` and `GOOGLE_REGION` as backend credential variables. OpenTofu documents `GOOGLE_BACKEND_CREDENTIALS` and `GOOGLE_CREDENTIALS` as credential file paths, and the project/region variables are not backend credential settings, so I corrected that block.
- The Kubernetes section used `KUBE_CONTEXT`, but the documented environment variable for backend kubeconfig context selection is `KUBE_CTX`. I corrected the name and changed the kubeconfig path example to `$HOME/.kube/config`.
- The AWS Secrets Manager example exported `TF_VAR_*` variables, which affect OpenTofu input variables rather than backend credentials. I changed the script to export `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` directly.
- The Vault example used `vault login -method=aws -token-only` as a generic one-liner, which is not a reliable drop-in example because AWS auth commonly needs additional method-specific parameters. I changed the snippet to assume the user is already authenticated to Vault and kept the credential extraction example.
- The GCP Secret Manager example exported the retrieved secret JSON directly into `GOOGLE_CREDENTIALS`. The documented GCS backend behavior expects a credentials file path, so I changed the example to write the secret to a temporary file and export `GOOGLE_BACKEND_CREDENTIALS` with that path.
- The GitHub Actions example would not run as shown because OIDC requires `permissions.id-token: write`, and the workflow also lacked repository checkout and OpenTofu installation before `tofu init`. I added the required permission, added `actions/checkout` and `opentofu/setup-opentofu`, and updated `aws-actions/configure-aws-credentials` from `v4` to the current major version `v6`.

## Review Notes
- The post covers a representative set of common backends, not every built-in OpenTofu backend.
- The GitHub Actions example depends on external actions whose major versions can change over time; those references should be rechecked during future reviews.
