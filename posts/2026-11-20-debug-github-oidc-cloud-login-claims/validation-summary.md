# Validation summary

Reviewed separation of issuance, token exchange and resource authorization; exact subject changes; reusable-workflow caller/callee claims; and credential-safe diagnostics.

## Checks

- Twelve local Python 3.11.13 checks passed for claim selection, audience handling, malformed input, mocked HTTP request/output, and redirect rejection
- Published Python exactly matches tested helper
- YAML parsed with PyYAML 6.0.2; shell syntax checked
- Mermaid eight nodes/seven edges structurally checked
- Generated social image visually reviewed, readable and unclipped

## Limitations

- No GitHub token requested or cloud login attempted
- No JWT signature verification; helper decodes diagnostic fields only
- HTTP retrieval mocked; live runner connectivity and cloud trust enforcement not tested
- Mermaid not rendered

## Sources checked

- https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- https://docs.github.com/en/actions/reference/security/oidc#methods-for-requesting-the-oidc-token
- https://docs.python.org/3.11/library/urllib.request.html
- https://docs.python.org/3.11/library/base64.html
- https://github.com/aws-actions/configure-aws-credentials/tree/v5.1.0
- https://github.com/Azure/login/tree/v2.3.0
- https://github.com/google-github-actions/auth/tree/v3.0.0
- https://docs.github.com/en/actions/reference/security/oidc#example-subject-claims
- https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-github-immutable-subjects
- https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows
- https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-considerations
- https://docs.cloud.google.com/iam/docs/troubleshooting-workload-identity-federation

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
