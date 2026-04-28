# Validation Summary: How to Use the File Hash Functions (filemd5, filesha256) in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Hash functions: `filemd5`, `filesha1`, `filesha256`, `filesha512`, `filebase64sha256`, `filebase64sha512`
- AWS Lambda (`aws_lambda_function`, `source_code_hash`)
- AWS S3 (`aws_s3_object`)
- AWS EC2 launch templates (`aws_launch_template`)
- `null_resource` triggers and `local-exec` provisioner
- `fileset` function

## Sources Consulted
- OpenTofu language functions documentation: https://opentofu.org/docs/language/functions/filemd5/, /filesha1/, /filesha256/, /filesha512/, /filebase64sha256/, /filebase64sha512/
- OpenTofu `file()` function docs (UTF-8 requirement): https://opentofu.org/docs/language/functions/file/
- Terraform AWS provider — `aws_s3_object` resource (etag vs content_md5): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- Terraform AWS provider — `aws_lambda_function` (`source_code_hash` expects base64 SHA256): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS S3 PutObject API — `Content-MD5` header is base64-encoded per RFC 1864: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
- Hash output sizes verified mathematically (MD5=128b/32hex, SHA1=160b/40hex, SHA256=256b/64hex/44 base64, SHA512=512b/128hex/88 base64)

## Issues Found

1. **Incorrect S3 attribute usage (`content_md5` vs `etag`)** — The "S3 Object Upload with Verification" example used `content_md5 = filemd5(...)`. This is wrong: the AWS provider passes `content_md5` directly as the AWS S3 `Content-MD5` request header, which (per RFC 1864 and AWS docs) must be a base64-encoded MD5 digest. `filemd5()` returns hex, so AWS would reject the upload. The canonical pattern (used in every other post in this blog and in HashiCorp's own docs) is `etag = filemd5(...)`, where `etag` acts as a change-trigger. **Fix:** Replaced `content_md5` with `etag` in both the S3 example and the Step-by-Step Usage list, and updated the inline comment.

2. **Misleading equivalence claim for `file()` + hash on binary files** — The "Why Use File Functions vs file() + hash()" section showed `sha256(file("path/to/file.zip"))` as "Equivalent but loads file into string first" and described the only benefit as memory efficiency. This is incorrect: OpenTofu's `file()` function requires the file to be valid UTF-8 text and will error on binary files like ZIP archives. So the alternative isn't merely less efficient — it doesn't work at all for binary content, which is a much more important reason to use the file-hash functions. **Fix:** Updated the example to use a `.txt` file in the `file()` variant, and rewrote the explanatory paragraph to clarify that the file-hash functions read raw bytes (handling binary files) while `file()` requires UTF-8 text.

## Review Notes

- Hash output sizes in the table are all correct (MD5 32-hex, SHA1 40-hex, SHA256 64-hex, SHA512 128-hex, base64 SHA256 44 chars, base64 SHA512 88 chars).
- `source_code_hash = filebase64sha256(...)` for Lambda is correct — AWS Lambda expects a base64-encoded SHA256 digest.
- `nodejs18.x` Lambda runtime is named correctly. Note that Node.js 18 entered AWS Lambda deprecation in 2025; future revisions could use `nodejs20.x` or `nodejs22.x`. Not corrected because the post is about hash functions, not runtime selection, and the runtime string itself is syntactically valid.
- `fileset(...)` returns a set of strings; the example wraps it with `tolist(...)` before `sort(...)`. `sort()` accepts a list, so the explicit conversion is fine (and arguably clearer than relying on auto-conversion).
- `working_dir` is the correct attribute name for `local-exec` provisioner.
- The "Equivalent String Function" column in the table (e.g., `md5(file(path))`) is conceptually accurate for UTF-8 text files but, like the comparison section that was fixed, would not work for binary files. Left as-is since the table is positioned as a conceptual mapping and the binary-file caveat is now covered explicitly in the comparison section below.
