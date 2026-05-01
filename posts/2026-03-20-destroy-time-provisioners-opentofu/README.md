# How to Use Destroy-Time Provisioners in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, Destroy-Time, Infrastructure as Code, Cleanup

Description: Learn how to use destroy-time provisioners in OpenTofu to run cleanup tasks-such as deregistering from service registries or archiving data-before a resource is destroyed.

## Introduction

Destroy-time provisioners run just before a resource is destroyed. They are useful for graceful shutdown tasks: draining a load balancer, deregistering from a service discovery system, archiving logs, or sending a notification that a resource is being removed.

## Defining a Destroy-Time Provisioner

Set `when = destroy` inside the provisioner block:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.deploy.private_key_pem
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    # This runs at creation time (default)
    inline = ["sudo systemctl start myapp"]
  }

  provisioner "remote-exec" {
    # This runs just BEFORE the instance is destroyed
    when = destroy

    inline = [
      "sudo systemctl stop myapp",
      "sudo /opt/myapp/graceful-shutdown.sh",
    ]
  }
}
```

## Deregistering from a Service Registry

A common use case is removing the resource from Consul or another service discovery system:

```hcl
resource "aws_instance" "app" {
  # ...

  provisioner "local-exec" {
    # Deregister from Consul before the instance is terminated
    when    = destroy
    command = "consul services deregister -id=${self.id}"

    environment = {
      CONSUL_HTTP_ADDR  = var.consul_address
      CONSUL_HTTP_TOKEN = var.consul_token
    }
  }
}
```

## Sending a Notification Before Destruction

```hcl
resource "aws_rds_cluster" "main" {
  # ...

  provisioner "local-exec" {
    when = destroy

    # Notify the team before the database is destroyed
    command = <<-EOT
      curl -X POST "${var.slack_webhook_url}" \
        -H "Content-Type: application/json" \
        -d '{"text": "WARNING: RDS cluster ${self.id} is being destroyed in ${var.environment}"}'
    EOT
  }
}
```

## Important Limitation: No References to Other Resources or Data Sources

Destroy-time provisioners should avoid direct references to other resources or data sources. Use `self` for the resource being destroyed, and pass in any additional context through variables instead:

```hcl
provisioner "remote-exec" {
  when = destroy

  inline = [
    # VALID: self references work
    "echo 'Shutting down ${self.id}'",
    "echo 'IP was ${self.private_ip}'",
  ]
}
```

```hcl
provisioner "local-exec" {
  when = destroy

  # INVALID: Avoid referencing other resources directly during destroy
  # command = "deregister --cluster=${aws_ecs_cluster.main.name} --service=${self.id}"
  # Pass the needed value in via a variable instead
  command = "deregister --cluster=${var.cluster_name} --service=${self.id}"
}
```

## Interaction with `on_failure`

By default, a failed destroy-time provisioner stops the destroy operation. Use `on_failure = continue` to allow the destroy to proceed even if the provisioner fails:

```hcl
provisioner "remote-exec" {
  when = destroy

  # If graceful shutdown fails, continue with destroy anyway
  on_failure = continue

  inline = [
    "sudo /opt/app/graceful-shutdown.sh",
  ]
}
```

## Destroy-Time Provisioners with `tofu destroy`

Destroy-time provisioners run during `tofu destroy` and during `tofu apply` when a resource is being replaced. However, they do not run for tainted resources, and they do not run during replacement if `create_before_destroy = true`.

## Conclusion

Destroy-time provisioners are the safety net for graceful infrastructure teardown. Use them for deregistration, notification, and cleanup tasks-but keep them simple and tolerant of failure using `on_failure = continue` to prevent stuck destroy operations.
