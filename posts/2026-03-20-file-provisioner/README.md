# How to Use the File Provisioner in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Provisioner, File, Infrastructure as Code, EC2, Configuration

Description: Learn how to use the OpenTofu file provisioner to copy files and directories to remote instances during resource creation as part of your infrastructure automation.

---

The OpenTofu file provisioner copies local files or directories to a remote resource during provisioning. It runs after a resource is created and is typically used to upload configuration files, scripts, or certificates to a new EC2 instance or VM.

---

## When to Use the File Provisioner

The file provisioner is useful for:
- Uploading application configuration files
- Copying SSL certificates or keys
- Deploying startup scripts
- Providing cloud-init alternatives

> Note: HashiCorp and the OpenTofu team recommend using cloud-init user data or configuration management tools (Ansible, Chef, Puppet) for complex provisioning. The file provisioner is best for simple, targeted file copies.

---

## Basic File Copy

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  provisioner "file" {
    source      = "configs/nginx.conf"
    destination = "/tmp/nginx.conf"
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand("~/.ssh/deploy_key"))
    host        = self.public_ip
  }
}
```

---

## Copy a Directory

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  # Copy entire directory
  provisioner "file" {
    source      = "app-configs"
    destination = "/home/ubuntu"
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand("~/.ssh/deploy_key"))
    host        = self.public_ip
  }
}
```

---

## Copy Rendered Template Content

Use `content` instead of `source` to upload rendered template content:

```hcl
locals {
  app_config = templatefile("${path.module}/templates/app.conf.tpl", {
    db_host  = aws_db_instance.main.endpoint
    db_port  = 5432
    app_port = 8080
  })
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  # Upload rendered template
  provisioner "file" {
    content     = local.app_config
    destination = "/tmp/app.conf"
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand("~/.ssh/deploy_key"))
    host        = self.public_ip
  }
}
```

---

## Using Connection Block at Resource Level

Move the connection block to resource level when using multiple provisioners:

```hcl
resource "aws_instance" "server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand("~/.ssh/deploy_key"))
    host        = self.public_ip
  }

  provisioner "file" {
    source      = "scripts/setup.sh"
    destination = "/tmp/setup.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/setup.sh",
      "sudo /tmp/setup.sh"
    ]
  }
}
```

---

## WinRM Connection for Windows

```hcl
resource "aws_instance" "windows" {
  ami           = data.aws_ami.windows.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
  get_password_data = true

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = rsadecrypt(self.password_data, file(pathexpand("~/.ssh/deploy_key")))
    host     = self.public_ip
    port     = 5986
    https    = true
    insecure = true
    timeout  = "5m"
  }

  provisioner "file" {
    source      = "scripts/setup.ps1"
    destination = "C:/Temp/setup.ps1"
  }
}
```

---

## Using Bastion Host

```hcl
resource "aws_instance" "private_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = data.aws_subnets.private.ids[0]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand("~/.ssh/deploy_key"))
    host        = self.private_ip

    bastion_host        = aws_instance.bastion.public_ip
    bastion_user        = "ubuntu"
    bastion_private_key = file(pathexpand("~/.ssh/bastion_key"))
  }

  provisioner "file" {
    source      = "configs/app.conf"
    destination = "/tmp/app.conf"
  }
}
```

---

## Destroy-Time Provisioner

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  provisioner "file" {
    when    = destroy
    source      = "scripts/cleanup.sh"
    destination = "/tmp/cleanup.sh"
  }

  connection {
    type = "ssh"
    host = self.public_ip
    # ...
  }
}
```

---

## Best Practices

1. **Use cloud-init or user_data** for initial server setup when possible - it's faster and more reliable
2. **Use `/tmp` as destination** and move files with `remote-exec` to avoid permission issues
3. **Combine with remote-exec** to execute the uploaded files immediately after copy
4. **Use templatefile()** to inject dynamic values into configuration files
5. **Avoid storing secrets** in provisioner source files - use Vault or AWS Secrets Manager instead

---

## Conclusion

The OpenTofu file provisioner is a straightforward way to copy configuration files and scripts to new instances. Combine it with the connection block and remote-exec provisioner for complete instance configuration as part of your infrastructure deployment.

---

*Monitor your provisioned infrastructure with [OneUptime](https://oneuptime.com) - automated uptime and health monitoring.*
