# Validation Summary: How to Use the textencodebase64 and textdecodebase64 Functions in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (textencodebase64, textdecodebase64 functions)
- Terraform (compatible HCL syntax)
- IANA character encodings (UTF-8, UTF-16LE, UTF-16BE, windows-1252)
- AWS provider (aws_instance, aws_ssm_parameter, aws_ssm_document)
- PowerShell (`-EncodedCommand` parameter)

## Sources Consulted
- OpenTofu `textencodebase64` documentation: https://opentofu.org/docs/language/functions/textencodebase64/
- OpenTofu `textdecodebase64` documentation: https://opentofu.org/docs/language/functions/textdecodebase64/
- AWS EC2 Windows user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/ec2-windows-user-data.html
- IANA Character Sets registry (referenced by the function specs)

## Issues Found
- **Incorrect claim about Windows EC2 user data encoding.** The first `textencodebase64` example included the comments "Windows EC2 user data scripts must be UTF-16LE encoded" and "Windows user data must be the Base64 of a UTF-16LE encoded script." This is not accurate — AWS Windows EC2 user data is provided as plain text wrapped in `<powershell>` or `<script>` tags (AWS handles base64 transport encoding itself; UTF-16LE is not required). Additionally, the example computed `encoded_script` but never used it; the `aws_instance` resource fed the raw `powershell_script` (with `<powershell>` wrapper) into `user_data`, which contradicted the comment. I rewrote the example so that the use case (encoding for tools that expect Base64 UTF-16LE, e.g., PowerShell `-EncodedCommand`) matches when UTF-16LE is genuinely required, and the encoded value is actually consumed via an `output`.

## Review Notes
- Function signatures `textencodebase64(string, encoding)` and `textdecodebase64(string, encoding)` match the official OpenTofu documentation.
- The note that `textencodebase64(str, "UTF-8")` produces the same result as `base64encode(str)` (and likewise for the decode counterpart) matches the official docs.
- The supported encoding names listed (`UTF-8`, `UTF-16LE`, `UTF-16BE`, `windows-1252`) are valid IANA names and are documented as supported. OpenTofu only supports a subset of IANA encodings; users should consult the docs for their specific OpenTofu version if they rely on less common encodings.
- The "Practical Example: PowerShell Encoded Command" section is technically correct: PowerShell's `-EncodedCommand` parameter does require a Base64-encoded UTF-16LE (Unicode) string.
- Note: when using AWS SSM `aws:runPowerShellScript`, the script body is already executed by PowerShell, so calling `powershell -EncodedCommand` from within is rarely necessary in practice — but the example is syntactically and semantically valid for illustrating the encoding mechanic.
