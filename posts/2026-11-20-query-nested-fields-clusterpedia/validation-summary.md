# Validation review

Reviewed native Kubernetes field selector scope, Clusterpedia search documentation, the v0.9.0 field parser, and internal-storage query builder/test expectations. The article distinguishes parser acceptance from backend support, warns about missing-field negation, and does not recommend unsupported array or numeric expressions.

Go1.25.0 tests exercised all five exact selectors against tagged source, verified the annotation key remains one path segment, rejected malformed input, and checked the array marker. Shell argument extraction and syntax passed; five Mermaid edges passed structural checks. The1280x720 image was visually inspected with the full title visible.

No live request, backend SQL execution, database fixture, or latency test was run. Backend claims are source-reviewed. Mermaid was not rendered. Sources are listed in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
