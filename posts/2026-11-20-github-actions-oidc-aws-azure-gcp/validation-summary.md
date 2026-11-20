# Validation summary

Reviewed the separate trust and resource-permission boundaries, current GitHub subject formats, pinned action input schemas, and credential handling. Examples are source-verified configuration, not live login results.

## Checks

- YAML and two JSON documents parsed using Python/PyYAML 6.0.2
- Four action commit hashes resolved from official GitHub tags; all workflow inputs match downloaded action.yml schemas
- Three protected jobs and job-scoped id-token permissions checked; shell syntax passed
- Mermaid seven nodes and six edges structurally checked
- Social image generated and visually reviewed; title readable and unclipped

## Limitations

- No GitHub Actions execution or cloud token exchange
- No cloud trust-policy deployment or IAM enforcement test
- Hosted runner tools not executed; no actionlint or cloud-side policy validation
- Mermaid not rendered

## Sources checked

- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/security/oidc
- https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust
- https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- https://learn.microsoft.com/en-us/cli/azure/account#az-account-show
- https://github.com/aws-actions/configure-aws-credentials/tree/v5.1.0
- https://github.com/Azure/login/tree/v2.3.0
- https://github.com/google-github-actions/auth/tree/v3.0.0
- https://github.com/google-github-actions/auth/blob/v3.0.0/action.yml

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
