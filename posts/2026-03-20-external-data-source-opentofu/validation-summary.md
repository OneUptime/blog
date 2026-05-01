# Validation Summary: How to Use the external Data Source in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp `external` provider
- HCL
- Bash
- Python
- AWS CLI
- Git

## Sources Consulted
- OpenTofu data sources docs: https://opentofu.org/docs/language/data-sources/
- OpenTofu plan docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply docs: https://opentofu.org/docs/cli/commands/apply/
- HashiCorp external provider docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-external/main/docs/data-sources/external.md
- AWS CLI `describe-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Git `git-rev-parse` docs: https://git-scm.com/docs/git-rev-parse
- Git `git-log` docs: https://git-scm.com/docs/git-log
- Python `json` module docs: https://docs.python.org/3/library/json.html
- Python `subprocess` module docs: https://docs.python.org/3/library/subprocess.html

## Issues Found
- The basic `bash -c` example did not consume or parse the JSON input on `stdin`, which violates the external provider protocol. I updated it to parse the input before emitting JSON.
- The Python AWS example ignored non-zero `aws ec2 describe-instances` exit codes and could silently return an empty result on failure. I added explicit `returncode` handling so the script writes an error to `stderr` and exits non-zero, matching the provider contract.
- The Bash Git example built JSON by interpolating shell variables directly into a heredoc. That could produce invalid JSON when the commit message contains quotes or backslashes. I changed it to emit JSON through Python's `json.dump` and tightened revision handling with `git rev-parse --verify --end-of-options`.
- The generic Bash error-handling example also interpolated raw command output directly into JSON. I changed it to validate the incoming JSON query and serialize the result safely.
- The conclusion said every plan and apply executes the external program. That is not accurate: the provider docs say the program is re-run when state is refreshed, and OpenTofu docs say data reads can be deferred to apply when inputs are unknown. I corrected that wording.

## Review Notes
- `version = "~> 2.0"` for `hashicorp/external` remains valid with the current 2.x provider line, although it is broader than pinning to a more recent minor version.
- The external provider documentation is published by HashiCorp for the provider itself; the OpenTofu language and execution lifecycle behavior were cross-checked against the current OpenTofu docs.
- I verified the revised Python and Bash snippets for syntax locally, and I executed the basic `bash -c` example against the current Git repository to confirm it emits valid JSON.
