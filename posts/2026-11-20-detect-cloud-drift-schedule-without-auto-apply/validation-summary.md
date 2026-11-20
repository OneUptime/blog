# Validation summary

Reviewed deployed-baseline selection, three-way check outcomes, observed drift versus proposed remediation, sensitive plan evidence, and separation from automatic apply. Actual Terraform commands exercised a disposable local-file fixture only.

## Checks

- Terraform 1.11.4/local provider 2.5.3 actual local-file rehearsal: clean baseline, out-of-band edit, invalid configuration
- Checker preserved out-of-band file content and exact saved-state bytes during drift check
- Six summary fixtures passed: three deletion/replacement action lists, output-only changes, unsupported format, drift with empty diff
- Published Python matches tested helper; YAML/shell syntax checked
- Mermaid seven nodes/six edges structurally checked
- Generated social image visually reviewed, readable and unclipped

## Limitations

- Disposable local file baseline was created with apply solely for the test; no cloud infrastructure deployed or modified
- No live cloud IAM, provider drift coverage, GitHub schedule or notification test
- Local JSON fixtures do not prove all future provider/format behavior
- Mermaid not rendered

## Sources checked

- https://developer.hashicorp.com/terraform/internals/json-format
- https://developer.hashicorp.com/terraform/cli/commands/plan
- https://github.com/hashicorp/terraform-provider-external/blob/v2.3.5/docs/data-sources/external.md
- https://developer.hashicorp.com/terraform/cli/commands/show
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- https://github.com/hashicorp/terraform-provider-local/blob/v2.5.3/docs/resources/file.md

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
