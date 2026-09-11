# Validation Summary: How to Pass Runtime Values Between Buildkite Steps

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Buildkite pipelines, agent CLI, build metadata, dependencies, artifacts, and dynamic pipeline uploads
- Bash scripting and process environments
- Node.js and package.json
- Python 3 and JSON serialization
- YAML pipeline configuration

## Sources Consulted

- Buildkite metadata CLI: https://buildkite.com/docs/agent/cli/reference/meta-data
- Using build metadata: https://buildkite.com/docs/pipelines/configure/build-meta-data
- Dynamic pipelines: https://buildkite.com/docs/pipelines/configure/dynamic-pipelines
- Pipeline upload and interpolation: https://buildkite.com/docs/agent/cli/reference/pipeline
- Step dependencies: https://buildkite.com/docs/pipelines/configure/depends-on
- Command step attributes: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Environment variable scope and concurrent uploads: https://buildkite.com/docs/pipelines/configure/environment-variables
- Artifact CLI: https://buildkite.com/docs/agent/cli/reference/artifact
- Buildkite agent v4.0.3 pipeline upload implementation: https://github.com/buildkite/agent/blob/v4.0.3/clicommand/pipeline_upload.go
- Buildkite agent v4.0.3 required API configuration fields: https://github.com/buildkite/agent/blob/v4.0.3/clicommand/global.go
- Node.js print/eval CLI: https://nodejs.org/api/cli.html#-p---print-script
- Node.js CommonJS and JSON file loading: https://nodejs.org/api/modules.html#file-modules
- Python JSON serialization: https://docs.python.org/3/library/json.html#json.dumps
- Python environment access: https://docs.python.org/3/library/os.html#os.environ
- Installed Bash built-in documentation: `help export`, `help trap`, and `help set`. GNU web manual requests failed, so built-in help and local execution were used for shell verification.
- Author link checked: https://github.com/nawazdhandala

## Issues Found

- The producer's missing-version check accepted an absent package.json version because `node -p` printed the non-empty string `undefined`. Null and other non-string values could also pass the shell check. Changed the Node expression to return an empty string for non-string values, allowing the existing non-empty guard to stop the script before publishing invalid metadata. Tested valid, absent, null, numeric, and empty version fields.

## Review Notes

- Confirmed metadata is build-scoped, missing required reads fail, repeated writes replace the value, and producer/consumer ordering needs a dependency. Separate producer keys, artifact use for larger data, and avoiding secrets in metadata are consistent with Buildkite documentation.
- Confirmed the YAML step attributes and JSON pipeline format, step-level environment values, artifact upload command, and `--no-interpolation` and `--dry-run` flags. The warning about concurrent uploads changing build-level environment is documented by Buildkite.
- The agent v4.0.3 access-token note was retained: its embedded APIConfig marks AgentAccessToken as required during initial configuration loading. The dry-run branch skips the actual upload. This version-specific detail was checked against tagged source, not an installed agent binary.
- All four Bash blocks passed `bash -n`. Local executions verified version rejection, consumer file output, failure on missing metadata, exported generator input, and temporary-file removal after a successful mocked upload. Python output round-tripped quotes, dollar signs, and embedded newlines through JSON without changing the environment value.
- Buildkite CLI calls in local execution were mocked. No live build, cross-agent scheduling, API permissions, queue access, or actual artifact/pipeline upload was tested; the Buildkite agent is not installed locally. A dry run does not replace those integration checks or full server-side validation.
- The generated example assumes the reader supplies package-from-env.sh as described. The two pipeline examples are alternatives; combining them unchanged would duplicate step keys. Package-specific version policy remains the reader's responsibility, as the post states.
- The post's documentation links resolved to the intended official resources. No deprecated API usage was found in the examples.
