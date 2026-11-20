# Validation summary

## Checks

Compiled the article Java helper with javac 17.0.16 against Aerospike Java client 10.5.0. Executed local assertions for policy copying, preserved expiration instruction, update-only behavior selection, inherited timeout, and isolation of the original policy. Checked the SDK non-expiring Record conversion. Shell syntax passed. Reviewed the deadline examples, creation fallback, read-touch distinction, and TTL reduction caveat. Generated and visually inspected the 1280x720 social image; title is readable and unclipped.

## Limitations

No Aerospike server was run. Tests verify local policy construction and SDK conversion, not server enforcement, expiry timing, or cleanup. The acceptance procedure requires a staging namespace and normal authentication/TLS configuration.

## Sources

- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/WritePolicy.java
- https://aerospike.com/docs/database/manage/namespace/retention/
- https://aerospike.com/docs/database/reference/config/
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/RecordExistsAction.java
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/Record.java
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/Policy.java
- https://aerospike.com/docs/database/reference/info/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
