# Validation summary

Reviewed on 25 November 2026.

## Evidence and scope

The guide separates local Kubernetes admission from service-wide maintenance coordination. Official Kubernetes API and source establish namespace scope and disruption limits. Official GitHub documentation establishes repository-scoped concurrency and default pending-run behavior. The Todo video could not be retrieved; it was not used as evidence.

The exact example workflow passed actionlint1.7.7 with its required custom runner label configured for linting. Its embedded Bash passed syntax checking and executed against two independently started Kubernetes1.34.0 API servers. Separate namespace UIDs and PDB objects were created, with counts explicitly seeded. Five scenarios passed: healthy pair succeeds, unhealthy second cluster fails, stale second budget fails, duplicate context target fails, and missing second budget fails. Testing caught compound-test errexit behavior in local Bash3.2; the final guard explicitly exits and all five scenarios were rerun successfully.

The six-node/seven-edge Mermaid diagram was checked structurally. The generated1280x720 social image was opened and visually reviewed; its two-line title fits without clipping.

## Limits

No GitHub workflow dispatch or hosted concurrency experiment occurred. GitHub behavior is documentation-based, while command behavior was tested locally. No workload, scheduler, kubelet or disruption controller produced the fixture counts. No maintenance action, capacity test, cloud upgrade, load-balancer change, eviction or application recovery ran. The example is explicitly read-only preflight; the article explains the additional action/recovery coordination and durable state required for production. Mermaid was not rendered. Both disposable APIs stopped and all temporary kubeconfigs were removed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
