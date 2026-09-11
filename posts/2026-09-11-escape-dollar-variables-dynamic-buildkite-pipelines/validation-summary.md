# Validation Summary: How to Escape Dollar Variables in Dynamic Buildkite Pipelines

## Status
validated

## Post Type
Technical tutorial and troubleshooting guide.

## Technologies Covered
- Buildkite dynamic pipelines and Buildkite agent CLI
- YAML quoting and literal block scalars
- Bash heredocs, parameter expansion, quoting, and pipelines
- Python environment access and JSON serialization

## Sources Consulted
- Buildkite pipeline upload reference: https://buildkite.com/docs/agent/cli/reference/pipeline
- Buildkite dynamic pipeline generation: https://buildkite.com/docs/pipelines/configure/dynamic-pipelines
- Buildkite writing build scripts: https://buildkite.com/docs/pipelines/configure/writing-build-scripts
- Buildkite command step schema: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite agent v4.0.3 release and official binary: https://github.com/buildkite/agent/releases/tag/v4.0.3
- Buildkite agent v4.0.3 pipeline upload implementation: https://github.com/buildkite/agent/blob/v4.0.3/clicommand/pipeline_upload.go
- Buildkite agent v4.0.3 API configuration validation: https://github.com/buildkite/agent/blob/v4.0.3/clicommand/global.go
- YAML 1.2.2 specification, escaped characters and scalar styles: https://yaml.org/spec/1.2.2/
- Python JSON encoder documentation: https://docs.python.org/3/library/json.html
- Installed Bash reference manual (`man bash`), special parameters, here documents, quoting, and shell expansion. The GNU manual website could not be retrieved during the review; the local manual was consulted instead.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post correctly distinguishes generator-shell expansion, YAML parsing, agent interpolation, and job-shell expansion.
- Confirmed supported command-step fields and the upload CLI options against official Buildkite documentation. All three linked Buildkite documentation pages resolve to the intended resources.
- Parsed all standalone YAML examples successfully and checked every Bash block with `bash -n`.
- Executed the heredoc generator locally, with the upload command removed for inspection. Quoting the delimiter preserves double dollar signs; removing delimiter quotes produces a process ID in their place.
- Executed the Python generator, decoded its JSON, and ran its fixed command with the generated environment. The output preserved the exact value `release $5: candidate`.
- Downloaded the official macOS ARM64 Buildkite agent v4.0.3 binary into a temporary directory and ran local dry runs. Unescaped references resolve from the upload environment; escaped references retain a single dollar sign; no-interpolation preserves ordinary runtime references. The step environment retains `eu-west-1` in each case.
- Confirmed experimentally that v4.0.3 rejects a local dry run without an access token and accepts the documented placeholder. Its shared API configuration marks the token as required, even though the later upload path skips authentication during a dry run. This is a version-specific observation, not a guarantee about all agent releases.
- Confirmed with v4.0.3 that `${VAR?}` rejects an unset variable but accepts an explicitly empty value, supporting the recommendation to validate nonempty inputs separately.
- YAML single quotes do not disable Buildkite interpolation. YAML double-quoted strings do not support a direct backslash-dollar escape; literal blocks and the demonstrated double-dollar syntax are valid.
- No authenticated pipeline upload or hosted Buildkite job was performed. Runtime shell behavior was tested locally; agent behavior was tested using dry runs.
