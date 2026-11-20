# Validation summary

Reviewed Microsoft IOPS modes, compute limits, MySQL metric units and aggregations, Azure CLI references and tagged 2.80.0 command arguments. Reviewed MySQL disk-I/O and EXPLAIN behavior. The article separates storage capacity, provisioned IOPS, autoscale limits and evidence of application impact.

Three shell snippets passed bash syntax checking. The exact Python helper compiled and ran against synthetic JSON fixtures, preserving zero versus missing measurements, converting complete minute counts correctly and rejecting absent/wrong metric names. An empty series produces no observations, explicitly explained in the article. These tests do not query Azure.

The generated social image was visually inspected without clipping. No live metric collection, IOPS change, database workload, compute scaling or performance experiment was executed. Sources are recorded in validation.json and linked beside technical claims.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
