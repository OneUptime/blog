# How to Use cloud-init Instead of OpenTofu Provisioners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud-init, EC2, Provisioner, Infrastructure as Code, AWS

Description: Learn how to replace OpenTofu remote-exec provisioners with cloud-init user data for more reliable and idiomatic instance initialization.

---

OpenTofu provisioners like `remote-exec` are explicitly discouraged by the OpenTofu documentation because they introduce ordering dependencies, SSH complexity, and fragility. `cloud-init` is the standard, more reliable alternative for instance bootstrapping.

---

## Why Avoid Provisioners

Problems with `remote-exec`:
- Requires network access and SSH/WinRM connectivity at provisioning time
- Failures leave resources in a tainted state
- Hard to reproduce and debug
- Requires extra networking or bastion access for instances in private subnets

---

## cloud-init with EC2 User Data

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # System updates
    yum update -y

    # Install and configure nginx
    yum install -y nginx
    systemctl enable --now nginx

    # Write a custom index page
    echo "<h1>Deployed by cloud-init</h1>" > /usr/share/nginx/html/index.html
  EOF

  tags = {
    Name = "web-server"
  }
}
```

---

## cloud-init YAML Format

```hcl
user_data = <<-EOF
  #cloud-config
  packages:
    - nginx
    - git

  write_files:
    - path: /etc/nginx/conf.d/app.conf
      content: |
        server {
          listen 80;
          root /var/www/html;
        }

  runcmd:
    - systemctl enable --now nginx
    - echo "Bootstrap complete" >> /var/log/cloud-init-custom.log
EOF
```

---

## Use a Template File

```hcl
# templates/user_data.sh.tftpl

#!/bin/bash
APP_ENV="${app_env}"
DB_HOST="${db_host}"

yum install -y nginx
mkdir -p /etc/app
echo "DB=${DB_HOST}" > /etc/app/config.env
systemctl enable --now nginx
```

```hcl
resource "aws_instance" "app" {
  user_data = templatefile("templates/user_data.sh.tftpl", {
    app_env = var.environment
    db_host = aws_db_instance.main.endpoint
  })
}
```

---

## Verify cloud-init Execution

```bash
# SSH in and check cloud-init logs
sudo cat /var/log/cloud-init-output.log
sudo cloud-init status
sudo cloud-init status --long
```

---

## Summary

Replace OpenTofu `remote-exec` provisioners with `user_data` containing either a shell script (starting with `#!/bin/bash`) or cloud-config YAML (starting with `#cloud-config`). Use `templatefile()` to inject dynamic values. Verify execution by checking `/var/log/cloud-init-output.log` on the instance. This approach runs during instance boot, works in private subnets, and doesn't require SSH at provisioning time.
