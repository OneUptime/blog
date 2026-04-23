# How to Use the remote-exec Provisioner in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, remote-exec, SSH, Infrastructure as Code

Description: Learn how to use the `remote-exec` provisioner in OpenTofu to run commands directly on a newly created remote resource over SSH or WinRM.

## Introduction

The `remote-exec` provisioner connects to a remote resource-typically an EC2 instance, VM, or bare-metal server-and executes commands on it after creation. It is the counterpart to `local-exec`: instead of running commands on the OpenTofu host, it runs them on the target resource itself.

> **Note:** Prefer cloud-init or configuration management tools (Ansible, Chef, Puppet) over `remote-exec` for complex provisioning. This provisioner is best for simple, one-time setup tasks.

## Basic Syntax

```hcl
resource "aws_instance" "web" {
  ami                         = "ami-0abcdef1234567890"
  instance_type               = "t3.micro"
  vpc_security_group_ids      = [aws_security_group.ssh.id]
  key_name                    = aws_key_pair.deployer.key_name
  associate_public_ip_address = true

  # SSH connection configuration
  connection {
    type        = "ssh"
    user        = "ubuntu" # For Ubuntu AMIs
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    # 'inline' takes a list of commands executed in order
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
    ]
  }
}
```

## Three Ways to Specify Commands

### `inline`: List of shell commands

```hcl
provisioner "remote-exec" {
  inline = [
    "echo 'Hello from remote-exec'",
    "whoami",
    "uname -a",
  ]
}
```

### `script`: Upload and run a local script file

```hcl
provisioner "remote-exec" {
  # The script is uploaded to a temp directory and executed
  script = "${path.module}/scripts/bootstrap.sh"
}
```

### `scripts`: Upload and run multiple scripts in order

```hcl
provisioner "remote-exec" {
  scripts = [
    "${path.module}/scripts/01-install-deps.sh",
    "${path.module}/scripts/02-configure-app.sh",
    "${path.module}/scripts/03-start-services.sh",
  ]
}
```

## Full Example: Bootstrap an EC2 Instance

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"
  key_name      = aws_key_pair.deploy.key_name
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name = "app-server"
  }

  # Define how OpenTofu connects to the instance
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.deploy.private_key_pem
    host        = self.public_ip

    # Wait up to 5 minutes for SSH to become available
    timeout = "5m"
  }

  # Upload an application config file first
  provisioner "file" {
    content     = templatefile("${path.module}/templates/app.conf.tftpl", {
      db_host = aws_db_instance.main.address
      db_name = var.db_name
    })
    destination = "/tmp/app.conf"
  }

  # Then install the runtime and place the config file
  provisioner "remote-exec" {
    inline = [
      # Install Node.js
      "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",
      # Create the config directory and move the file into place
      "sudo mkdir -p /etc/myapp",
      "sudo install -m 0644 /tmp/app.conf /etc/myapp/app.conf",
      # Verify the runtime is available
      "node --version",
    ]
  }
}
```

## Handling Connection Failures

Increase `timeout` to give SSH more time to become available, and use `depends_on` only for hidden network dependencies that are not already implied by other arguments:

```hcl
resource "aws_instance" "web" {
  # ...

  depends_on = [
    aws_internet_gateway.main,
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
    timeout     = "10m"  # Give extra time for the instance to boot
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected!'"]
  }
}
```

## Conclusion

The `remote-exec` provisioner is useful for bootstrapping newly created resources when cloud-native alternatives are not available. Keep the provisioner scripts simple, idempotent where possible, and always test them outside of OpenTofu first to avoid difficult debugging scenarios.
