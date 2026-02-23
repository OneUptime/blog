# How to Use Provisioner on_failure Settings in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioners, Error Handling, Infrastructure as Code, DevOps

Description: Learn how to use the on_failure setting in Terraform provisioners to control whether resource creation continues or stops when a provisioner command fails.

---

Provisioners in Terraform can fail for all sorts of reasons: a package install fails, a script has a bug, SSH times out, or the remote service is not ready yet. When this happens, you need to decide whether the failure is critical enough to stop everything or whether the resource is still usable despite the provisioner not completing. The `on_failure` setting gives you that control.

## The Two Options

The `on_failure` argument accepts two values:

- `fail` (default) - The provisioner failure is treated as an error. The resource is tainted and will be destroyed and recreated on the next apply.
- `continue` - The failure is logged as a warning, but Terraform proceeds as if the provisioner succeeded. The resource is not tainted.

## Default Behavior: fail

When you do not specify `on_failure`, the default is `fail`. This means any provisioner error taints the resource.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # If this fails, the instance is tainted
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
}
```

If `apt-get install` fails (maybe a package repository is down), Terraform marks the instance as tainted. The next time you run `terraform apply`, Terraform will destroy the instance and create a new one, then try the provisioner again.

### What "Tainted" Means

A tainted resource exists in your cloud provider but Terraform considers it broken. It shows up in `terraform plan` as needing replacement:

```
# aws_instance.web is tainted, so must be replaced
-/+ resource "aws_instance" "web" {
    ...
```

The resource is not automatically destroyed when the provisioner fails. It stays running until the next apply. This means you might have partially configured instances sitting in your infrastructure.

## Using on_failure = continue

When a provisioner is optional - meaning the resource is usable even if the provisioner does not complete - use `on_failure = continue`.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Critical: must succeed
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl start nginx",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Optional: nice to have but not critical
  provisioner "local-exec" {
    command    = "curl -X POST ${var.monitoring_webhook} -d '{\"host\": \"${self.public_ip}\"}'"
    on_failure = continue
  }

  # Optional: notification
  provisioner "local-exec" {
    command    = "python3 scripts/notify-deploy.py --ip ${self.public_ip} --env ${var.environment}"
    on_failure = continue
  }
}
```

In this example, the first provisioner (nginx installation) uses the default `fail` behavior because the instance is useless without nginx. The monitoring registration and notification provisioners use `continue` because failing to notify does not make the instance broken.

## Practical Patterns

### Critical Setup with Optional Monitoring

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # Step 1: Install application (critical)
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y docker.io",
      "sudo docker pull ${var.app_image}",
      "sudo docker run -d -p 80:8080 ${var.app_image}",
    ]
    # Default on_failure = fail
  }

  # Step 2: Register with monitoring (optional)
  provisioner "local-exec" {
    command    = <<-EOT
      curl -s -X POST https://monitoring.internal/api/v1/hosts \
        -H "Authorization: Bearer ${var.monitoring_token}" \
        -d '{"ip":"${self.public_ip}","name":"${self.tags["Name"]}"}'
    EOT
    on_failure = continue
  }

  # Step 3: Register with service discovery (optional)
  provisioner "local-exec" {
    command    = <<-EOT
      consul kv put "services/app/${self.id}" \
        '{"ip":"${self.private_ip}","port":80}'
    EOT
    on_failure = continue
  }
}
```

### Graceful Destruction

Destruction-time provisioners are particularly good candidates for `on_failure = continue`. When you are tearing down infrastructure, you do not want cleanup tasks to block the destruction.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Deregister from load balancer before destroying
  provisioner "local-exec" {
    when       = destroy
    command    = "aws elbv2 deregister-targets --target-group-arn ${self.tags["TargetGroupArn"]} --targets Id=${self.id}"
    on_failure = continue  # Don't block destruction if deregistration fails
  }

  # Remove from monitoring
  provisioner "local-exec" {
    when       = destroy
    command    = "curl -X DELETE https://monitoring.internal/api/v1/hosts/${self.id}"
    on_failure = continue  # Don't block destruction
  }

  # Remove DNS record
  provisioner "local-exec" {
    when       = destroy
    command    = "python3 scripts/remove-dns.py --instance-id ${self.id}"
    on_failure = continue  # Don't block destruction
  }
}
```

If you use `on_failure = fail` on destruction-time provisioners and they fail, the resource will not be destroyed. This can leave your infrastructure in a stuck state where `terraform destroy` keeps failing.

### Handling Flaky External Services

If your provisioner depends on an external service that is sometimes unavailable, wrap it with retry logic and use `on_failure` appropriately.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Retry-capable provisioner with fallback
  provisioner "local-exec" {
    command = <<-EOT
      for i in 1 2 3 4 5; do
        curl -s -f -X POST https://api.pagerduty.com/services \
          -H "Authorization: Token token=${var.pd_token}" \
          -d '{"service":{"name":"web-${self.id}"}}' && break
        echo "Attempt $i failed, retrying in 10 seconds..."
        sleep 10
      done
    EOT
    on_failure = continue
  }
}
```

The script retries five times with a 10-second delay. If all retries fail, `on_failure = continue` prevents the instance from being tainted.

## When Multiple Provisioners Are Involved

Provisioners execute in the order they are defined. The `on_failure` setting only affects the behavior of the specific provisioner it is set on. If an early provisioner with `on_failure = fail` fails, subsequent provisioners (even those with `continue`) are skipped.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # Provisioner 1: Critical (default fail)
  provisioner "remote-exec" {
    inline = ["sudo apt-get install -y nginx"]
  }

  # Provisioner 2: Optional
  provisioner "local-exec" {
    command    = "echo ${self.public_ip} >> inventory.txt"
    on_failure = continue
  }

  # Provisioner 3: Critical (default fail)
  provisioner "remote-exec" {
    inline = ["sudo systemctl start nginx"]
  }
}
```

If Provisioner 1 fails, Provisioners 2 and 3 are skipped entirely, and the resource is tainted. If Provisioner 2 fails (with `continue`), Provisioner 3 still runs. If Provisioner 3 fails, the resource is tainted.

## Checking Provisioner Status After Apply

Terraform does not provide a built-in way to check whether a provisioner with `on_failure = continue` succeeded or failed after the apply. You see it in the output during the apply, but it is not stored in state.

If you need to track provisioner results, log them externally:

```hcl
provisioner "local-exec" {
  command = <<-EOT
    if curl -s -f ${var.webhook_url} -d '{"instance":"${self.id}"}'; then
      echo "SUCCESS: webhook for ${self.id}" >> provisioner-results.log
    else
      echo "FAILED: webhook for ${self.id}" >> provisioner-results.log
    fi
  EOT
  on_failure = continue
}
```

## Best Practices

1. **Default to fail for critical provisioners.** If the resource is not usable without the provisioner completing, keep the default.

2. **Use continue for non-critical side effects.** Notifications, monitoring registration, and logging are good candidates.

3. **Always use continue for destruction-time provisioners.** You rarely want cleanup tasks to block resource destruction.

4. **Add retry logic for flaky operations.** Instead of relying solely on `on_failure`, build retries into the command itself.

5. **Log provisioner results externally.** Since Terraform does not track provisioner outcomes in state, keep your own records.

## Summary

The `on_failure` setting is a simple but important control for provisioner error handling. Use `fail` when the provisioner is essential to the resource's functionality, and `continue` when the provisioner performs optional tasks like monitoring, notifications, or cleanup. For destruction-time provisioners, `continue` is almost always the right choice to prevent blocked teardowns.

For more on provisioners, check out our posts on [local-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-local-exec-provisioner/view) and [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view) provisioners.
