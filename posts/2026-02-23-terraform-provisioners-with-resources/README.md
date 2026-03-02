# How to Use Provisioners with Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioner, Infrastructure as Code, Configuration Management, DevOps

Description: Learn how to attach provisioners to Terraform resources for post-creation configuration, bootstrapping, and integration with external systems during the resource lifecycle.

---

Terraform manages infrastructure declaratively, but sometimes you need to run imperative actions tied to a resource's lifecycle. Provisioners fill that gap. They let you execute commands, copy files, or run scripts when a resource is created or destroyed. While Terraform recommends using provisioners as a last resort, knowing how to use them correctly is essential for real-world infrastructure management.

This post focuses on how provisioners interact with resource lifecycle events, how to control execution order, and how to handle failures gracefully.

## Where Provisioners Live

Provisioners are defined inside a resource block. They run as part of that resource's create or destroy operations. They are not standalone - they are always attached to a resource.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.subnet_id

  # This provisioner runs after the instance is created
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
}
```

The `self` reference inside the provisioner block refers to the parent resource. You can use it to access any of the resource's attributes, like `self.public_ip` or `self.id`.

## Creation-Time vs. Destruction-Time Provisioners

By default, provisioners run when the resource is created. You can also configure them to run when the resource is destroyed using the `when` argument.

### Creation-Time Provisioner

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Runs when the instance is first created
  provisioner "local-exec" {
    command = "echo 'Instance ${self.id} created at ${timestamp()}' >> deployment.log"
  }
}
```

Creation-time provisioners run only once - when the resource is first created. If you later modify the resource and Terraform updates it in place, the provisioner does not run again. It only runs again if the resource is destroyed and recreated.

### Destruction-Time Provisioner

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Runs when the instance is about to be destroyed
  provisioner "local-exec" {
    when    = destroy
    command = "python3 scripts/deregister-instance.py --instance-id ${self.id}"
  }
}
```

Destruction-time provisioners run before the resource is destroyed. This is useful for cleanup tasks like deregistering from a service discovery system, draining connections from a load balancer, or sending a notification.

## Multiple Provisioners on a Single Resource

You can define multiple provisioners on a single resource. They execute in the order they are defined.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.subnet_id

  # Step 1: Copy the configuration file
  provisioner "file" {
    source      = "config/nginx.conf"
    destination = "/tmp/nginx.conf"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Step 2: Install nginx and apply the configuration
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo cp /tmp/nginx.conf /etc/nginx/nginx.conf",
      "sudo nginx -t",
      "sudo systemctl restart nginx",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Step 3: Log the deployment locally
  provisioner "local-exec" {
    command = "echo 'Web server ${self.public_ip} configured at ${timestamp()}' >> deployment.log"
  }

  # Cleanup on destroy
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Web server ${self.id} being destroyed' >> deployment.log"
  }
}
```

The provisioners execute in order: file copy, remote-exec, then local-exec. If any provisioner fails (and `on_failure` is set to the default of `fail`), subsequent provisioners are skipped.

## The Connection Block

Remote provisioners (`remote-exec` and `file`) need a way to connect to the resource. The `connection` block defines how.

You can define the connection block at the resource level (shared by all provisioners) or at the provisioner level (specific to that provisioner).

### Resource-Level Connection

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Shared connection for all provisioners
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # Both provisioners use the resource-level connection
  provisioner "file" {
    source      = "scripts/setup.sh"
    destination = "/tmp/setup.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/setup.sh",
      "/tmp/setup.sh",
    ]
  }
}
```

### Provisioner-Level Connection

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # This provisioner connects through a bastion host
  provisioner "remote-exec" {
    inline = ["sudo apt-get update"]

    connection {
      type         = "ssh"
      user         = "ubuntu"
      private_key  = file(var.private_key_path)
      host         = self.private_ip

      bastion_host = var.bastion_ip
      bastion_user = "ubuntu"
      bastion_private_key = file(var.bastion_key_path)
    }
  }
}
```

## Provisioners and Resource Dependencies

Provisioners inherit the dependency graph of their parent resource. If resource B depends on resource A, then B's provisioners will not run until A is fully created (including A's own provisioners).

```hcl
resource "aws_instance" "db" {
  ami           = var.ami_id
  instance_type = "t3.large"

  provisioner "remote-exec" {
    inline = ["sudo apt-get install -y postgresql"]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # This provisioner will not run until the db instance
  # and its provisioners are complete
  provisioner "remote-exec" {
    inline = [
      "echo 'DB_HOST=${aws_instance.db.private_ip}' > /tmp/.env",
      "sudo systemctl start myapp",
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

## What Happens When Provisioners Fail

When a creation-time provisioner fails, Terraform marks the resource as "tainted." The resource exists in the cloud, but Terraform considers it broken. On the next `terraform apply`, Terraform will destroy and recreate it.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get install -y some-package-that-doesnt-exist",
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

If `some-package-that-doesnt-exist` fails, the instance is created but tainted. The next apply will destroy and rebuild it.

You can change this behavior with `on_failure`:

```hcl
provisioner "remote-exec" {
  inline = ["some-optional-command"]

  on_failure = continue  # Don't taint the resource if this fails

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Provisioners Are Not in the Plan

One of the biggest drawbacks of provisioners is that `terraform plan` does not show what they will do. The plan will show that a resource will be created, but the provisioner actions are opaque. This makes code review harder because you cannot see the full impact of a change.

## Best Practices

1. **Prefer user_data over remote-exec** for EC2 instance initialization. User data runs at boot time without SSH access.

2. **Keep provisioners idempotent.** If the provisioner runs twice (because of a taint and recreate), it should produce the same result.

3. **Use local-exec for lightweight integration tasks** like updating a DNS record, notifying a chat channel, or writing to a log.

4. **Use configuration management tools** (Ansible, Chef, Puppet) for anything more than basic setup. Provisioners are not a replacement for proper configuration management.

5. **Always set timeouts on remote provisioners.** Network issues can cause provisioners to hang indefinitely.

## Summary

Provisioners bridge the gap between Terraform's declarative model and the imperative actions that real-world infrastructure requires. They run as part of a resource's lifecycle, executing in order during creation or destruction. Understanding their interaction with resource dependencies, failure behavior, and the connection model lets you use them effectively without creating fragile infrastructure.

For deeper dives into specific provisioner types, see our posts on [local-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-local-exec-provisioner/view), [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view), and [file provisioners](https://oneuptime.com/blog/post/2026-02-23-terraform-file-provisioner/view).
