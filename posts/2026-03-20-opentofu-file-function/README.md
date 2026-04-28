# How to Use the file Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the file function in OpenTofu to read the contents of files into strings for user data, policies, and configuration embedding.

## Introduction

The `file` function in OpenTofu reads the contents of a file and returns it as a string. It is one of the most commonly used functions for embedding scripts, policies, configurations, and SSH keys directly in your infrastructure code.

## Syntax

```hcl
file(path)
```

- **path** - absolute or module-relative path to the file
- Returns the file contents as a UTF-8 string
- Raises an error if the file does not exist

## Basic Examples

```hcl
output "file_contents" {
  value = file("${path.module}/config/app.json")
}

output "public_key" {
  value = file("${path.module}/keys/deploy.pub")
}
```

## Practical Use Cases

### Reading SSH Public Keys

```hcl
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = file("${path.module}/keys/deploy.pub")
}
```

### IAM Policy Documents

```hcl
resource "aws_iam_policy" "custom" {
  name   = "custom-policy"
  policy = file("${path.module}/policies/custom-policy.json")
}
```

### EC2 User Data

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  user_data     = file("${path.module}/scripts/userdata.sh")

  tags = {
    Name = "web-server"
  }
}
```

### Kubernetes YAML Manifests

```hcl
resource "kubernetes_manifest" "namespace" {
  manifest = yamldecode(file("${path.module}/manifests/namespace.yaml"))
}
```

### Nginx Configuration

```hcl
resource "kubernetes_config_map" "nginx" {
  metadata {
    name = "nginx-config"
  }

  data = {
    "nginx.conf"   = file("${path.module}/nginx/nginx.conf")
    "default.conf" = file("${path.module}/nginx/default.conf")
  }
}
```

## Step-by-Step Usage

1. Place your file in the module directory.
2. Reference it with `file("${path.module}/path/to/file")`.
3. Use `chomp(file(...))` to remove trailing newlines if needed.

```bash
tofu console

> file("./README.md")
# Returns file contents

```

## file vs templatefile

| Function | Use Case |
|----------|----------|
| `file(path)` | Read file as-is, no substitution |
| `templatefile(path, vars)` | Read file with variable substitution |

Use `file` for static content, `templatefile` for content with dynamic values.

## Common Pitfalls

- File contents must be valid UTF-8; binary files should use `filebase64`.
- The file must already exist on disk at the beginning of an OpenTofu run; it cannot be used to read files generated during the run.
- Missing files cause an error during evaluation (use `fileexists` to check first).

## Conclusion

The `file` function is fundamental to OpenTofu configurations that embed external file content. Use it consistently with `${path.module}/...` paths to ensure portability across different working directories.
