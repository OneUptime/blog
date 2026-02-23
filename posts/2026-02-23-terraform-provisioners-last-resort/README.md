# How to Understand Why Provisioners Are a Last Resort in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioners, Best Practices, Infrastructure as Code, Configuration Management

Description: Learn why Terraform documentation recommends provisioners as a last resort, what problems they cause, and what better alternatives exist for common provisioner use cases.

---

Open the Terraform documentation for provisioners and you will find a prominent warning: "Provisioners should only be used as a last resort." This is not a suggestion. It reflects real problems that teams encounter when they rely heavily on provisioners for infrastructure configuration. Understanding why provisioners are problematic helps you build more reliable, maintainable Terraform configurations.

## What Provisioners Do

Provisioners execute arbitrary commands during the Terraform lifecycle. They come in three types:

- `local-exec` runs commands on the Terraform host
- `remote-exec` runs commands on the target resource over SSH or WinRM
- `file` copies files to the target resource

These sound useful - and they are, in limited situations. The problems arise when you use them for more than simple bootstrapping.

## Why Provisioners Are Problematic

### 1. They Break the Declarative Model

Terraform is declarative. You describe the desired state, and Terraform figures out how to get there. Provisioners are imperative - they describe actions to take, not states to reach.

```hcl
# Declarative: describe what you want
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
}

# Imperative: describe what to do
provisioner "remote-exec" {
  inline = [
    "sudo apt-get update",
    "sudo apt-get install -y nginx",
    "sudo systemctl start nginx",
  ]
}
```

The resource definition is declarative - Terraform ensures the instance exists with those properties. The provisioner is imperative - Terraform runs these commands, but it has no idea what the resulting state should be. If nginx fails to start, Terraform does not know. If someone manually stops nginx later, Terraform does not fix it.

### 2. They Are Not in the Plan

`terraform plan` shows you exactly what infrastructure changes will happen. Provisioners are invisible in the plan output.

```
# terraform plan output
+ resource "aws_instance" "web" {
    + ami           = "ami-0123456789"
    + instance_type = "t3.medium"
    ...
  }
```

Nowhere in the plan does it mention that nginx will be installed, a configuration file will be copied, or a database migration will run. This makes code review incomplete because reviewers cannot see the full impact of a change.

### 3. They Are Not Idempotent

If Terraform recreates a resource, the provisioners run again. The commands you write must handle being run on a fresh machine. But many provisioner scripts are written for first-time setup and fail or produce unexpected results when run a second time.

```hcl
# This works the first time but fails the second
provisioner "remote-exec" {
  inline = [
    "sudo useradd appuser",      # Fails if user already exists
    "sudo mkdir /opt/app",        # Fails if directory already exists
    "sudo git clone ${var.repo} /opt/app/code",  # Fails if directory not empty
  ]
}
```

### 4. They Create Hidden State

Terraform state tracks the infrastructure it manages. Provisioners modify the world in ways that are not tracked. Install nginx via a provisioner and Terraform has no record that nginx should be there. Remove the provisioner from your code and nothing happens - nginx stays installed.

### 5. They Are Fragile

Remote provisioners depend on network connectivity, SSH availability, and the remote operating system being ready. Any of these can fail, and the failure modes are hard to debug.

```
# Common failure: instance created but SSH not ready yet
Error: timeout - last error: dial tcp 10.0.1.50:22: connection refused
```

### 6. They Do Not Handle Updates

Provisioners run at creation time (or destruction time). They do not run when you update a resource. If you change a configuration value that the provisioner used, the change is not applied until the resource is destroyed and recreated.

```hcl
variable "app_port" {
  default = 8080
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  provisioner "remote-exec" {
    inline = [
      "echo APP_PORT=${var.app_port} > /etc/app/config",
    ]
    connection { ... }
  }
}
```

If you change `app_port` from 8080 to 9090, the provisioner does not run. The instance keeps running with port 8080 until you taint it or change something that forces recreation.

## What to Use Instead

### User Data / Cloud-Init

For EC2 instance initialization, user data is almost always better than `remote-exec`. It runs at boot time, does not require SSH access, and can be updated by recreating the instance.

```hcl
# Instead of remote-exec provisioner
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
  EOF

  user_data_replace_on_change = true
}
```

The `user_data_replace_on_change` argument tells Terraform to recreate the instance when user data changes, which applies the new configuration.

### Packer for AMI Building

If you need complex software installation, build it into the AMI with Packer instead of installing it at launch time.

```json
{
  "builders": [{
    "type": "amazon-ebs",
    "source_ami": "ami-0abcdef1234567890",
    "instance_type": "t3.medium",
    "ssh_username": "ubuntu",
    "ami_name": "app-server-{{timestamp}}"
  }],
  "provisioners": [{
    "type": "shell",
    "script": "scripts/install-app.sh"
  }]
}
```

Then in Terraform, reference the pre-built AMI:

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-*"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"
}
```

No provisioners needed. The instance boots with everything already installed.

### Configuration Management Tools

For ongoing configuration management, use dedicated tools like Ansible, Chef, or Puppet. These are designed for the job and handle idempotency, state tracking, and drift correction.

```hcl
# Create the instance with Terraform
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  tags = {
    Name = "app-server"
    Role = "web"
  }
}

# Configure it with Ansible (run separately)
# ansible-playbook -i inventory.ini playbooks/web.yml
```

### AWS Systems Manager (SSM)

For running commands on EC2 instances without SSH, use SSM Run Command.

```hcl
resource "aws_ssm_document" "setup" {
  name          = "setup-app"
  document_type = "Command"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Install and configure the application"
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "installApp"
      inputs = {
        runCommand = [
          "apt-get update",
          "apt-get install -y nginx",
          "systemctl start nginx",
        ]
      }
    }]
  })
}
```

### Terraform Provider Resources

Many things people do with provisioners have dedicated Terraform resources. For example, instead of using `local-exec` to create a DNS record via API call, use the DNS provider's resource.

```hcl
# Bad: using a provisioner for something Terraform can manage
resource "null_resource" "dns" {
  provisioner "local-exec" {
    command = "curl -X POST https://dns-api/records -d '{\"name\":\"app\",\"ip\":\"${aws_instance.app.public_ip}\"}'"
  }
}

# Good: using a proper Terraform resource
resource "aws_route53_record" "app" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_instance.app.public_ip]
}
```

## When Provisioners Are Actually Appropriate

Despite all the warnings, there are legitimate use cases:

1. **Bootstrapping before configuration management.** Running a minimal script to install the configuration management agent.

2. **One-time seed data.** Loading initial data into a newly created database or storage system.

3. **Integration with tools that lack Terraform providers.** If there is no Terraform provider for a system, `local-exec` with API calls is sometimes the only option.

4. **Notifications.** Sending a Slack message or updating a deployment tracker when infrastructure changes.

```hcl
# Legitimate: notify about deployment
provisioner "local-exec" {
  command    = "curl -X POST ${var.slack_webhook} -d '{\"text\":\"Deployed ${self.id}\"}'"
  on_failure = continue  # Notification failure should not block deployment
}
```

5. **Running tests after deployment.** Smoke testing that the infrastructure works.

## Decision Framework

Before adding a provisioner, ask yourself:

1. **Can user_data handle this?** If yes, use user_data.
2. **Can a pre-built AMI handle this?** If yes, use Packer.
3. **Is there a Terraform resource for this?** If yes, use the resource.
4. **Does this need ongoing management?** If yes, use a configuration management tool.
5. **Is this a one-time side effect?** If yes, a provisioner might be appropriate.

## Summary

Provisioners are a last resort because they break Terraform's declarative model, are invisible in plans, do not handle updates, create hidden state, and are fragile. For most use cases, better alternatives exist: user_data for instance initialization, Packer for AMI building, configuration management tools for ongoing maintenance, and dedicated Terraform resources for infrastructure that Terraform can natively manage.

When you do need provisioners, use `local-exec` over `remote-exec` when possible, set `on_failure = continue` for non-critical operations, and keep them as simple as possible. For more on provisioner mechanics, see our posts on [local-exec](https://oneuptime.com/blog/post/terraform-local-exec-provisioner/view) and [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view).
