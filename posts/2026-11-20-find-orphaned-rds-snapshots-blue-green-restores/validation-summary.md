# Validation review

The article uses immutable instance identity for local comparison and keeps copied or unknown sources unresolved. Its classifier and action table distinguish inventory findings from deletion decisions. No cloud mutation command is provided.

## Checks

- Exact Python script executed on five synthetic classifications, including renamed live source, absent source, missing source ID, copied snapshot and nonmanual type
- Missing stable ID in instance inventory correctly rejected
- AWS CLI 2.38.1 generated output skeletons for four read-only operations with config/credentials disabled; no API requests
- Three Bash blocks passed syntax checking
- Generated social image visually reviewed without clipping

## Limitations

- No AWS inventory or deletion performed
- Synthetic fixtures do not prove completeness of account/Region collection or snapshot lineage
- Report is not a retention policy, savings calculation or deletion authorization

## Reviewed sources

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-switching.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-deleting.html
- https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html
- https://docs.aws.amazon.com/cli/latest/reference/rds/list-tags-for-resource.html
- https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshot-attributes.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
