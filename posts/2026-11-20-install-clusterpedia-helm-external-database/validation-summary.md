# Validation review

Pinned chart2.7.0/applicationv0.9.0 and verified archive SHA256 against official index. Reviewed storage DSN handling, chart templates, pgx5.7.5 and Go MySQL1.9.3 sources, Kubernetes Secret and aggregation documentation, and Helm post-rendering.

Helm3.17.3 render and lint passed using the exact article values. The DSN string-to-map coalescing warning is documented. Python3.11/PyYAML6.0.2 tests checked database workload exclusions, credential references, CA mounts, serving flags, APIService verification and missing-object failures. Public bundle encoding used synthetic bytes and does not constitute certificate or TLS validation.

No cluster, database, schema migration, image pull, live query or API validation was run. MySQL is a source-reviewed alternative only. Shell syntax and Python parsing passed. Seven diagram edges were structurally checked without rendering. The generated1280x720 image was visually inspected and readable.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
