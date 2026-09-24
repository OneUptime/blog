# How to Protect Application and System Account Credentials Under PCI DSS 4.0.1

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Secret Management

Description: Separate interactive service-account restrictions from all-account password controls, manage secrets outside source code, and validate rotation without losing attribution.

---

A payment service's database credential may have no named human owner in the login screen, yet people can often retrieve or reuse it. That makes application and system accounts easy places for access to become broader and less accountable than intended.

PCI DSS v4.0.1 addresses these accounts explicitly. Start by separating whether an account can be used interactively from how its credential is stored and rotated.

## Classify every account before assigning controls

Inventory the identity, technical owner, business purpose, consuming applications, privileges, authentication method, storage locations, and rotation mechanism. Include migration jobs, deployment pipelines, scheduled reports, monitoring integrations, and emergency automation.

Then determine whether a person can authenticate using the account. A database account can be interactive even if it has no operating-system shell. Calling it a service account does not prevent someone from using the same password through a database client.

The [PCI DSS v4.0.1 standard](https://www.pcisecuritystandards.org/document_library/) distinguishes the following:

| Requirement | Applicable distinction |
|---|---|
| 8.6.1 | Controls interactive use of application and system accounts |
| 8.6.2 | Prohibits hard-coded passwords for accounts that can be used interactively |
| 8.6.3 | Protects passwords for all application and system accounts through periodic changes and appropriate complexity |

This distinction avoids treating every service account as a human user while also avoiding an unjustified exemption for unattended credentials.

## Prevent ordinary interactive use

Under 8.6.1, interactive use is reserved for exceptional circumstances. It needs a documented business justification, explicit management approval, a limited duration, identity confirmation, and actions attributable to the individual.

Implement that through a controlled access path. A human should authenticate with their own identity before obtaining exceptional access; the evidence should connect that person to the resulting session and actions.

Do not use a shared password in a team chat as the attribution mechanism. Logging only the service-account name cannot show which individual acted.

For accounts that should never be interactive, use available platform restrictions to enforce that design and verify it. Disabling a shell is useful for a host account, but it says nothing about whether the same credential can access a database or API.

## Remove credentials from code and deployment artifacts

Requirement 8.6.2 prohibits hard-coding passwords or passphrases for interactive-capable application and system accounts in scripts, configuration or property files, and bespoke or custom source code. Its applicability notes also point to protection of stored passwords under 8.3.2.

As an engineering practice, externalize credentials for all workloads where feasible. Store references to secrets in deployment configuration, obtain the value through an authorized runtime identity, and restrict who can retrieve or replace it.

Inspect more than the current repository:

- Repository history and old release branches.
- Build logs and test output.
- Container image layers and package archives.
- Deployment manifests and rendered configuration.
- Crash dumps, diagnostics, and support attachments.

Removing a secret from the latest commit does not revoke a value already exposed. Rotate or revoke compromised credentials and investigate their use.

## Protect the secret delivery mechanism

A secrets manager is part of the access design, not a substitute for one. Restrict retrieval to the intended workload, scope administrative permissions, protect network connections, and log access without logging values.

Kubernetes [documents that Secrets are stored unencrypted in etcd by default](https://kubernetes.io/docs/concepts/configuration/secret/) unless encryption at rest is configured. Base64 encoding is not encryption. Kubernetes also warns that users able to create Pods in a namespace can often arrange to consume its Secrets.

Therefore review both direct Secret-read permissions and indirect access through workload creation, execution, or node administration. A narrow-looking Secret policy can be undermined by broad permissions elsewhere.

Prevent secrets from appearing in environment dumps and troubleshooting output. If a workload must receive a secret, its runtime and diagnostic access also need scrutiny.

## Define and prove rotation

Requirement 8.6.3 applies periodic password changes at the frequency justified by a targeted risk analysis under 12.3.1, plus changes when compromise is suspected or confirmed. Password complexity must suit the chosen change frequency.

There is no universal 90-day service-account password interval in this requirement. Explain the selected interval using the account's privileges, storage protection, number of people with access, interactive capability, and exposure.

Build a rotation sequence that reaches every consumer:

1. Prepare the replacement credential and approved rollout.
2. Update the consumers through the protected delivery mechanism.
3. Verify new authentication succeeds.
4. Revoke the previous credential.
5. Verify old authentication fails and no forgotten consumer still depends on it.

Where a platform supports overlapping credentials, keep that overlap bounded. Without revocation, adding a new secret only increases the number of valid secrets.

## Review access and evidence together

Requirements 7.2.5 and 7.2.5.1 cover appropriate privileges and periodic review for application and system accounts. Include orphaned credentials, unused grants, and departed owners in that review.

Keep the account inventory, risk analysis, secret-access policy, exceptional-session records, and rotation outcomes linked. Record credential identifiers or versions rather than the values themselves.

A well-controlled system account has an explainable purpose, minimal access, a protected credential lifecycle, and human attribution whenever someone uses it interactively.
