# How to Capture Incident Commands and Evidence Without Leaking Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Security, Observability, SRE

Description: Preserve incident commands, outcomes, and evidence with explicit capture boundaries, restricted originals, and reviewed summaries that keep credentials and customer data out of broad channels.

A terminal transcript can explain an outage and create a second incident at the same time. Debug output may contain credentials, connection strings, customer records, or signed URLs. Copying the transcript into chat distributes those values to notification previews, integrations, exports, and future postmortem readers.

Capture the operational evidence you need, then publish a reviewed summary designed for its audience. OWASP recommends excluding or protecting tokens, passwords, connection strings, and other sensitive values in logs, and restricting access to retained log data. Apply the same principle to incident evidence. [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Decide What Each Audience Needs

Separate three records:

| Record | Purpose | Typical access |
| --- | --- | --- |
| Restricted evidence | Original observations needed for investigation | Assigned investigators |
| Incident action log | Who did what, where, when, and with what outcome | Incident responders |
| Postmortem narrative | Failure mechanism, impact, decisions, and improvements | Approved review audience |

An evidence store still needs a collection boundary. “Restricted” does not mean it is appropriate to dump every environment variable or database row into it. Collect the smallest scope that supports the investigation, under the organization's retention and access policy.

## Record the Action, Not the Credential

Use a structured entry instead of copying shell history:

```text
Action: A-19
Operator: assigned on-call identity
Time: 2026-09-29T10:14:22Z
Target: production EU checkout deployment
Purpose: inspect rollout availability before choosing mitigation
Command template: kubectl --context <verified-context> -n <namespace>
                  get deployment <deployment> -o json
Parameters retained: context alias, namespace, deployment, tool version
Result: available replicas 4; desired replicas 8; exit status 0
Evidence: E-27, restricted object; selected fields reviewed
Decision: hold rollout; further checks assigned to operations
```

For a mutation, also record the approval or delegated authority, previous state, change identifier, verification result, and rollback reference. Authentication should come from the approved credential mechanism rather than a token embedded in the command text.

Record failure too. A nonzero exit status may explain why a mitigation never happened. Avoid assuming that an API request succeeding means its asynchronous operation completed.

## Prefer Explicit Field Selection

For a deployment availability question, a minimal summary is often enough:

```bash
kubectl --context "$INCIDENT_CONTEXT" \
  --namespace "$INCIDENT_NAMESPACE" \
  get deployment "$INCIDENT_DEPLOYMENT" \
  -o 'custom-columns=NAME:.metadata.name,DESIRED:.spec.replicas,AVAILABLE:.status.availableReplicas,GENERATION:.metadata.generation'
```

Set and verify those three variables before running the command. The output is not automatically public: names can reveal tenant or project information. Review the selected fields for the intended audience. The `custom-columns` syntax selects the displayed Kubernetes object fields. [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

Avoid broad collection such as printing environment variables, reading credential files, or exporting all Kubernetes Secrets. Kubernetes documentation emphasizes restricting Secret access; base64 encoding is not confidentiality protection. [Kubernetes: Good Practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)

## Make the Capture Boundary Visible

Before a session, check whether terminal recording, shell tracing, CLI debug output, screen sharing, or automatic chat uploads are enabled. A tool can print request headers or response bodies even when the normal command output looks harmless.

Turning off one recorder does not remove data already captured elsewhere. Shell history, audit systems, terminal scrollback, and screen recordings have different behavior. Use your approved session tooling and confirm what it records rather than relying on a leading space in a command or a local history setting.

When deeper output is necessary, collect it directly into an access-controlled evidence location. Do not stream raw output through a shared chat bot and hope a later filter removes every secret.

## Use an Allowlist for Shareable Summaries

An allowlist is easier to reason about than a long list of secret-shaped strings. For example, construct a report containing only a timestamp, an internal evidence ID, an HTTP status category, and an approved operation name.

If you must redact existing output, create a separate derivative and record its relationship to the original. Preserve stable placeholders where correlation matters: replace repeated occurrences of one account identifier with the same reviewed alias. Do not publish hashes of low-entropy sensitive values as if they made the values anonymous.

Review nested JSON, headers, stack traces, URLs, screenshots, and attachments. A signed query parameter or database DSN can leak outside a field named `password`. Automated scanners are useful checks, but a clean scan does not prove a file contains no sensitive information.

## Retain Provenance Without Oversharing

Keep an evidence index with acquisition time, collector, source, time window, storage location, access classification, and retention owner. Preserve the original separately when required; mark excerpts as excerpts and record transformations.

A content digest can help detect later modification when compared with a trusted retained digest. It does not prove that the original observation was accurate or that the collector was authorized. Avoid stronger claims in the postmortem.

Use fixed-window query exports or durable snapshots for critical observations. A dashboard URL pointing to “last hour” will show a different event tomorrow. Keep credentials and signed access tokens out of links pasted into the action log.

## Respond Promptly to Accidental Disclosure

If a credential reaches chat, treat it as exposed to that channel's audience and integrations. Notify the appropriate security owner, revoke or rotate through the approved procedure, restrict or remove the shared copy where possible, and assess secondary copies. Deleting one message does not establish that the credential remained private.

Record the event with a safe reference to the affected secret, never the secret itself. Preserve required investigative evidence in the restricted system while cleaning the broader publication path.

## Conclusion

Useful evidence explains the action, scope, timing, and result. It rarely requires publishing raw credentials or complete transcripts. Collect narrowly, retain restricted originals when needed, and build reviewed summaries for incident chat and postmortems so the investigation remains reconstructable without unnecessary disclosure.
