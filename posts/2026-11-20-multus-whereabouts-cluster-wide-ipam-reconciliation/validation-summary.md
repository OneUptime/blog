# Validation summary

Reviewed official Whereabouts v0.9.4 source at 3a262bd0cd873e13d9b379342f8251b852a89b8f: configuration, Kubernetes storage offsets, IPPool schema, reconciliation, deployment and Helm defaults. Citations accompany the relevant claims.

Parsed the NAD YAML and nested JSON. Python address arithmetic verified the twenty-address example window after exclusion; this is not an allocator runtime test. All shell examples passed syntax checking. The eight-node, seven-edge diagram was structurally reviewed but not rendered. The social image was visually inspected at 1280x720.

No cluster deployment, address allocation, reconciliation, node fencing, or duplicate-address network test was performed. The article separates stale records from live traffic on an isolated node and does not prescribe bulk deletion of allocation objects. Reference manifest version drift is explicitly identified.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
