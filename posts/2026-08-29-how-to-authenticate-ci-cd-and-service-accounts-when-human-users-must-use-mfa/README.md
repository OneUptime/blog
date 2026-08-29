# How to Authenticate CI/CD and Service Accounts When Human Users Must Use MFA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Service Account, Authentication, IAM, Security

Description: Authenticate non-human workloads with attested identity and short-lived scoped credentials while keeping human MFA and service authorization policies separate.

---

A build runner cannot responsibly type a TOTP code or approve a push. Giving it a human user's refresh token or a shared “MFA-exempt” password defeats attribution; storing a copied TOTP seed alongside another authenticator for the same human account also defeats factor independence.

Human MFA answers “which user account is authenticating and what authenticators did the claimant prove control of?” Workload authentication answers “which workload is making this request and what execution context did the trusted issuer attest?” Model those as distinct principal types with distinct controls.

## Prefer Federated Workload Identity

Modern CI systems can issue a short-lived signed OIDC token describing a job. A cloud or deployment security-token service validates that token and exchanges it for a narrowly scoped, short-lived credential. The pipeline stores no long-lived cloud secret.

Validate standard token properties and constrain trust using all relevant claims:

- exact trusted issuer and audience;
- repository or project identity;
- branch, tag, pull-request, or protected environment;
- workflow definition and reusable-workflow identity where available;
- organization/tenant and runner class;
- token expiry and a subject format the trust policy explicitly expects.

Do not accept any token from a trusted CI issuer merely because its signature is valid. An overly broad subject pattern can let an untrusted repository or pull request assume production access. Keep pull-request jobs from forks away from deployment identity and secrets.

For long-running services, use platform workload identity, mutually authenticated TLS, or a system such as SPIFFE/SPIRE. SPIRE attests workloads and issues SPIFFE Verifiable Identity Documents (SVIDs); for X.509-SVIDs, short-lived certificates and their private keys are delivered through a local Workload API and rotated automatically. Authorization still maps the workload identity to least privilege.

## Separate Human Approval from Workload Authentication

A deployment may require a human approver to authenticate with MFA. That approval should create an auditable release authorization bound to the artifact digest, environment, workflow, and expiry. It should not export the human's session or access token into the runner.

The runner then authenticates as its workload identity and presents the release authorization. The deployment service checks both independent facts:

```text
authorize_deploy(
  workload = "ci/release-workflow",
  artifact_digest = "sha256:...",
  environment = "production",
  approval = recent_mfa_approved_release
)
```

This preserves attribution: the audit trail can show who approved and which workload executed. A generic “MFA passed” flag without artifact and environment binding can be replayed or applied to the wrong release.

## Scope and Rotate Machine Credentials

Issue credentials just in time, with the smallest audience, permissions, and lifetime. Use separate identities for build, test, package publication, staging, and production. A production deployer normally does not need source-control administration or broad secret-read access.

Prefer proof-of-possession mechanisms where supported, such as mutual-TLS certificate-bound OAuth access tokens, to reduce replay of stolen access tokens. Protect CI logs, artifacts, caches, process lists, and debug traces; a five-minute token can still be damaging during those five minutes.

When federation is impossible and a static secret is temporarily necessary:

- create a dedicated non-human principal, never a human account;
- store the secret in the CI platform's protected secret store;
- restrict use to protected environments and trusted runners;
- scope it narrowly, rotate it automatically, and monitor every use;
- set an owner and an expiry date for migration to workload identity.

Do not embed TOTP seeds to make a machine imitate MFA. The seed becomes one more static shared secret, code generation is hard to attribute, and replay/rate-limit behavior becomes fragile.

## Bootstrap and Emergency Access

Workload identity still has a bootstrap trust problem. Protect the CI issuer configuration, trust-policy changes, runner registration, SPIRE entries, and deployment-role mappings with reviewed infrastructure changes and human phishing-resistant MFA. Separate who can edit a workflow from who can approve production.

Emergency credentials should be offline, time-bounded when activated, dual-controlled for high-impact systems, heavily monitored, and tested. “Break glass” is not an undocumented permanent service password.

## Threat Model and Failure Modes

Defend against repository compromise, malicious pull requests, stolen runner tokens, broad federation trust, compromised self-hosted runners, confused-deputy token exchange, workflow modification, and secret leakage through logs. Common failures include shared human accounts, wildcard subjects, long-lived cloud keys, using one identity across environments, trusting token claims without audience/issuer validation, and treating human approval as the runner credential.

## Rollout and Test Checklist

- Inventory human, CI job, runner, and runtime principals separately.
- Replace stored cloud keys with CI OIDC federation or platform workload identity.
- Pin issuer, audience, subject, repository, workflow, ref, and environment claims.
- Bind human MFA approval to artifact digest and destination, not a generic job.
- Use short lifetimes, narrow audiences, and distinct per-environment roles.
- Test forked pull requests, modified workflows, token replay, and runner compromise.
- Audit trust-policy changes and protect them with phishing-resistant human MFA.
- Give every fallback secret an owner, rotation, monitoring, and removal date.

## References

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication](https://datatracker.ietf.org/doc/html/rfc8705)
- [SPIFFE Concepts](https://spiffe.io/docs/latest/spiffe/concepts/)
- [SPIFFE Workload API](https://spiffe.io/docs/latest/spiffe-specs/spiffe_workload_api/)
- [GitHub Docs: OIDC in Cloud Providers](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Conclusion

Do not make automation impersonate a person completing MFA. Authenticate jobs and services with attested workload identity and short-lived scoped credentials, bind any human approval to the exact release, and keep bootstrap policy under strong reviewed human control.
