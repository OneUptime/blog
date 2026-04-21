# How to Configure SSH Connections in OpenTofu Provisioners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Provisioner, SSH, Infrastructure as Code, Remote Execution

Description: Learn how to configure SSH connection blocks within OpenTofu provisioners to securely connect to remote resources and execute commands during infrastructure provisioning.

## Introduction

OpenTofu provisioners can connect to remote resources via SSH to run scripts and commands. The `connection` block defines how OpenTofu establishes the SSH session, supporting both password and key-based authentication.

## Basic SSH Connection Block

Place the `connection` block inside a resource alongside the provisioner:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file(pathexpand("~/.ssh/id_rsa"))
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo yum update -y",
      "sudo yum install -y httpd",
      "sudo systemctl start httpd"
    ]
  }
}
```

## Using a Bastion Host

For instances without public IPs, tunnel through a bastion:

```hcl
connection {
  type        = "ssh"
  user        = "ec2-user"
  private_key = file(pathexpand("~/.ssh/id_rsa"))
  host        = self.private_ip

  bastion_host        = aws_instance.bastion.public_ip
  bastion_user        = "ec2-user"
  bastion_private_key = file(pathexpand("~/.ssh/id_rsa"))
}
```

## Key-Based vs. Password Authentication

Key-based (recommended):

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(pathexpand(var.private_key_path))
  host        = self.public_ip
}
```

Password-based (not recommended for production):

```hcl
connection {
  type     = "ssh"
  user     = "ubuntu"
  password = var.ssh_password
  host     = self.public_ip
}
```

## SSH Agent Support

Use an SSH agent to avoid storing key paths in configuration:

```hcl
connection {
  type  = "ssh"
  user  = "ec2-user"
  agent = true
  host  = self.public_ip
}
```

## Connection Timeout Settings

```hcl
connection {
  type        = "ssh"
  user        = "ec2-user"
  private_key = file(pathexpand("~/.ssh/id_rsa"))
  host        = self.public_ip
  timeout     = "10m"
}
```

## Uploading Files with file Provisioner

```hcl
provisioner "file" {
  source      = "scripts/setup.sh"
  destination = "/tmp/setup.sh"
}

provisioner "remote-exec" {
  inline = [
    "chmod +x /tmp/setup.sh",
    "/tmp/setup.sh"
  ]
}
```

## Best Practices

- Prefer SSH key authentication over passwords
- Use security groups to restrict SSH access (port 22)
- Consider using AWS Systems Manager Session Manager instead of SSH for AWS workloads
- Add a `depends_on` if the instance needs other resources before SSH connects

## Conclusion

SSH connection blocks in OpenTofu provisioners give you the flexibility to configure remote resources after they are created. Keep connections secure with key-based authentication and consider bastion hosts for private network access.
