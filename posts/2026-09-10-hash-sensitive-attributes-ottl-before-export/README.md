# Hash Sensitive Attribute Values with OTTL Before Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Security, Data Privacy, Observability

Description: Use OTTL SHA256 for stable pseudonymous identifiers, remove original attributes, handle unexpected types, and verify every export path.

A stable digest can let you correlate events without exporting the original identifier. OTTL provides `SHA256` for that transformation, but hashing does not automatically make low-entropy identifiers anonymous or safe to share. First decide whether correlation is required; if it is not, deleting the value is simpler.

This example uses OpenTelemetry Collector Contrib **0.160.0**. It hashes a string-valued `user.id` into a separate custom attribute and removes the original field before export.

## Understand the Hashing Contract

The [SHA256 implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_sha256.go) hashes the input string bytes and returns a hexadecimal string. Identical input bytes produce the same digest. The function expects a string; it does not define a universal normalization policy for numbers, maps, or lists.

Case, whitespace, and Unicode representation can change those bytes. `alice`, `Alice`, and `alice ` need not identify the same entity in your system. Do not normalize them merely to make hashes look consistent unless the identifier's contract says they are equivalent.

A predictable identifier can still be guessed by hashing candidate values. Unsalted hashing of sequential account IDs or email addresses is pseudonymization, not a guarantee of anonymity. If your threat model requires secret-key protection or controlled reidentification, use an appropriately designed upstream service or instrumentation component.

## Write a Separate Output and Remove the Input

Use a custom destination key so the pipeline does not mistake a digest for the original semantic attribute:

```yaml
processors:
  transform/hash_user:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["example.user_id_sha256"], SHA256(span.attributes["user.id"])) where IsString(span.attributes["user.id"])
      - delete_key(span.attributes, "user.id")
```

The type guard permits only strings. The following deletion runs independently of whether hashing occurred. A record with a numeric or map-valued `user.id` loses the raw identifier rather than leaking it because the hashing branch was skipped.

Decide what should happen if `example.user_id_sha256` already exists. The example replaces it when a valid raw input is present. If you need to trust only digests created here, clear an existing destination first or use a distinct pipeline-owned key and reject conflicting producers.

Keeping the source and destination separate also improves repeatability. A second pass sees no raw `user.id` and leaves the existing digest untouched. Hashing in place can hash an already-hashed value again when telemetry passes through another Collector.

## Cover Every Signal and Copy

A span rule does not sanitize log attributes. Add the appropriate rule to the logs pipeline when the same identifier appears there:

```yaml
processors:
  transform/hash_log_user:
    error_mode: ignore
    log_statements:
      - set(log.attributes["example.user_id_sha256"], SHA256(log.attributes["user.id"])) where IsString(log.attributes["user.id"])
      - delete_key(log.attributes, "user.id")
```

Resource attributes and structured bodies require their own paths. Search the exported fixture for the original synthetic value, not just the original key. A producer may copy an identifier into a message, URL, event attribute, or another field name.

Be especially deliberate with metric attributes. A hash generally preserves the number of distinct identifiers, so it does not solve metric cardinality. Removing or aggregating such dimensions requires a separate metric identity decision.

The [OTTL function reference](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#sha256) defines SHA256 separately from the attributes processor's `hash` action. In this release, the attributes processor documents SHA1 for that action; the two should not be treated as interchangeable algorithms.

## Wire the Processor Before Export

Combine the selected processor with a local OTLP receiver and file or detailed debug exporter. Add its exact ID to the service pipeline:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/hash_user]
      exporters: [debug]
```

All production exporters that receive these spans must be downstream of the transformation. A debugging branch that receives the original payload can defeat the intended removal even if the main backend shows only hashes.

## Verify Determinism and Failure Cases

Compute a reference digest for a synthetic identifier:

```bash
python3 - <<'PYHASH'
import hashlib
print(hashlib.sha256(b"test-user-123").hexdigest())
PYHASH
```

Submit that identifier twice and compare both exported digests with the reference. Then test an empty string, a missing attribute, an integer identifier, and a record already containing only the digest.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Check that raw values are absent, valid strings produce the expected 64-character hexadecimal output, and malformed input types do not leave the original key behind. Also submit a batch with several records to ensure a problem in one record does not obscure what happened to its neighbors.

## Conclusion

Hash into a separate field, remove the raw source independently, and verify all copies before export. SHA256 supports stable correlation, but it does not reduce cardinality or protect easily guessed identifiers by itself. Treat the digest as a deliberate data product with its own access and retention policy.

## Official Documentation

- [SHA256 implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_sha256.go)
- [OTTL hashing function](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#sha256)
- [Attributes processor hash behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/attributesprocessor/README.md)
