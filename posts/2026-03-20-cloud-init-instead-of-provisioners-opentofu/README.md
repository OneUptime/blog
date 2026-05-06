# How to Use Cloud-Init Instead of Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud-init, Provisioner, EC2, Infrastructure as Code

Description: Learn how to replace OpenTofu provisioners with cloud-init user data scripts for more reliable, declarative instance bootstrapping on AWS and other cloud providers.

## Introduction

Cloud-init is the industry-standard method for bootstrapping cloud instances. It runs automatically during an instance's first boot, without any dependency on the OpenTofu process or an SSH session from the OpenTofu host. This makes it far more reliable than `remote-exec` provisioners for software installation and initial configuration.

## Basic User Data Script

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  # User data runs automatically at first boot via cloud-init
  # The instance does NOT need to be reachable from the OpenTofu host
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update package lists
    apt-get update -y

    # Install Nginx
    apt-get install -y nginx

    # Enable and start Nginx
    systemctl enable nginx
    systemctl start nginx

    # Write a simple index page
    echo "<h1>Deployed by OpenTofu</h1>" > /var/www/html/index.html
  EOF

  # When user_data changes, a new instance is created (the old one is replaced)
  user_data_replace_on_change = true

  tags = {
    Name = "web-server"
  }
}
```

## Using `templatefile` for Dynamic User Data

Inject OpenTofu values into the bootstrap script:

```hcl
# templates/userdata.sh.tftpl

#!/bin/bash
set -e

# Install application
apt-get update -y
apt-get install -y nodejs npm

# Write configuration
mkdir -p /etc/myapp
cat > /etc/myapp/config.json <<'CONF'
${jsonencode({
  db_host     = db_host
  db_name     = db_name
  port        = app_port
  environment = environment
})}
CONF
```

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"

  # Render the template with values from other resources
  user_data = templatefile("${path.module}/templates/userdata.sh.tftpl", {
    db_host     = aws_db_instance.main.address
    db_name     = var.db_name
    app_port    = var.app_port
    environment = var.environment
  })

  user_data_replace_on_change = true
}
```

## Cloud-Config YAML Format

Cloud-init also accepts YAML-format cloud-config for a more structured approach:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #cloud-config
    package_update: true
    package_upgrade: true

    packages:
      - nginx
      - htop
      - awscli

    write_files:
      - path: /etc/nginx/sites-available/default
        content: |
          server {
            listen 80;
            location / {
              proxy_pass http://localhost:3000;
            }
          }
        defer: true

    runcmd:
      - systemctl restart nginx
      - systemctl enable nginx

    final_message: "Cloud-init setup complete after $uptime seconds"
  EOF
}
```

## Checking Cloud-Init Status

View cloud-init logs on the instance:

```bash
# Check if cloud-init completed successfully
cloud-init status

# View detailed logs
cat /var/log/cloud-init-output.log
journalctl -u cloud-init
```

## Comparing Cloud-Init vs Provisioners

| Factor | Cloud-Init | remote-exec Provisioner |
|---|---|---|
| Network dependency | No SSH or WinRM access needed from the OpenTofu host | Requires SSH or WinRM access from the OpenTofu host |
| Failure handling | Failures are reported by cloud-init on the instance | Failed creation-time provisioners taint the resource |
| Re-run on config change | With `user_data_replace_on_change = true`, instance replacement re-runs cloud-init | Creation-time provisioners do not re-run during in-place updates |
| Drift detection | Does not detect in-instance software drift; OpenTofu tracks the declared `user_data` only | Does not detect drift caused by commands already run on the instance |
| Debugging | Logs on the instance | Provisioner output appears in apply logs |
| Security | No inbound SSH or WinRM access required for bootstrapping | Inbound SSH or WinRM access required from the OpenTofu host |

## Conclusion

Cloud-init is the right tool for instance bootstrapping in the vast majority of scenarios. By moving setup logic into `user_data`, you remove the dependency on SSH connectivity during deployment, improve reliability, and keep your OpenTofu configuration fully declarative.
