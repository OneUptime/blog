# Validation Summary: How to Configure the Attributes Processor to Hash Sensitive User IDs with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Attributes processor
- Transform processor
- OpenTelemetry Transformation Language (OTTL)
- SHA-1 and SHA-256 hashing
- Python hashlib
- Linux hash utilities

## Sources Consulted
- OpenTelemetry Collector processors registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- GNU Coreutils sha1sum documentation: https://www.gnu.org/software/coreutils/manual/html_node/sha1sum-invocation.html

## Issues Found
- The post incorrectly stated that the OpenTelemetry Collector attributes processor `hash` action uses SHA-256. The official attributes processor documentation says `hash` hashes existing attribute values with SHA-1, so the post now describes the attributes processor behavior as SHA-1.
- The sample hash for `john.doe@company.com` did not match the documented attributes processor algorithm. It was replaced with the SHA-1 digest `3d7ee2b6070db641abc879e7ec1c7eae26a20b48`.
- The Python lookup example used `hashlib.sha256`, which would not reproduce the attributes processor output. It now uses `hashlib.sha1` to match the collector's attributes processor.
- The transform processor section incorrectly said OTTL `SHA256` produces the same output as the attributes processor `hash` action. It now explains that OTTL `SHA256` differs from the attributes processor output, and that OTTL `SHA1` should be used when consistency with the attributes processor is required.
- The verification command and expected output were incorrect. The post now uses `printf '%s' "test-user-123" | sha1sum` with the verified SHA-1 digest `e43ff8d002f2ba99a5057f5643d968cca0226065`.
- The wording claiming that nobody can determine the original email from a hash was too absolute for unsalted deterministic hashes of predictable identifiers. It now says the hash does not directly expose the original email.

## Review Notes
The attributes processor configuration syntax and pipeline examples are consistent with the official collector documentation. The transform processor is the appropriate OpenTelemetry Collector option when SHA-256 is specifically required. SHA-1 is not recommended for new cryptographic uses, but this remains the documented algorithm for the attributes processor `hash` action.
