# Validation Summary: How to Create Local Sensitive Files with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- hashicorp/local provider (~> 2.5), specifically `local_sensitive_file` and `local_file`
- hashicorp/tls provider (~> 4.0), specifically `tls_private_key` and `tls_self_signed_cert`
- HCL configuration language (`yamlencode`, `jsonencode`, `for_each`, heredoc strings)
- Unix file permissions (0600, 0700, 0644)

## Sources Consulted
- hashicorp/terraform-provider-local source for `local_sensitive_file` schema: https://github.com/hashicorp/terraform-provider-local/blob/main/internal/provider/resource_local_sensitive_file.go
- Terraform Registry — local_sensitive_file: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/sensitive_file
- hashicorp/terraform-provider-tls docs for `tls_private_key`: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/private_key.md
- Terraform Registry — tls_private_key: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key

## Issues Found
- **Incorrect default file permission for `local_sensitive_file`.** The post claimed in three places that the default `file_permission` is `0600`. The actual default, per the hashicorp/local provider source and registry docs, is `0700` for both `file_permission` and `directory_permission`.
  - Fixed the "Understanding local_sensitive_file vs local_file" section to state the resource defaults to 0700 permissions for both files and directories.
  - Fixed the misleading comment in the credentials example that called `file_permission = "0600"` the default — it is a tighter-than-default value, which the comment now reflects.
  - Fixed the Conclusion's parenthetical to read "(0700 for both files and directories)".

## Review Notes
- All `tls_private_key` attribute names used (`private_key_pem`, `private_key_openssh`, `public_key_openssh`) and algorithm casings (`RSA`, `ED25519`) match the current provider schema.
- `local_sensitive_file` correctly supports `content_base64` as an alternative to `content`, as shown in the Writing Binary Content section.
- The `tls_self_signed_cert` configuration (subject block, `validity_period_hours`, `allowed_uses`) matches the current provider schema.
- Setting `file_permission = "0600"` for non-executable secrets is a sensible recommendation (more restrictive than the 0700 default by removing the owner-execute bit), so the example code was retained — only the inaccurate "this is the default" framing was corrected.
- Minor stylistic note (not changed): the `time_rotating` resource mentioned in Security Best Practices lives in the `hashicorp/time` provider, which is not declared in `required_providers`; a reader following the suggestion will need to add it. Left as-is since the post only references the pattern, not implements it.
