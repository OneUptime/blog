# Validation summary

Reviewed Azure data-out eligibility, source networking, binlog retention and accelerated-logs limitation. Examined Debezium 3.3.2.Final release compatibility, tagged connector properties, schema-history client configuration and snapshot locking implementation. Reviewed Kafka 4.1 file-provider and SASL documentation.

Connector JSON parsed; non-pass-through Debezium property names were found in the tagged documentation. Inclusion patterns were checked against positive and negative table names, including a dot lookalike. TLS/SASL settings were checked for both history clients. The MySQL SELECT parsed with sqlglot 28.0.0. The eight-node/eight-edge Mermaid flow was structurally checked, not rendered. The generated social image was visually inspected without clipping.

No MySQL or Kafka runtime, Connector REST validation, truststore load, secret substitution, snapshot, streaming, restart or recovery test was executed. The article explicitly requires those staging checks and does not claim end-to-end operation. Sources are recorded in validation.json and cited beside technical claims.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
