# Validation Summary: How to Create Lambda Extensions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda (Extensions API, layers, runtime environment)
- Terraform (HashiCorp/aws and HashiCorp/archive providers)
- Python 3 (Lambda runtime and extension language)
- Bash (wrapper script)
- IAM (roles, policies, managed policies)
- Datadog Lambda Extension (third-party example)

## Sources Consulted
- AWS Lambda Extensions API Reference — https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS Lambda Extensions overview — https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html
- Modifying the runtime environment / wrapper scripts — https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html
- AWS Lambda supported runtimes (deprecation schedule) — https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_lambda_layer_version` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform `archive_file` data source — https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Datadog Lambda Extension docs — https://docs.datadoghq.com/serverless/libraries_integrations/extension/

## Issues Found

1. **Python 3.9 listed as a compatible runtime (deprecated)**
   - All three `compatible_runtimes` declarations included `"python3.9"`, but AWS Lambda deprecated the python3.9 runtime on December 15, 2025. Since the post is dated 2026 and is presented as current guidance, listing 3.9 would cause `aws_lambda_layer_version` to advertise compatibility with an unavailable runtime.
   - Fixed by removing `"python3.9"` from all three `compatible_runtimes` arrays, leaving `["python3.10", "python3.11", "python3.12"]`.

2. **Python extension shebang placed on line 3 instead of line 1**
   - The original code block opened with `# extensions/telemetry-extension` (a file-path label), a blank line, and then `#!/usr/bin/env python3`. A shebang only takes effect when it is the first line of the file; if a reader copied the file verbatim, the script would not run as a Lambda extension (extensions are invoked as executables).
   - Fixed by moving the file-path label out of the code block (now part of the surrounding sentence) so the shebang is the literal first line.
   - Also removed the unused `import signal` (never referenced anywhere in the function body).

## Review Notes

- The Lambda Extensions API base URL, register/event-next endpoints, headers (`Lambda-Extension-Name`, `Lambda-Extension-Identifier`), and the `INVOKE`/`SHUTDOWN` event types are all accurate. Extensions do not receive an explicit `INIT` event over `/event/next` — they register during the Extension init sub-phase, so the post's coverage of the two events is correct.
- The `extensions/` directory placement at the root of the layer ZIP is correct, as is `/opt/wrapper-script` for the wrapper script (layers are extracted under `/opt/`, and this layer puts the file at the root with filename `wrapper-script`).
- The Datadog AWS account ID `464622532012` is correct. Layer version `49` is real but stale (current releases are much higher); readers should pin to whatever current version they require — left as-is since the post uses it as a representative example.
- Python 3.10 is scheduled to reach end-of-support on October 31, 2026 — still valid as of the validation date but worth flagging if the post is republished later in the year.
- Not flagged as an error, but worth noting for future iterations: `archive_file` `source { content = ... }` blocks produce files with default (non-executable) permissions inside the ZIP. Lambda requires extension files to be executable, so in practice users will need to either run `chmod +x` before zipping (e.g. via `source_dir` from a pre-prepared directory) or use a `null_resource`/`local-exec` step. The post does not make an incorrect claim about this, but readers following the snippet literally may hit an `exec format error` on first deploy.
