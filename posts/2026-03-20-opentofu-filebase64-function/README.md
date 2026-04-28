# How to Use the filebase64 Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the filebase64 function in OpenTofu to read binary files and encode them as Base64 strings for embedding in resource configurations.

## Introduction

The `filebase64` function in OpenTofu reads a file and returns its contents as a Base64-encoded string. Unlike `file()`, it handles binary files correctly and is required wherever a resource attribute expects Base64-encoded file content.

## Syntax

```hcl
filebase64(path)
```

- Reads the file at the given path
- Returns the Base64-encoded contents
- Works with binary files (unlike `file()`)

## Basic Examples

```hcl
output "cert_base64" {
  value = filebase64("${path.module}/certs/server.crt")
}

output "binary_file_b64" {
  value = filebase64("${path.module}/assets/image.png")
}
```

## Practical Use Cases

### EC2 User Data

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  # user_data expects Base64-encoded content
  user_data = filebase64("${path.module}/scripts/userdata.sh")
}
```

### ACM Certificate Import

```hcl
resource "aws_acm_certificate" "imported" {
  certificate_body  = file("${path.module}/certs/certificate.pem")
  private_key       = file("${path.module}/certs/private.key")
  certificate_chain = file("${path.module}/certs/chain.pem")
}
```

### Lambda Deployment from ZIP

```hcl
resource "aws_lambda_function" "api" {
  filename         = "${path.module}/dist/function.zip"
  function_name    = "api-function"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/dist/function.zip")

  tags = {
    Name = "api-function"
  }
}
```

### Kubernetes TLS Secret

```hcl
resource "kubernetes_secret" "tls" {
  metadata {
    name      = "app-tls"
    namespace = "default"
  }

  # Use binary_data when passing already-Base64-encoded values from filebase64.
  # The provider auto-encodes values in `data`, so using `data` here would double-encode.
  binary_data = {
    "tls.crt" = filebase64("${path.module}/certs/tls.crt")
    "tls.key" = filebase64("${path.module}/certs/tls.key")
  }

  type = "kubernetes.io/tls"
}
```

### Embedding Binary Assets in S3

```hcl
resource "aws_s3_object" "logo" {
  bucket         = aws_s3_bucket.assets.id
  key            = "images/logo.png"
  content_base64 = filebase64("${path.module}/assets/logo.png")
  content_type   = "image/png"
}
```

## Step-by-Step Usage

1. Identify binary or text files that need Base64 encoding.
2. Use `filebase64(path)` to read and encode.
3. Pass to attributes expecting Base64 content (`user_data`, etc.).

```bash
tofu console

> filebase64("./small-file.txt")
"aGVsbG8gd29ybGQ="
```

## file vs filebase64

| Function | Use Case | Binary Safe |
|----------|----------|-------------|
| `file(path)` | Text files, returns string | No |
| `filebase64(path)` | Any file, returns Base64 | Yes |

Use `filebase64` when the target attribute expects Base64 or when the file may be binary.

## Conclusion

The `filebase64` function is the correct choice in OpenTofu whenever you need to embed file contents in Base64 format - which includes EC2 launch template `user_data`, Kubernetes secrets, and any other resource attribute that expects Base64-encoded binary data.
