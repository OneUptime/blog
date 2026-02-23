# How to Fix Terraform JSON Decode Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, JSON

Description: Troubleshoot and fix Terraform JSON decode errors caused by invalid JSON syntax, encoding issues, and runtime parsing failures in jsondecode.

---

Terraform frequently works with JSON data, whether you are parsing API responses, reading configuration files, or decoding IAM policy documents. The `jsondecode()` function converts JSON strings into Terraform values, but when the JSON is malformed or unexpected, you get decode errors that can be tricky to track down.

## The Error

JSON decode errors in Terraform look like this:

```
Error: Error in function call

  on main.tf line 5, in locals:
   5:   config = jsondecode(file("${path.module}/config.json"))

Call to function "jsondecode" failed: invalid character '}' looking for
beginning of object key string.
```

Or:

```
Error: Error in function call

Call to function "jsondecode" failed: unexpected end of JSON input.
```

## Cause 1: Trailing Commas

JSON does not allow trailing commas. This is the most common syntax error, especially if you are used to writing HCL or JavaScript:

```json
{
  "name": "web-server",
  "port": 8080,
  "tags": ["web", "production",]
}
```

That trailing comma after `"production"` is invalid JSON. Remove it:

```json
{
  "name": "web-server",
  "port": 8080,
  "tags": ["web", "production"]
}
```

## Cause 2: Single Quotes Instead of Double Quotes

JSON requires double quotes. Single quotes are not valid:

```json
{
  'name': 'web-server'
}
```

Fix:

```json
{
  "name": "web-server"
}
```

## Cause 3: Unquoted Keys

JSON keys must be quoted strings:

```json
{
  name: "web-server",
  port: 8080
}
```

Fix:

```json
{
  "name": "web-server",
  "port": 8080
}
```

## Cause 4: Comments in JSON

Standard JSON does not support comments. If you have comments in your JSON file, `jsondecode()` will fail:

```json
{
  // This is a web server config
  "name": "web-server",
  "port": 8080  /* default port */
}
```

Remove all comments:

```json
{
  "name": "web-server",
  "port": 8080
}
```

If you need comments in your configuration files, consider using HCL files instead of JSON, or store the comments in a separate documentation file.

## Cause 5: Invalid Escape Sequences

JSON has strict rules about escape sequences in strings:

```json
{
  "path": "C:\Users\admin\config"
}
```

Backslashes must be escaped:

```json
{
  "path": "C:\\Users\\admin\\config"
}
```

Valid JSON escape sequences are: `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX`.

## Cause 6: BOM Characters and Encoding

Files saved with a UTF-8 BOM (byte order mark) cause invisible parsing failures. The BOM character is not visible in most text editors but breaks JSON parsing.

Check for BOM:

```bash
# Look for BOM in the first bytes
xxd config.json | head -1
# If you see "efbb bf" at the start, there is a BOM
```

Remove the BOM:

```bash
# On Linux/Mac
sed -i '1s/^\xEF\xBB\xBF//' config.json

# Or convert the file encoding
iconv -f UTF-8-BOM -t UTF-8 config.json > config_clean.json
```

## Cause 7: Empty or Whitespace-Only Input

Passing an empty string to `jsondecode()` fails:

```hcl
# This fails if the file is empty
locals {
  config = jsondecode(file("${path.module}/config.json"))
}
```

Add a guard:

```hcl
locals {
  raw_config = file("${path.module}/config.json")
  config     = length(trimspace(local.raw_config)) > 0 ? jsondecode(local.raw_config) : {}
}
```

## Cause 8: Decoding Non-JSON Data

Sometimes the variable or file you are trying to decode is not actually JSON. This happens frequently with data sources that return unexpected formats:

```hcl
# The external data source always returns a map of strings
data "external" "config" {
  program = ["python3", "${path.module}/get_config.py"]
}

# Wrong - the result is already a map, not a JSON string
locals {
  config = jsondecode(data.external.config.result)
}

# Right - use the result directly
locals {
  config = data.external.config.result
}

# But if one of the values IS a JSON string:
locals {
  nested_config = jsondecode(data.external.config.result["json_data"])
}
```

## Cause 9: Dynamic JSON from API Responses

When decoding JSON from HTTP data sources or external programs, the content might not be what you expect:

```hcl
data "http" "config" {
  url = "https://api.example.com/config"
}

# This fails if the API returns an error page (HTML) instead of JSON
locals {
  config = jsondecode(data.http.config.response_body)
}
```

Add error handling:

```hcl
locals {
  config = try(jsondecode(data.http.config.response_body), {
    error = "Failed to parse API response"
  })
}
```

Or validate the response first:

```hcl
locals {
  is_valid_json = can(jsondecode(data.http.config.response_body))
  config        = local.is_valid_json ? jsondecode(data.http.config.response_body) : {}
}
```

## Cause 10: Heredoc JSON Issues

Inline JSON in heredocs can have subtle issues:

```hcl
locals {
  # Wrong - HCL interpolation inside JSON can produce invalid JSON
  policy = jsondecode(<<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${var.bucket_name}/*"
  }]
}
EOF
  )
}
```

This might work, but if `var.bucket_name` contains characters that need JSON escaping (like quotes), it will break. A safer approach:

```hcl
locals {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:GetObject"
      Resource = "arn:aws:s3:::${var.bucket_name}/*"
    }]
  })
}
```

Use `jsonencode()` to create JSON and `jsondecode()` to read it. Do not build JSON strings manually.

## Debugging JSON Decode Errors

When the error message is not clear enough, use these strategies:

### Validate the JSON externally

```bash
# Use jq to validate and pretty-print
cat config.json | jq .

# Use Python for validation with detailed error messages
python3 -c "import json; json.load(open('config.json'))"
```

### Inspect the raw content

```hcl
# Output the raw string to see what Terraform is actually trying to decode
output "debug_raw" {
  value = file("${path.module}/config.json")
}
```

### Use terraform console

```bash
terraform console
> jsondecode("{\"valid\": true}")
{
  "valid" = true
}

> jsondecode("{invalid}")
# Shows the exact error
```

### Check for invisible characters

```bash
# Show all characters including invisible ones
cat -A config.json

# Or use hexdump
hexdump -C config.json | head -20
```

## Working with IAM Policies

IAM policies are one of the most common places where JSON decode errors show up in AWS Terraform configurations:

```hcl
# Instead of manually writing JSON policies, use the aws_iam_policy_document data source
data "aws_iam_policy_document" "bucket_policy" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]

    principals {
      type        = "AWS"
      identifiers = [var.role_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id
  policy = data.aws_iam_policy_document.bucket_policy.json
  # No jsondecode needed - the data source handles it
}
```

## Best Practices

1. **Use jsonencode() to create JSON** - Never build JSON strings by hand or with string interpolation.

2. **Use jsondecode() only for external data** - Configuration files, API responses, and data source outputs.

3. **Always wrap jsondecode() in try()** - When the input is not guaranteed to be valid JSON.

4. **Validate JSON files in CI** - Run `jq . < config.json` or equivalent in your pipeline.

5. **Prefer HCL over JSON for Terraform configs** - Terraform supports `.tf.json` files, but `.tf` files are easier to write and maintain.

## Conclusion

JSON decode errors in Terraform boil down to the input string not being valid JSON. The fix is to identify what makes it invalid, whether that is trailing commas, wrong quotes, encoding issues, or unexpected content from external sources. Use external tools like `jq` to validate JSON, prefer `jsonencode()` for creating JSON, and always handle potential failures with `try()` when decoding JSON from untrusted sources.
