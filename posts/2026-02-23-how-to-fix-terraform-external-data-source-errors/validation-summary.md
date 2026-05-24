# Validation Summary: How to Fix Terraform External Data Source Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform
- HashiCorp `external` data source provider (hashicorp/external)
- HCL configuration language
- Python (for example scripts)
- Bash (for example scripts)
- `jq` (JSON processor)
- PowerShell (cross-platform example)

## Sources Consulted
- Official Terraform external data source docs: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/data_source
- Terraform `pathexpand` function: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform built-in functions: `tonumber`, `jsondecode`, `substr`
- Terraform `terraform_data` resource (introduced in Terraform 1.4, March 2023)
- Python `signal` module documentation (signal.alarm, SIGALRM are Unix-only)
- GNU `timeout` command (coreutils) — exit code 124 on timeout

## Issues Found
No technical issues found.

All key claims verified against official docs:
- External data source protocol (stdin JSON query, stdout JSON result, exit code semantics, stderr for logs) is accurately described.
- The "all result values must be strings" constraint is correct — numbers, booleans, lists, and nested objects are not allowed.
- The `program` argument is correctly described as a list with the executable first and arguments following.
- The `query` argument and `result` map-of-strings attribute are accurate.
- HCL syntax in all examples is valid.
- Python and Bash example scripts are syntactically correct and follow the documented protocol.
- `pathexpand("~")` on Unix returns a path starting with `/`; on Windows it returns a drive letter (e.g. `C:\Users\...`), so the platform-detection trick in Error 7 is correct.
- `terraform_data` is indeed available in Terraform 1.4+ as a built-in replacement for `null_resource`.
- The `timeout` exit code `124` is the correct GNU coreutils signal-on-timeout exit code.

## Review Notes
- The error message text shown in the snippets is illustrative/paraphrased rather than verbatim from the provider — the provider's actual wording has evolved across versions, but the gist (program not found, invalid JSON, non-string values, non-zero exit) is correct.
- The Python `signal.alarm` / `SIGALRM` timeout approach is Unix-only and won't work on Windows. This is a minor caveat not called out in the post, but the post overall is Unix-leaning, so this is acceptable.
- `chmod +x scripts/get_data.py` is only strictly necessary when invoking the script directly (e.g., `program = ["${path.module}/scripts/get_data.py"]`). When invoking through an interpreter as shown (`program = ["python3", ...]`), the executable bit on the .py file isn't required. Not incorrect advice, just slightly over-cautious — leaving as is.
- `terraform_data` is listed as an alternative for "simple data passing" — it's a managed resource (not a data source) primarily designed to replace `null_resource` and store values across plan/apply cycles. It's a reasonable mention in context.
