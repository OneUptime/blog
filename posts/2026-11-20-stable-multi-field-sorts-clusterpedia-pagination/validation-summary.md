# Validation review

Reviewed v0.9.0 conversion and query ordering source plus Kubernetes apimachinery0.31.2 set semantics. The guide uses direct orderby to preserve precedence and explains why unique tie-breakers do not create snapshot consistency.

Go1.25.0 tests kept the direct four-field sequence across100 conversions and observed four label-derived sequences across100 conversions. A malformed direction was rejected. A separate Python3 SQLite fixture checked reversed insertion order, complete stable paging, and an offset gap after deleting an earlier row. The exact URL helper round-tripped correctly. Shell syntax and five Mermaid edges passed structural checks. Image1280x720 visually reviewed without clipping.

No live Clusterpedia or PostgreSQL/MySQL execution occurred. The SQLite fixture is illustrative and the observed label permutation count is not a portable expectation. Mermaid was not rendered. Sources appear in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
