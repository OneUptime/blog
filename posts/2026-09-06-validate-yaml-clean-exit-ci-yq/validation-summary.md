# Validation Summary: How to Validate YAML with yq and Return a Clean Exit Code in CI

## Status
validated

## Post Type
Tutorial / practical CI validation guide.

## Technologies Covered
- Mike Farah yq v4.53.6
- YAML syntax, tags, document streams, and duplicate mapping keys
- Bash conditionals, command substitution, globbing, redirection, and pipeline exit status
- GitHub Actions workflow steps
- Kubernetes structural validation boundaries

## Sources Consulted
- [yq Evaluate](https://mikefarah.gitbook.io/yq/commands/evaluate.md).
- [yq Evaluate All](https://mikefarah.gitbook.io/yq/commands/evaluate-all.md).
- [yq Boolean Operators, version-pinned official documentation](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/boolean-operators.md).
- [yq Has](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/has.md).
- [yq Tag](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/tag.md).
- [yq Length](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/length.md).
- [yq Compare Operators](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/compare.md).
- [yq v4.53.6 release](https://github.com/mikefarah/yq/releases/tag/v4.53.6), plus the release binary's `--help` and `--version` output.
- [yq stream evaluator source](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/stream_evaluator.go) and [all-at-once evaluator source](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/all_at_once_evaluator.go), specifically their synthetic-null fallback for empty input.
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/).
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell).
- Installed Bash reference manual (`man bash`): pipelines, pathname expansion, simple command expansion, and shell options. The corresponding GNU online manual pages timed out; the local manual and runtime checks were used instead.

## Issues Found
- **Incorrect explanation of empty input:** The post attributed `yq -e '.' empty.yml` failure to a no-result stream and implied that `length > 0` rejects an empty file in the `eval-all` policy. In v4.53.6, both evaluators supply a synthetic null node when no documents are read. Runtime checks showed `eval 'tag'` returning `!!null` and `eval-all '[.] | length'` returning `1`. Updated the existing explanatory paragraphs to identify the null result and explain that the `!!map` predicate rejects the empty file. The commands already return the intended statuses and did not need modification.

## Review Notes
- Downloaded and executed the official Darwin ARM64 v4.53.6 binary in a temporary directory; its version output matched the post.
- All 14 Bash code blocks passed `bash -n`. Executed the examples with valid and malformed fixtures, including a filename containing a space. Parsed the GitHub Actions step and executed its run script locally; valid files passed and malformed files failed. No hosted GitHub Actions job was launched.
- The service policy accepted a valid service and rejected a quoted port, zero, 65536, an empty name, missing fields, a scalar root, and an array root.
- Presence checks correctly accepted an existing false or null value, while the separate boolean-tag check accepted false and rejected null or absence.
- Ordinary evaluation with `-e` accepted both true/false document orderings. The `eval-all` policy rejected mixed valid/invalid documents in either order, as well as empty and null inputs, and accepted two valid documents.
- Confirmed empty-file parse success, empty-file `-e` failure, malformed-YAML diagnostics on stderr, and duplicate-key acceptance and emission. YAML requires unique mapping keys; yq parse success alone does not establish full specification or application-schema compliance.
- Confirmed that a failing yq command piped to successful sed returns zero without pipefail and nonzero with pipefail, and that assignment command substitution preserves the lookup failure in an if condition.
- The CI snippet assumes Mike Farah yq v4 is installed and repository files are available. Its unmatched glob fails by attempting to open the literal path under default Bash settings; repositories should choose their own explicit missing-file policy, as the post advises.
- The listed operators and flags are supported by the tested release. Structural checks intentionally provide only the stated guarantees; they do not establish Kubernetes API-schema validity or validate port types through truthiness alone.
