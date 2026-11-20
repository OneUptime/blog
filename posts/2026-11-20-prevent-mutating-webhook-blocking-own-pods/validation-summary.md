# Validation summary

Reviewed the self-recovery dependency loop, explicit namespace exclusions and runtime recovery stages against official Kubernetes documentation. The article keeps its matching fragment separate from a complete webhook configuration and requires preserving existing scope.

## Checks

Executed 16 cases with the Kubernetes v0.35.0 label selector implementation, including exclusions combined with an enrollment requirement. Checked the fragment inside a complete synthetic webhook against v1.35.0 OpenAPI. Six read-only inspection commands passed shell syntax checks. The four-node Mermaid cycle received structural checks only. Generated and visually reviewed the social image with no title clipping.

## Limits

No live recovery or infrastructure modification occurred. Library and schema checks do not establish actual API-server dispatch, scheduling, image pulls, readiness or TLS connectivity. A staging recovery test remains necessary. Sources are linked in the article and listed in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
