# Validation Summary: How to Use Machine and Human Readable Output Introduced in OpenTofu 1.11

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- `jq`
- Bash
- GitHub Actions
- AWS CLI / CloudWatch Logs

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu machine-readable UI docs: https://opentofu.org/docs/v1.8/internals/machine-readable-ui/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu v1.x compatibility promises: https://opentofu.org/docs/language/v1-compatibility-promises/
- OpenTofu v1.11.0 announcement: https://opentofu.org/blog/opentofu-1-11-0/
- OpenTofu dual output stream announcement (`-json-into` in nightly builds): https://opentofu.org/blog/dual-command-output-streams/
- GitHub Actions workflow commands (`GITHUB_OUTPUT`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- AWS CLI `put-log-events`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-log-events.html

## Issues Found
- The post incorrectly claimed that human-readable and machine-readable output changes were introduced in OpenTofu 1.11. OpenTofu's machine-readable `-json` interfaces predate 1.11, and the newer dual-stream behavior is described separately as `-json-into` in a later nightly-build announcement. I removed the incorrect 1.11-specific framing from the title, tags, description, introduction, and summary.
- The post treated `tofu plan -json` as if it were the same as a full JSON representation of a saved plan file. Official docs distinguish the newline-delimited machine-readable UI event stream from the JSON plan representation available through `tofu show -json`. I updated the examples to show both correctly.
- Several command examples merged stderr into the JSON UI stream with `2>&1`, which can make the captured output non-JSON if anything else writes to stderr. I removed that redirection so the examples keep the machine-readable stream parseable.
- The human-readable example included an `aws_s3_bucket` attribute (`region`) that is not a valid bucket argument. I replaced it with valid resource attributes and adjusted the RDS example to use `identifier`.
- The `jq` action-count example emitted JSON strings rather than raw text, which makes shell aggregation less clean. I changed it to `jq -r`.
- The CloudWatch Logs example passed raw line content directly to `aws logs put-log-events`, which is not a safe way to construct the `--log-events` payload. I changed it to build a proper JSON event payload and clarified the assumption that the log group and stream already exist.
- The exit code section implied a more general success-code scheme than the command example actually demonstrates. I narrowed the explanation to `tofu plan -detailed-exitcode`, which is what the official docs document for distinguishing no-change and change cases.
- The GitHub Actions example wrote a JSON event stream to a `.json` file and appended to `GITHUB_OUTPUT` without quoting the file path. I renamed the stream file to `.jsonl`, kept the parsing aligned with the machine-readable UI format, and quoted `"$GITHUB_OUTPUT"` per GitHub's documented pattern.

## Review Notes
- OpenTofu's natural-language CLI output is not a stable integration interface; the official compatibility promises recommend relying on JSON output modes and exit codes for automation.
- `tofu show -json` can expose sensitive values in plain text, so saved plans and generated JSON artifacts should be handled as sensitive data when used in CI/CD.
