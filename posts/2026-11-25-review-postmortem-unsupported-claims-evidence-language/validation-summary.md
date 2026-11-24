# Validation summary

Reviewed on 25 November 2026.

## Documentation and editorial checks

Reviewed official PagerDuty guidance for effective postmortem review and evidence-bearing templates, plus Google SRE guidance on postmortem quality and blameless review. The original worked example connects a flawed passage to explicit review questions, five fictional evidence records and a revised passage.

The 76-of-400 request calculation was checked as 19%. The revision preserves regional export scope, request units, rollback start/completion and later recovery timestamps, unresolved causal attribution, bounded integrity evidence and the unimplemented alert proposal. Review language and the action discussion were checked for consistency with those limits.

The generated 1280x720 social image was opened and visually reviewed; its three-line title fits. The comparison tables and passages provide the relevant practical artifact without extra code or a diagram.

## Limits

No real incident, telemetry query, deployment log, integrity test or organizational review was performed. All example evidence is fictional. The arithmetic check does not validate any actual customer population or causal explanation.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
