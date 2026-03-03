# How to Use Path References (path.module path.root path.cwd) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Path References, Modules, Infrastructure as Code

Description: Learn how to use path.module, path.root, and path.cwd in Terraform to reference files relative to modules, the root configuration, and the working directory.

---

Terraform configurations often need to reference files on disk - scripts, templates, certificates, Lambda deployment packages, and more. Hardcoding file paths breaks as soon as you move the code or call it from a different module. Terraform solves this with three built-in path references: `path.module`, `path.root`, and `path.cwd`.

Understanding the difference between these three paths is essential for writing portable Terraform modules.

## The Three Path References

Here is what each one resolves to:

- **path.module** - The filesystem path of the module where the expression is defined
- **path.root** - The filesystem path of the root module (where you run `terraform apply`)
- **path.cwd** - The filesystem path of the current working directory (usually the same as `path.root`, but not always)

```hcl
# Print all three to see the difference
output "module_path" {
  value = path.module
}

output "root_path" {
  value = path.root
}

output "cwd_path" {
  value = path.cwd
}
```

If your project looks like this:

```text
/home/user/infra/
  main.tf           <- root module
  modules/
    lambda/
      main.tf       <- child module
      handler.py
```

Then when you run `terraform apply` from `/home/user/infra/`:

- In `main.tf`: all three paths are `/home/user/infra`
- In `modules/lambda/main.tf`: `path.module` is `/home/user/infra/modules/lambda`, while `path.root` and `path.cwd` are still `/home/user/infra`

## path.module - The Most Important One

`path.module` is what you will use most often. It gives you the directory of the current module, which lets you reference files that live alongside the module code.

```hcl
# modules/lambda/main.tf

# Reference a Python file in the same directory as this module
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/handler.py"  # file next to this .tf file
  output_path = "${path.module}/handler.zip"
}

resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
}
```

Without `path.module`, this would break if the module was called from a different directory. The path would be wrong because it would resolve relative to wherever you ran `terraform apply`.

### Loading Templates

Templates are another common use case for `path.module`:

```hcl
# modules/ecs-service/main.tf

# Load a task definition template from the module's templates directory
locals {
  task_definition = templatefile("${path.module}/templates/task-definition.json.tpl", {
    service_name   = var.service_name
    container_port = var.container_port
    image          = var.container_image
    cpu            = var.cpu
    memory         = var.memory
    log_group      = aws_cloudwatch_log_group.this.name
    region         = data.aws_region.current.name
  })
}

resource "aws_ecs_task_definition" "this" {
  family                = var.service_name
  container_definitions = local.task_definition
  # ... other configuration
}
```

### Loading Scripts and Config Files

```hcl
# modules/ec2-instance/main.tf

# Read a shell script from the module's scripts directory
resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Load user data script relative to the module
  user_data = file("${path.module}/scripts/bootstrap.sh")

  tags = {
    Name = var.instance_name
  }
}
```

## path.root - The Root Module Path

`path.root` always points to the top-level directory where you run Terraform commands. Use it when you need to reference files that live in the root module from within a child module.

```hcl
# modules/config/main.tf

# Reference a shared config file that lives in the root module
locals {
  global_config = yamldecode(file("${path.root}/config/global.yaml"))
}

# Use the config values
resource "aws_ssm_parameter" "config" {
  for_each = local.global_config.parameters

  name  = "/${var.environment}/${each.key}"
  type  = "String"
  value = each.value
}
```

This pattern is useful when you have a shared configuration file at the root level that multiple modules need to access.

### Sharing Certificates or Keys

```hcl
# modules/tls/main.tf

# Load a certificate from the root module's certs directory
resource "aws_iam_server_certificate" "this" {
  name             = "my-cert"
  certificate_body = file("${path.root}/certs/server.crt")
  private_key      = file("${path.root}/certs/server.key")
}
```

## path.cwd - The Working Directory

`path.cwd` returns the directory where you invoked the Terraform CLI. Most of the time, this is the same as `path.root`. But there are cases where they differ - for example, when using Terraform with automation tools that set the working directory to something different from the configuration directory.

```hcl
# In most cases, these are identical
output "root_vs_cwd" {
  value = {
    root = path.root
    cwd  = path.cwd
    same = path.root == path.cwd
  }
}
```

When would they differ? If you run:

```bash
# Run terraform from a different directory using -chdir
terraform -chdir=/path/to/config apply
```

In that case, `path.root` would be `/path/to/config` (where the configuration is), while `path.cwd` would be wherever you ran the command from.

Use `path.cwd` sparingly. In most configurations, `path.module` or `path.root` is what you actually want.

## Practical Patterns

### Module with Embedded Files

```text
modules/
  web-server/
    main.tf
    variables.tf
    outputs.tf
    files/
      nginx.conf
      startup.sh
    templates/
      vhost.conf.tpl
```

```hcl
# modules/web-server/main.tf

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Reference files within the module directory
  user_data = templatefile("${path.module}/templates/vhost.conf.tpl", {
    server_name = var.domain_name
    root_dir    = "/var/www/html"
  })
}

# Upload a config file using a provisioner
resource "null_resource" "upload_config" {
  provisioner "file" {
    source      = "${path.module}/files/nginx.conf"
    destination = "/etc/nginx/nginx.conf"
  }

  # ... connection details
}
```

### Generating Output Files

```hcl
# Write generated config to the root module directory
resource "local_file" "kubeconfig" {
  content  = module.eks.kubeconfig
  filename = "${path.root}/generated/kubeconfig.yaml"
}

resource "local_file" "inventory" {
  content = templatefile("${path.module}/templates/inventory.tpl", {
    servers = aws_instance.app[*].private_ip
  })
  filename = "${path.root}/generated/inventory.ini"
}
```

## Common Mistakes

The biggest mistake is using relative paths without a path reference:

```hcl
# Bad - breaks when called from a different directory
user_data = file("scripts/bootstrap.sh")

# Good - always resolves correctly
user_data = file("${path.module}/scripts/bootstrap.sh")
```

Another common mistake is using `path.root` when you should use `path.module`:

```hcl
# Bad - this breaks if the module is reused elsewhere
# because it assumes the file is relative to the root
source_file = "${path.root}/modules/lambda/handler.py"

# Good - references the file relative to the module itself
source_file = "${path.module}/handler.py"
```

## Wrapping Up

The three path references - `path.module`, `path.root`, and `path.cwd` - give you reliable ways to reference files from any location in your Terraform configuration. Use `path.module` for files that belong to the module, `path.root` for files in the root configuration, and `path.cwd` only when you specifically need the CLI working directory. Getting these right is what makes your modules truly portable and reusable.

For more Terraform reference patterns, see [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view) and [How to Reference Module Outputs in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-module-outputs/view).
