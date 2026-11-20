## Documentation review

Reviewed AWS IAM workload practices and third-party role trust, AWS Config resource-level authorization and rule-results API, IAM simulator limitations, access-key replacement procedure, and CloudTrail overview. Trust and permission policies are distinguished; the role example is limited to one known rule.

## Local checks

Parsed both JSON policies and checked the exact action, resource and external-ID condition. AWS CLI 2.38.1 generated the rule-results output skeleton with credential/config sources disabled, without an AWS request. Bash syntax passed. Mermaid structurally checked for six nodes and five edges, not rendered.

## Limitations

No IAM simulator or Access Analyzer validation, STS assumption, live authorization, mutation denial, credential rotation, evidence storage, or collection workflow was tested. The sample is not a complete connector policy.

## Image review

Generated social image visually reviewed; full title readable without clipping.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
