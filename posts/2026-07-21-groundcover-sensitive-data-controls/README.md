# How to Keep PII, Credentials, and Sensitive Payloads Out of Groundcover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Data Privacy, PII, Observability Security

Description: Minimize sensitive Groundcover data with collection scope, payload obfuscation, log pipelines, retention, testing, and least-privilege access.

---

Groundcover can capture data that is extremely useful for debugging and extremely sensitive. Its current trace documentation says eBPF traces can include headers, query parameters, and request and response bodies. Its sensitive-data documentation says payload obfuscation is disabled by default, although a default list of sensitive HTTP and gRPC headers is obfuscated.

The safest design prevents secrets and unnecessary personal data from reaching observability systems at all. Groundcover controls then provide additional collection, transformation, storage, and access layers.

## Start with a data inventory

List sensitive fields by source and protocol:

- HTTP and gRPC headers, query strings, and bodies
- SQL text, parameters, and results
- MongoDB, Redis, and AMQP messages
- application, proxy, audit, and system logs
- OpenTelemetry span attributes and baggage
- Kubernetes labels, annotations, events, and object names
- metric labels
- host logs and file targets

Classify personal data, authentication secrets, payment data, health data, internal identifiers, and confidential business content. Assign an owner and approved observability treatment to each class: allow, mask, tokenize, drop, or do not collect.

Do not place credentials in labels, annotations, resource names, or metric labels. Payload obfuscation does not imply that every metadata path is scrubbed.

## Prevent applications from emitting secrets

Fix the source first:

- never log passwords, session tokens, private keys, or authorization headers
- use structured logging with an explicit safe-field schema
- avoid putting sensitive values in URLs
- keep OpenTelemetry baggage and span attributes free of credentials
- log stable internal references rather than raw personal values
- centralize application redaction libraries and tests

Agent-side redaction is defense in depth. It should not be the only barrier between a secret and every log, trace, backup, API, and user with observability access.

## Reduce collection scope

Groundcover provides controls to filter Kubernetes entities, drop logs, disable selected tracing protocols, and control payload size. Use those controls before designing complex regexes.

Examples of safer scope decisions include:

- exclude namespaces that process regulated payloads when deep tracing is not approved
- disable a database or messaging protocol whose contents cannot be sanitized
- drop debug logs in production
- collect metadata and metrics without retaining raw payloads
- keep payload limits no larger than the troubleshooting need

Groundcover documents that logs from all namespaces and workloads are stored by default, but `logsDropFilters` can discard matching streams or lines. Test filters carefully because the rules are applied sequentially and independently.

## Configure trace payload obfuscation

Groundcover configures obfuscation separately for HTTP, gRPC, Redis, SQL, MongoDB, and AMQP handlers. It supports two modes:

- **Key-value obfuscation:** Detect structures such as JSON or query parameters and apply a field policy.
- **Unstructured obfuscation:** Obfuscate free text without relying on keys.

Key-value configuration supports an allowlist-style `KeepSpecificValues` mode and a denylist-style `ObfuscateSpecificValues` mode. An allowlist is safer when the set of fields required for debugging is small and stable.

For example, preserve only an approved diagnostic field in HTTP payloads:

```yaml
agent:
  sensor:
    httphandler:
      obfuscationConfig:
        keyValueConfig:
          enabled: true
          mode: KeepSpecificValues
          specificKeys:
            - operation_id
```

Apply the values through the supported CLI or Helm upgrade path. Use the exact key names and casing expected by the current chart.

Groundcover states that sensitive headers are obfuscated by default and documents the default list. Review it rather than assuming it contains every proprietary token header. Extend the list for application-specific headers and keep header matching behavior in mind.

## Redact logs before storage

Groundcover's current log-pipeline documentation provides three relevant operations:

- `obfuscate_pii` for built-in patterns such as email, credit card, JWT, bearer token, cloud credentials, repository tokens, API keys, and private keys
- `replace_pattern` for custom or partially masked values
- `delete_key` for removing attributes entirely

The page states that `obfuscate_pii` is available from Groundcover version 1.11.481. Confirm the deployed version before depending on it. A minimal example is:

```yaml
ottlRules:
  - ruleName: redact_sensitive_log_body
    statements:
      - 'obfuscate_pii(body, "***", "email,jwt,bearer_token,aws_credential,private_key")'
```

Use `delete_key` for credentials that provide no diagnostic value. Use precise custom patterns for organization-specific account numbers or tokens. Run transformations at the sensor level so sensitive content is changed before persistent storage, as the Groundcover documentation recommends.

Groundcover also supports log and trace data pipelines. Those pipelines can parse, filter, remove, or rename fields. Treat pipeline errors explicitly. A redaction stage that silently passes an unparsed event can become a leak path.

## Control traces from other sources

Groundcover can ingest third-party traces from OpenTelemetry and other instrumentation. eBPF handler obfuscation does not automatically prove that manually instrumented span attributes are safe.

Apply OpenTelemetry processor rules before export, then apply Groundcover trace-pipeline transformations as a second layer. Review:

- span names
- resource and span attributes
- events
- links
- status messages
- baggage-derived fields

Instrumented applications should use semantic fields without raw customer content.

## Test with synthetic canaries

Create non-production test values that resemble each sensitive type but are not real credentials or personal data. Send them through every enabled route:

- structured and plain-text logs
- supported eBPF protocols
- OpenTelemetry traces
- multiline and malformed messages
- nested JSON and arrays
- oversized and truncated payloads
- custom headers and query strings

Search for the canaries in the UI, raw APIs, ClickHouse, VictoriaMetrics labels, object storage, snapshots, and exported backups. Groundcover notes special handling for truncated data, so include boundary-size tests rather than assuming the normal obfuscator path applies identically.

Turn the canary suite into a deployment gate. Re-run it after sensor, chart, pipeline, protocol, or application logging changes.

## Limit the impact of a missed value

Redaction will never be perfect. Add containment:

- use Groundcover RBAC scopes for cluster, environment, namespace, and data type
- avoid default full-scope roles for users who need only one service
- govern service accounts and rotate API keys
- configure the shortest useful retention by data type
- use shorter advanced retention rules for sensitive namespaces where supported
- restrict object-store and snapshot access
- encrypt storage and control key administration
- audit queries, exports, policy changes, and support access where available

Groundcover documents advanced retention for logs, traces, and events, while metrics support a global retention policy. Retention reduces future exposure but does not retroactively sanitize backups or exports. Include every copy in deletion procedures.

## Prepare for redaction failure

If a real credential appears:

1. Revoke or rotate it immediately.
2. Stop or narrow the offending collection path.
3. Identify all storage, object, snapshot, export, and UI locations.
4. Apply the approved deletion process.
5. Review who could access the value.
6. Fix the source and redaction tests before restoring collection.

Treat exposed personal data through the organization's privacy and incident process. Do not wait for normal retention to expire a live credential.

The winning strategy is layered: safe application telemetry, narrow collection, allowlist-style payload handling, pre-storage log redaction, synthetic verification, short retention, and least-privilege access.

## Official documentation

- [Groundcover sensitive data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover log obfuscation](https://docs.groundcover.com/use-groundcover/data-pipelines/log-pipelines/obfuscate-logs)
- [Groundcover custom log collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover data pipelines](https://docs.groundcover.com/use-groundcover/data-pipelines)
- [Groundcover trace payload sizing](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [Groundcover role-based access control](https://docs.groundcover.com/use-groundcover/role-based-access-control-rbac)
- [Groundcover custom data retention](https://docs.groundcover.com/customization/customize-usage/custom-data-retention)
