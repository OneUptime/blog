# How to Use the file Provisioner in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioners, File Transfer, Infrastructure as Code, SSH

Description: Learn how to use the file provisioner in Terraform to upload files and directories from the Terraform host to remote resources during the provisioning process.

---

The `file` provisioner copies files or directories from the machine running Terraform to a newly created resource. It is the simplest way to get configuration files, scripts, certificates, and other artifacts onto a remote instance during provisioning. Like `remote-exec`, it requires a connection block to reach the target machine over SSH or WinRM.

## Basic File Upload

The most common use case is uploading a single file.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  provisioner "file" {
    source      = "${path.module}/config/nginx.conf"
    destination = "/tmp/nginx.conf"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # After copying, move the file to its proper location
  provisioner "remote-exec" {
    inline = [
      "sudo cp /tmp/nginx.conf /etc/nginx/nginx.conf",
      "sudo nginx -t",
      "sudo systemctl reload nginx",
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

Notice the two-step pattern: upload to `/tmp` first, then use `remote-exec` to move the file to its final location with the right permissions. This is necessary because the SSH user typically does not have write access to system directories like `/etc/nginx/`.

## Source and Destination

### source

The `source` argument specifies the local file or directory to upload. It can be an absolute path or relative to the working directory.

```hcl
provisioner "file" {
  # Relative to the module directory
  source      = "${path.module}/files/app.conf"
  destination = "/tmp/app.conf"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

### destination

The `destination` argument is the path on the remote machine. For files, it must be a full path including the filename. For directories, it specifies where the directory should be placed.

### content

Instead of uploading a file from disk, you can generate content dynamically using the `content` argument.

```hcl
provisioner "file" {
  content = <<-EOT
    [app]
    db_host = ${aws_db_instance.main.address}
    db_port = 5432
    db_name = ${var.db_name}
    redis_host = ${aws_elasticache_cluster.main.cache_nodes[0].address}
    environment = ${var.environment}
    log_level = ${var.log_level}
  EOT
  destination = "/tmp/app.ini"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

This is powerful because you can interpolate Terraform expressions directly into the file content. The file does not need to exist on disk.

## Uploading Directories

You can upload entire directories by specifying a directory as the source.

```hcl
provisioner "file" {
  # Upload the entire scripts directory
  source      = "${path.module}/scripts/"
  destination = "/home/ubuntu/scripts"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

There is a subtle difference in behavior depending on whether the source path has a trailing slash:

- `source = "scripts/"` - Uploads the **contents** of the scripts directory to the destination.
- `source = "scripts"` - Uploads the **directory itself** to the destination, creating `destination/scripts/`.

```hcl
# This uploads files INSIDE scripts/ to /home/ubuntu/app/
provisioner "file" {
  source      = "${path.module}/scripts/"
  destination = "/home/ubuntu/app"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}

# This uploads the scripts directory AS /home/ubuntu/app/scripts/
provisioner "file" {
  source      = "${path.module}/scripts"
  destination = "/home/ubuntu/app"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Real-World Examples

### Uploading TLS Certificates

```hcl
resource "aws_instance" "api" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Upload certificate
  provisioner "file" {
    content     = tls_self_signed_cert.api.cert_pem
    destination = "/tmp/server.crt"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Upload private key
  provisioner "file" {
    content     = tls_private_key.api.private_key_pem
    destination = "/tmp/server.key"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Move certs and set permissions
  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /etc/ssl/app",
      "sudo mv /tmp/server.crt /etc/ssl/app/server.crt",
      "sudo mv /tmp/server.key /etc/ssl/app/server.key",
      "sudo chmod 600 /etc/ssl/app/server.key",
      "sudo chmod 644 /etc/ssl/app/server.crt",
      "sudo chown root:root /etc/ssl/app/*",
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

### Uploading a Systemd Service File

```hcl
resource "aws_instance" "worker" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  provisioner "file" {
    content = <<-EOT
      [Unit]
      Description=Application Worker
      After=network.target

      [Service]
      Type=simple
      User=appuser
      WorkingDirectory=/opt/app
      ExecStart=/opt/app/worker --config /etc/app/worker.conf
      Restart=always
      RestartSec=5
      Environment=DB_HOST=${aws_db_instance.main.address}
      Environment=ENVIRONMENT=${var.environment}

      [Install]
      WantedBy=multi-user.target
    EOT
    destination = "/tmp/app-worker.service"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mv /tmp/app-worker.service /etc/systemd/system/",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable app-worker",
      "sudo systemctl start app-worker",
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

### Uploading Docker Compose Files

```hcl
resource "aws_instance" "docker_host" {
  ami           = var.ami_id
  instance_type = "t3.large"
  key_name      = var.key_name

  # Upload docker-compose file with dynamic content
  provisioner "file" {
    content = templatefile("${path.module}/templates/docker-compose.yml.tpl", {
      db_host     = aws_db_instance.main.address
      redis_host  = aws_elasticache_cluster.main.cache_nodes[0].address
      app_image   = "${var.ecr_repo}:${var.image_tag}"
      environment = var.environment
    })
    destination = "/home/ubuntu/docker-compose.yml"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  # Start the services
  provisioner "remote-exec" {
    inline = [
      "cd /home/ubuntu",
      "docker compose pull",
      "docker compose up -d",
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

## Using templatefile() with the File Provisioner

The `content` argument combined with `templatefile()` is extremely powerful. It lets you keep template files on disk while injecting dynamic values at provisioning time.

```hcl
# templates/nginx-vhost.conf.tpl
# server {
#     listen 80;
#     server_name ${domain};
#     location / {
#         proxy_pass http://localhost:${app_port};
#     }
# }

provisioner "file" {
  content = templatefile("${path.module}/templates/nginx-vhost.conf.tpl", {
    domain   = var.domain
    app_port = var.app_port
  })
  destination = "/tmp/vhost.conf"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## File Permissions

A common issue with the `file` provisioner is that uploaded files inherit the permissions of the SSH user's default umask. If you need specific permissions, set them with a follow-up `remote-exec`.

```hcl
provisioner "file" {
  source      = "${path.module}/scripts/deploy.sh"
  destination = "/tmp/deploy.sh"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}

provisioner "remote-exec" {
  inline = [
    "chmod +x /tmp/deploy.sh",
    "/tmp/deploy.sh",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Limitations

1. **No glob patterns.** You cannot use wildcards like `*.conf`. You must specify exact files or entire directories.

2. **No symbolic links.** The file provisioner does not follow or create symbolic links.

3. **Destination directory must exist.** If you upload to `/opt/app/config.yml`, the `/opt/app/` directory must already exist on the remote machine.

4. **File size limits.** Very large files may time out during upload, especially over slow connections. For large artifacts, consider downloading from S3 instead.

5. **No partial uploads.** If the connection drops mid-upload, you get a corrupted file. There is no resume capability.

## Alternatives to the File Provisioner

For production workloads, consider these alternatives:

- **S3 + user_data:** Upload files to S3, then download them in a user_data script. No SSH required.
- **Packer:** Bake files into the AMI at build time.
- **AWS Systems Manager:** Use SSM documents to manage files without SSH.
- **Ansible:** Use Ansible's file and template modules for robust file management.

## Summary

The `file` provisioner is straightforward: it copies files from the Terraform host to a remote resource. The `content` argument adds flexibility by letting you generate file contents from Terraform expressions. Always pair it with `remote-exec` to handle permissions and placement, and remember the trailing slash behavior when uploading directories.

For more on provisioners, see our guides on [local-exec](https://oneuptime.com/blog/post/terraform-local-exec-provisioner/view) and [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view).
