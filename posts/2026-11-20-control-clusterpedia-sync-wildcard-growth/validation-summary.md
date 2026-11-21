# Validation review

Compared official feature pages with v0.9.0 source: the pinned broad-sync gate defaults are false despite documentation tables showing true. Reviewed wildcard expansion, list/watch eligibility, version negotiation, and existing-synchronizer behavior.

Helm3.17.3/chart2.7.0 rendering passed using the article guardrail values and isolated external-database settings. Both false gates were verified in the container command array. The test initially assumed an args field; inspection corrected that test assumption. The existing external-DSN map coalescing warning is unrelated to the gate values. jq1.6 status fixtures preserve errors and multiple versions. YAML, shell syntax, and seven Mermaid edges passed checks. Image visually reviewed at1280x720, no clipping.

No live manager, member API, storage, load, or rollout test was performed. The CRD inventory command was source-reviewed only. Mermaid was not rendered. Source URLs are listed in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
