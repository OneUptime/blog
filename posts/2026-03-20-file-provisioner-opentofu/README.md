# How to Use the file Provisioner in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, File Upload, SSH, Infrastructure as Code

Description: Learn how to use the `file` provisioner in OpenTofu to upload files or directory contents to a remote resource over SSH or WinRM during provisioning.

## Introduction

The `file` provisioner copies files or directories from the local machine running OpenTofu to a newly created remote resource. It is commonly used before a `remote-exec` provisioner to stage configuration files, scripts, or application artifacts on the instance.

## Basic Syntax

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  # A connection is required for the file provisioner; this example uses SSH
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.ssh_private_key_path)
    host        = self.public_ip
  }

  # Upload a single file
  provisioner "file" {
    # Local source file
    source      = "${path.module}/configs/nginx.conf"
    # Destination path on the remote host
    destination = "/tmp/nginx.conf"
  }
}
```

## Uploading Generated Content

Use `content` instead of `source` to upload dynamically generated strings (e.g., from `templatefile`):

```hcl
provisioner "file" {
  # Generate content on the fly using a template
  content = templatefile("${path.module}/templates/app.env.tftpl", {
    db_host     = aws_db_instance.main.address
    db_name     = var.db_name
    redis_host  = aws_elasticache_cluster.cache.cache_nodes[0].address
    secret_key  = random_password.app_secret.result
  })

  # Upload the rendered content to this path on the remote host
  destination = "/tmp/app.env"
}
```

## Uploading a Directory

When `source` points to a directory, OpenTofu copies it recursively. With `ssh`, the destination directory must already exist, and a trailing slash on `source` means "copy the directory contents into the destination":

```hcl
provisioner "file" {
  # Copies everything inside scripts/ into the existing /tmp directory on the remote host
  source      = "${path.module}/scripts/"
  destination = "/tmp"
}
```

## Combining `file` and `remote-exec`

The most common pattern is uploading a file and then executing it:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"
  key_name      = var.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # Step 1: Upload the bootstrap script
  provisioner "file" {
    source      = "${path.module}/scripts/bootstrap.sh"
    destination = "/tmp/bootstrap.sh"
  }

  # Step 2: Upload the application configuration
  provisioner "file" {
    content = templatefile("${path.module}/templates/app.conf.tftpl", {
      environment = var.environment
      port        = var.app_port
    })
    destination = "/tmp/app.conf"
  }

  # Step 3: Make the script executable and run it
  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/bootstrap.sh",
      "sudo /tmp/bootstrap.sh",
      "sudo mv /tmp/app.conf /etc/myapp/app.conf",
      "sudo systemctl restart myapp",
    ]
  }
}
```

## Permissions and Ownership

The `file` provisioner uploads files as the connection user. If the destination requires root ownership, use `remote-exec` to move or `chown` the file after upload:

```hcl
provisioner "file" {
  source      = "configs/sudoers.d/myapp"
  # Upload to /tmp first (writable by the user)
  destination = "/tmp/myapp-sudoers"
}

provisioner "remote-exec" {
  inline = [
    # Then move with elevated permissions
    "sudo cp /tmp/myapp-sudoers /etc/sudoers.d/myapp",
    "sudo chmod 0440 /etc/sudoers.d/myapp",
  ]
}
```

## Limitations

- The `source` argument accepts a single file or directory path, not a wildcard pattern.
- Binary files are supported; the file is transferred byte-for-byte.
- Very large directories may be slow to transfer over the SSH connection.

## Conclusion

The `file` provisioner is the simplest way to get configuration files and scripts onto a new resource. Pair it with `remote-exec` for a lightweight provisioning workflow, but consider using cloud-init or a proper configuration management tool for anything beyond basic file staging.
