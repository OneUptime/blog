# How to Use the Self Object in OpenTofu Provisioners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Provisioner, Infrastructure as Code, HCL

Description: Learn how to use the `self` object within OpenTofu provisioners to reference the attributes of the resource being created or destroyed.

## Introduction

When writing provisioners in OpenTofu, you often need to reference the attributes of the resource the provisioner is attached to. The `self` object provides access to all of that resource's attributes without creating circular dependencies.

## What Is the Self Object?

The `self` object is a special reference available within `provisioner` blocks and their related `connection` blocks. It refers to the parent resource and allows you to access any of its computed or configured attributes.

## Basic Usage

In this example, a `local-exec` provisioner uses `self.public_ip` to reference the EC2 instance's public IP after it is created:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "echo 'Instance created with IP: ${self.public_ip}'"
  }
}
```

## Using Self in Remote-Exec Provisioners

The `self` object is particularly useful in `remote-exec` provisioners to connect to the newly created resource:

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
      "sudo yum install -y nginx",
      "sudo systemctl start nginx"
    ]
  }
}
```

## Destroy-Time Provisioners

The `self` object also works in destroy-time provisioners, letting you use the resource's attributes during cleanup:

```hcl
resource "aws_instance" "db" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Deregistering instance ${self.id} from load balancer'"
  }
}
```

## Accessing Nested Attributes

You can access nested or map attributes using standard attribute and index expressions:

```hcl
provisioner "local-exec" {
  command = "echo 'Tag Name: ${self.tags["Name"]}'"
}
```

## Limitations of Self

- `self` is only available inside `provisioner` and `connection` blocks, not as a general expression elsewhere in the resource
- It only represents the enclosing resource; use normal references for other resources where allowed
- Avoid provisioners when possible - prefer purpose-built resources or data sources

## Conclusion

The `self` object in OpenTofu provisioners provides a clean way to reference the enclosing resource's attributes. This is especially valuable when configuring SSH connections or passing dynamic values to scripts during resource creation or destruction.
