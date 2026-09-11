# How to Fix Buildkite YAML Pipes and Multiline Shell Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, YAML, Bash, Troubleshooting

Description: Debug Buildkite command parsing by separating YAML blocks, shell pipelines, variable interpolation, and failure propagation.

---

A pipe in Buildkite YAML can mean either a multiline YAML string or a shell pipeline. Quoting and indentation decide which interpreter sees it. When commands appear to merge, stop early, or lose variables, inspect the value passed to the shell before changing the command itself.

Use a literal YAML block for several shell lines, and put substantial logic in a checked-in script. That reduces the number of quoting layers and makes the same behavior easier to reproduce locally.

## Use a literal block for separate commands

This step runs three shell lines:

```yaml
steps:
  - label: "Install and test"
    command: |
      cd app
      npm ci
      npm test
```

The `|` after `command:` is a YAML literal block marker. It preserves line breaks. The commands must be indented farther than the `command` key, using spaces rather than tabs.

A folded block changes the meaning:

```yaml
steps:
  - label: "Incorrect folded command"
    command: >
      cd app
      npm ci
      npm test
```

Those ordinary line breaks are folded into spaces, producing a command resembling `cd app npm ci npm test`. This is no longer three sequential commands. Use `>` only when you intentionally want a single long command wrapped across source lines, such as one upload command with several options.

A command list is another valid representation:

```yaml
steps:
  - label: "Install and test"
    commands:
      - "cd app"
      - "npm ci"
      - "npm test"
```

For nontrivial logic, prefer a script so shell selection, error handling, and working-directory assumptions stay together.

## Keep a shell pipe inside the command string

A shell pipeline belongs inside the YAML value:

```yaml
steps:
  - label: "Filter a report"
    command: |
      printf '%s\n' alpha beta gamma | sed -n '/beta/p'
```

Here the pipe between `printf` and `sed` reaches the shell. It connects one process's standard output to another's standard input. It is unrelated to YAML's block marker on the preceding line.

Use quotes around whole command strings that contain a colon followed by a space:

```yaml
steps:
  - command: 'printf "phase: tests\n"'
```

This avoids a YAML parser interpreting part of a command as a mapping. Shell quotes inside an otherwise plain YAML scalar do not always protect YAML-significant punctuation the way developers expect.

## Preserve errors through logging pipelines

A test command piped into `tee` can appear successful if the shell reports only the final process's exit status. Use Bash with `pipefail` in a checked-in script:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs
./scripts/run-tests.sh 2>&1 | tee logs/tests.log
```

Run it explicitly:

```yaml
steps:
  - label: "Tests with captured logs"
    command: "bash .buildkite/scripts/tests-with-log.sh"
    artifact_paths:
      - "logs/tests.log"
```

The [build script guide](https://buildkite.com/docs/pipelines/configure/writing-build-scripts) explains `pipefail` and exit-status capture. The agent shell can be configured, so do not assume a Bash-specific option works under every `/bin/sh` implementation.

If you need to perform additional work after a failing pipeline, capture its status deliberately and return the intended failure at the end. A successful cleanup or upload should not accidentally replace the test result.

## Distinguish YAML quotes from agent interpolation

Single quotes in YAML preserve a string for YAML parsing, but Buildkite's uploader still performs its own variable interpolation. If a variable belongs to the execution job, escape its dollar sign in normally uploaded YAML:

```yaml
steps:
  - label: "Show runtime target"
    command: |
      printf 'Target: %s\n' "$$TEST_TARGET"
    env:
      TEST_TARGET: "staging"
```

The agent turns `$$TEST_TARGET` into `$TEST_TARGET`, which the job shell later expands. If the upload uses `--no-interpolation`, write a single dollar sign instead. Keeping two would cause Bash to interpret `$$` as its process ID.

A checked-in shell script does not pass through YAML interpolation. It can contain ordinary `"$TEST_TARGET"` syntax, which is another reason to move complex commands out of the pipeline document.

## Protect dynamically generated YAML

For shell-generated documents, quote the heredoc delimiter:

```bash
#!/usr/bin/env bash
set -euo pipefail

cat <<'YAML' | buildkite-agent pipeline upload
steps:
  - label: "Show job ID"
    command: 'printf "%s\n" "$$BUILDKITE_JOB_ID"'
YAML
```

Without the quoted delimiter, the generating shell can expand variables and process IDs before the agent receives the YAML. Debugging only the source heredoc would then miss the transformed document that was actually uploaded.

Keep logging on standard error when a generator writes YAML or JSON to standard output. An informational `echo` inserted before `steps:` can corrupt the generated document.

## Inspect the parsed result

For a local preview with agent v4.0.3:

```bash
BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run .buildkite/pipeline.yml
```

The placeholder is sufficient for a local dry run and must not be used for a real upload. Inspect the command string in the output: are line breaks preserved, is the pipe present, and are runtime dollar references still there?

Then run `bash -n` on the checked-in script and execute its harmless portions locally. Finally, run a test build with the same shell and tools as production. A preview verifies parsing and interpolation; it does not execute the test runner or exercise agent hooks.

## Conclusion

Identify whether YAML, the uploader, or the shell is changing the command. Literal blocks preserve shell lines, `pipefail` preserves failures, and checked-in scripts keep quoting layers manageable.

## Official Documentation

- [Command step syntax](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Writing build scripts](https://buildkite.com/docs/pipelines/configure/writing-build-scripts)
- [Pipeline upload interpolation](https://buildkite.com/docs/agent/cli/reference/pipeline)
