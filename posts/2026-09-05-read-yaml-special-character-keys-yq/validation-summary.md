# Validation Summary: How to Read a YAML Key That Contains Dots, Dashes, or Other Special Characters with yq

## Status
validated

## Post Type
Tutorial / command-line configuration guide

## Technologies Covered
- Mike Farah yq v4.53.3
- YAML mappings, scalar tags, sequences, and multiple documents
- Bash quoting, environment variables, and exit statuses
- Kubernetes resource annotations

## Sources Consulted
- Official yq traversal documentation: https://mikefarah.gitbook.io/yq/operators/traverse-read
- Versioned traversal examples: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/doc/operators/traverse-read.md
- Official environment variable operators (versioned source): https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/doc/operators/env-variable-operators.md
- Official has documentation (versioned source): https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/doc/operators/has.md
- Official eval documentation (versioned source): https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/doc/operators/eval.md
- Official string operators documentation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/doc/operators/string-operators.md
- Traversal implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_traverse_path.go
- Key existence implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_has.go
- Wildcard matcher: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/matchKeyString.go
- Containment implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_contains.go
- Official v4.53.3 executable and its --help output: https://github.com/mikefarah/yq/releases/tag/v4.53.3
- GNU Bash installed manual, QUOTING and ENVIRONMENT sections (`man bash`). Online manual URLs were plausible but timed out during retrieval: https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
- POSIX environment variable definition: https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html
- YAML 1.2.2 specification, mapping keys, tags, and scalar syntax: https://yaml.org/spec/1.2.2/

## Issues Found
- The mutual-containment lookup was described as suitable for arbitrary maps, but a sequence-valued YAML key caused a type error. Added a string-tag filter before containment and clarified the explanation. Reproduced the failure and verified the corrected lookup returns only the literal wildcard entry.
- The control-character transport warning was too broad: environment values can contain control characters other than NUL. Narrowed the warning to NUL characters and arbitrary binary keys.
- The claim that most configuration schemas prohibit wildcard keys was unsupported. Made the guidance conditional on the actual schema prohibiting those characters.
- The versioned official traversal example uses adjacent brackets, not the extra-dot spelling attributed to the documentation. Reworded that sentence to state that v4.53.3 accepts the alternative syntax, which was verified directly.

## Review Notes
- Ran all 19 Bash code blocks with the official Darwin ARM64 yq v4.53.3 binary in a temporary directory. All completed successfully; displayed outputs matched, including the intentional missing-path null results. In-place updates operated only on temporary fixtures.
- Additional fixtures verified literal star/question-mark matching, exact has behavior, false/null/missing exit statuses, quote and newline keys, textual numeric-key traversal, and multi-document selection.
- Both star and question mark are wildcard characters in the versioned matcher. Bracket quoting and strenv prevent expression construction but do not disable these matching semantics.
- The original config has neither a literal star key nor the quoted team key. Those illustrative lookups therefore produce no result and null respectively; fixtures containing these keys verified successful lookup.
- Version-specific assertions were checked against v4.53.3, without assuming it is the latest release. The inspected operators and CLI options remain present in that version.
- The Kubernetes selector assumes kind/name identifies the intended resource within the input; multiple namespaces can contain matching resources.
- GitBook responses were inconsistent across retrieval methods, so official versioned documentation sources were used for operator verification. GNU web retrieval timed out; the installed Bash manual supplied the shell reference.
