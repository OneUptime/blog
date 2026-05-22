# Validation Summary: How to Use the md5 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform hash and crypto functions (`md5`, `filemd5`, `sha1`, `sha256`, `sha512`, `bcrypt`)
- Terraform filesystem and template functions (`file`, `templatefile`)
- AWS S3 objects and ETags
- AWS EC2 instance user data
- MD5 security considerations

## Sources Consulted
- HashiCorp Terraform `md5` function documentation: https://docs.hashicorp.com/terraform/language/functions/md5
- HashiCorp Terraform `filemd5` function documentation: https://docs.hashicorp.com/terraform/language/functions/filemd5
- HashiCorp Terraform `sha256` function documentation: https://docs.hashicorp.com/terraform/language/functions/sha256
- HashiCorp AWS Provider `aws_s3_object` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- HashiCorp AWS Provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS S3 object integrity and ETag documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html
- RFC 6151, Updated Security Considerations for MD5: https://www.rfc-editor.org/rfc/rfc6151

## Issues Found
- The S3 ETag explanation was incomplete because S3 ETags are MD5 digests only for certain non-multipart objects, such as plaintext or SSE-S3 objects. Updated the wording to include the plaintext/SSE-S3 caveat.
- The multi-file change detection example used `md5(join("", values(local.config_files)))`, which can miss some coordinated changes because concatenating file contents without boundaries is ambiguous. Changed it to `md5(jsonencode(local.config_files))` so file names and value boundaries are included in the hashed input.
- The EC2 `user_data` example said the hash would force instance replacement, but current AWS provider behavior requires `user_data_replace_on_change = true` for that behavior. Added that argument.
- The `filemd5` section said `filemd5` is more efficient because it avoids loading the file as a Terraform string. Official Terraform documentation instead emphasizes that `filemd5` can hash file contents directly and works for binary files, while `file()` accepts only UTF-8 text. Updated the explanation accordingly.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`.
