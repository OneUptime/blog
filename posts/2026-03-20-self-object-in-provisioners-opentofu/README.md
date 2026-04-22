# How to Use the self Object in Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, Self Object, Infrastructure as Code, Resource Attributes

Description: Learn how to use the `self` object in OpenTofu provisioners to reference the resource's own attributes within provisioner blocks.

## Introduction

Inside a provisioner block, you cannot reference the enclosing resource by name-doing so would create a circular dependency. OpenTofu provides the `self` object as a special reference to the current resource's attributes within provisioner and connection blocks.

## Basic Usage

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.deploy.private_key_pem

    # Use 'self' to reference this instance's public IP
    host = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      # Use 'self' to access the instance's attributes in commands
      "echo 'My instance ID is ${self.id}'",
      "echo 'My private IP is ${self.private_ip}'",
      "echo 'My availability zone is ${self.availability_zone}'",
    ]
  }
}
```

## Available Attributes via `self`

The `self` object exposes all the attributes of the resource, both input arguments and computed attributes:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.small"
  tags          = { Name = "app-server" }

  provisioner "local-exec" {
    command = <<-EOT
      echo "ID:               ${self.id}"
      echo "AMI:              ${self.ami}"
      echo "Instance type:    ${self.instance_type}"
      echo "Public IP:        ${self.public_ip}"
      echo "Private IP:       ${self.private_ip}"
      echo "Public DNS:       ${self.public_dns}"
      echo "AZ:               ${self.availability_zone}"
      echo "Subnet:           ${self.subnet_id}"
      echo "Security groups:  ${join(", ", self.vpc_security_group_ids)}"
    EOT
  }
}
```

## Using `self` in the `connection` Block

The `connection` block most commonly uses `self` to determine the host address:

```hcl
resource "google_compute_instance" "vm" {
  name         = "my-vm"
  machine_type = "e2-micro"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params { image = "debian-cloud/debian-11" }
  }

  network_interface {
    network       = "default"
    access_config {}  # Assigns a public IP
  }

  connection {
    type        = "ssh"
    user        = "myuser"
    private_key = file(var.ssh_private_key)
    # Use self to get the assigned public IP
    host        = self.network_interface[0].access_config[0].nat_ip
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected to ${self.name}'"]
  }
}
```

## Using `self` in Destroy-Time Provisioners

`self` is especially important in destroy-time provisioners because OpenTofu restricts references there to values that are still available at destroy time:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  tags = {
    ConsulAddress = var.consul_address
  }

  provisioner "local-exec" {
    when = destroy

    # Use self for resource attributes in destroy-time provisioners
    command = <<-EOT
      echo "Deregistering instance ${self.id} (IP: ${self.private_ip})"
      consul services deregister -id="${self.id}" || true
    EOT

    environment = {
      CONSUL_HTTP_ADDR = self.tags["ConsulAddress"]
    }
  }
}
```

## Accessing Tags via `self`

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  tags = {
    Name        = "app-server"
    Environment = var.environment
    Team        = "platform"
  }

  provisioner "local-exec" {
    command = "register-asset --name='${self.tags["Name"]}' --env='${self.tags["Environment"]}' --id='${self.id}'"
  }
}
```

## Limitation: `self` Is Only Valid in Provisioner and Connection Blocks

The `self` reference is scoped to provisioner and connection blocks only. It cannot be used elsewhere in the resource block:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"

  # INVALID: 'self' cannot be used in regular resource arguments
  # tags = { "InstanceId" = self.id }   ← This causes an error

  # VALID: 'self' works inside provisioner blocks
  provisioner "local-exec" {
    command = "echo ${self.id}"
  }
}
```

## Conclusion

The `self` object is the essential tool for writing provisioner scripts and connection blocks that reference the resource being created or destroyed. Use it freely within provisioner blocks-and remember that in destroy-time provisioners, it is the only safe way to access resource attributes.
