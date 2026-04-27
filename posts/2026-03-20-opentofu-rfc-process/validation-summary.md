# Validation Summary: How to Participate in OpenTofu RFC Process

## Status
validated

## Post Type
Guide / Tutorial — walks contributors through OpenTofu's RFC process with template, submission steps, and lifecycle.

## Technologies Covered
- OpenTofu (RFC process)
- Git / GitHub (fork-and-PR workflow)
- HCL (used in example snippet)
- Markdown / Mermaid (documentation formats)

## Sources Consulted
- OpenTofu RFC directory and README — https://github.com/opentofu/opentofu/tree/main/rfc
- OpenTofu RFC template (`yyyymmdd-template.md`) — https://github.com/opentofu/opentofu/blob/main/rfc/yyyymmdd-template.md
- OpenTofu CONTRIBUTING.md — https://github.com/opentofu/opentofu/blob/main/CONTRIBUTING.md

## Issues Found

The original draft described OpenTofu's RFC process but used conventions from a different project's RFC process (closer to Rust's RFC template). Several concrete inaccuracies were corrected:

1. **File naming convention was wrong.** The post showed RFCs named like `0001-example.md`, `0042-my-feature.md`, and `0000-my-feature.md`. OpenTofu actually uses ISO-date-prefixed names: `${isodate}-${rfc-title}.md` (e.g., `20231213-provider-iteration.md`). Updated the repository structure example and the submission `cp` command accordingly.

2. **Template file name was wrong.** The post referred to `TEMPLATE.md`. The real file is `yyyymmdd-template.md`. Updated both the structure listing and the `cp rfc/TEMPLATE.md ...` command.

3. **RFC template structure did not match OpenTofu.** The post used Rust's RFC sections (Summary / Motivation / Guide-Level Explanation / Reference-Level Explanation / Drawbacks / Rationale and Alternatives / Unresolved Questions). OpenTofu's actual template uses: Introduction, Background, Proposed Solution (with sub-sections Overview, User Documentation, Technical Approach, Open Questions, Future Considerations), and Potential Alternatives. Rewrote the "Writing an RFC" section to match the real template.

4. **RFC title format was wrong.** The post showed `# RFC-XXXX: Feature Name`. OpenTofu RFCs do not use a numeric `RFC-XXXX:` prefix — they are titled by feature with a link to the originating GitHub issue. Updated the title example.

5. **Missing the `needs-rfc` issue prerequisite.** OpenTofu's process documents that RFCs are typically authored in response to GitHub issues labeled `needs-rfc`. Added a note about this in the "Submitting an RFC" section, plus the OpenTofu-documented allowance for draft PRs to get early feedback.

6. **Lifecycle terminal state.** The post used "Merged" as the final state. OpenTofu's process keeps a tracking issue open through implementation and closes it when the work is complete; acceptance requires majority approval from the Core Team, and accepted RFCs can still be amended. Changed "Merged" to "Closed" and added a short paragraph clarifying these governance details.

7. **Markdown formatting bug.** Line 86 of the original had a stray ` ```hcl ` fence intended to close the outer `markdown` code block but using the wrong language tag, which would break rendering. The "Writing an RFC" section was rewritten and this fence is no longer needed; the inner HCL example is shown using indentation to avoid nested-fence ambiguity inside a `markdown` code block.

## Review Notes

- The Mermaid diagram uses a simple lifecycle. OpenTofu's real-world flow has more nuance (e.g., draft state, amendments after acceptance), captured briefly in the prose paragraph after the diagram.
- The "What Requires an RFC" list (HCL changes, state format, provider SDK APIs, meta-arguments/built-ins, breaking semantics) is a reasonable characterization of the kinds of substantial changes the process is used for, but the formal trigger in OpenTofu's process is simply that an issue is labeled `needs-rfc` by the maintainers — there isn't a strict published taxonomy. Left this section as written since it gives newcomers a useful intuition.
- The author's tone, structure, and section ordering were preserved; only technical inaccuracies were corrected.
