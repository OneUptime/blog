# Validation Summary: How to Fix Buildkite YAML Pipes and Multiline Shell Commands

## Status

validated

## Post Type

Technical troubleshooting guide with YAML configuration and Bash examples.

## Technologies Covered

- Buildkite Pipelines and Buildkite Agent v4.0.3
- YAML literal and folded scalars, quoting, and indentation
- Bash pipelines, exit statuses, variable expansion, and heredocs
- Unix utilities: printf, sed, tee, mkdir, and cat
- npm installation and test commands

## Sources Consulted

- Buildkite command step syntax: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite writing build scripts: https://buildkite.com/docs/pipelines/configure/writing-build-scripts
- Buildkite pipeline upload CLI, interpolation, and dry-run options: https://buildkite.com/docs/agent/cli/reference/pipeline
- Buildkite agent start CLI and configurable shell: https://buildkite.com/docs/agent/cli/reference/start
- Buildkite environment variables: https://buildkite.com/docs/pipelines/configure/environment-variables
- Buildkite Agent v4.0.3 pipeline upload implementation, inspected directly from the tagged source: https://raw.githubusercontent.com/buildkite/agent/v4.0.3/clicommand/pipeline_upload.go
- YAML 1.2.2 specification, particularly indentation, plain and single-quoted scalars, and literal/folded blocks: https://yaml.org/spec/1.2.2/
- Installed Bash reference manual (`man bash`), covering pipelines, special parameters, redirections, and the set builtin. The GNU online Bash manual could not be retrieved successfully; the local manual was used instead.
- GNU sed manual: https://www.gnu.org/software/sed/manual/sed.html
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm test documentation: https://docs.npmjs.com/cli/v11/commands/npm-test/

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The deliberately incorrect folded-block example correctly demonstrates how ordinary line breaks become spaces; its YAML syntax is valid.
- Parsed all seven YAML code blocks with PyYAML 6.0.2. Confirmed literal-block line breaks, folded-block spaces, the commands list, and preservation of command strings.
- Ran Bash syntax checks on every Bash code block and the shell commands extracted from YAML. Executed the report filter and colon-containing printf examples and confirmed their expected output.
- Checked runtime target expansion after substituting the documented uploader escape. Tested the quoted heredoc with a local cat stand-in for the uploader and confirmed that the generated YAML retains the literal double-dollar job reference. These checks do not substitute for executing the actual uploader.
- Executed the logging script in a temporary directory with stub test runners returning 0 and 7. Both outputs were captured in logs/tests.log, and the script returned the corresponding status, confirming failure propagation through tee.
- The v4.0.3 source confirms that dry-run output occurs without submitting a pipeline and bypasses job-ID and access-token checks. The example placeholder token is therefore harmless but unnecessary for this version. JSON is the default dry-run format, so preserved newlines appear as escaped newline sequences in the output.
- The npm example assumes app contains a suitable package.json, a synchronized package-lock.json or npm-shrinkwrap.json, and a test script. The logging example assumes the referenced test runner exists and is executable.
- Buildkite Agent was not installed locally. Agent-specific behavior was checked against official documentation and the exact version's source, without a real upload or test build. Agent hooks, artifact delivery, and project-specific npm tests were not exercised.
- The three Buildkite documentation links in the post resolve to the intended resources. The author link is a plausible GitHub profile URL and is not a technical reference.
