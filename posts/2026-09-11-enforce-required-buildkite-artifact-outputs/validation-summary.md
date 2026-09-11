# Validation Summary: Why Missing Buildkite Artifact Globs Do Not Fail a Step

## Status
validated

## Post Type
Technical troubleshooting guide with Bash examples and Buildkite pipeline configuration.

## Technologies Covered
- Buildkite agent artifact uploads, downloads, and command steps
- Bash arrays, glob expansion, file checks, and exit-status handling
- Tar and gzip archives
- Python 3 XML ElementTree and JUnit reports
- CI/CD output validation and workspace isolation

## Sources Consulted
- [Buildkite agent v4.0.3 artifact uploader source](https://github.com/buildkite/agent/blob/v4.0.3/internal/artifact/uploader.go): confirmed that an empty collected artifact list logs a message and returns nil.
- [Buildkite artifact CLI reference](https://buildkite.com/docs/agent/cli/reference/artifact): checked upload arguments, glob usage, and scoped downloads.
- [Buildkite build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts): checked automatic collection and ambiguous artifact downloads from parallel jobs.
- [Buildkite command step reference](https://buildkite.com/docs/pipelines/configure/step-types/command-step): verified command, label, and string/list artifact_paths configuration.
- [Buildkite glob pattern syntax](https://buildkite.com/docs/pipelines/configure/glob-pattern-syntax): reviewed the referenced pattern documentation.
- [Buildkite agent lifecycle](https://buildkite.com/docs/agent/lifecycle): checked command failure and artifact-phase exit-status behavior.
- Local Bash manual (`man bash`): checked nullglob, the -s conditional, and Bash syntax. The GNU website could not be retrieved through the web tool, so the installed manual and executable checks were used.
- Local tar manual (`man tar`): checked archive listing, file selection, and gzip handling. Local execution used the system tar implementation.
- [Python ElementTree documentation](https://docs.python.org/3/library/xml.etree.elementtree.html): checked parse(), getroot(), element tags, and malformed-XML handling.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The cited v4.0.3 source supports the version-specific claim; the article does not assert that this is the latest agent release.
- All three Bash code blocks passed bash -n syntax checks.
- Ran 10 archive scenarios in disposable directories: missing, empty, malformed, valid, and simulated upload failure for each of the fixed-path and array examples. Invalid archives stopped before upload; valid archives reached the upload command; simulated upload failures propagated a nonzero exit status.
- Ran 12 report scenarios: missing, empty, malformed, wrong-root, testsuite-root, and testsuites-root XML, each with test exit status 0 and 7. Invalid reports failed successful test runs, valid reports passed successful runs, and failed test runs retained exit status 7 in every case.
- Repository-specific producer scripts and the Buildkite upload executable were stubbed for these tests. No authenticated Buildkite job, real artifact upload, storage-permission check, or scoped download was performed. Report collection after a failed command was reviewed against Buildkite documentation rather than exercised in a live pipeline.
- The report check intentionally validates XML structure and accepted root names, not full JUnit semantics. Archive listing similarly does not prove required members or release provenance; the article correctly calls for application-specific checks.
- The variable-output example assumes packaging has already run. Bash and agent patterns should be tested against the actual output layout, as the article advises. Custom hooks or soft-fail configuration can affect the final Buildkite result beyond the script's exit status.
