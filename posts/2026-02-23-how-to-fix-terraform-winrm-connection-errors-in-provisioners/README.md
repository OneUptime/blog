# How to Fix Terraform WinRM Connection Errors in Provisioners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Provisioners, Windows

Description: Fix Terraform WinRM connection errors in provisioners for Windows instances including authentication, HTTPS setup, and firewall configuration.

---

Managing Windows instances with Terraform provisioners requires WinRM (Windows Remote Management) instead of SSH. WinRM is notoriously finicky to configure, and getting it working through Terraform adds another layer of complexity. Connection failures, authentication errors, and timeout issues are all common. This guide covers the most frequent WinRM problems and their solutions.

## The Error

WinRM connection errors in Terraform typically look like:

```
Error: timeout - last error: unknown error Post
"https://54.123.45.67:5986/wsman": dial tcp 54.123.45.67:5986: i/o timeout

  on main.tf line 20, in resource "aws_instance" "windows":
  20:   provisioner "remote-exec" {
```

Or authentication failures:

```
Error: timeout - last error: unknown error Post
"http://54.123.45.67:5985/wsman": 401 Unauthorized
```

## Understanding WinRM in Terraform

Terraform connects to Windows instances using WinRM, which runs on two ports:

- **5985** - HTTP (unencrypted)
- **5986** - HTTPS (encrypted)

The connection block for WinRM:

```hcl
resource "aws_instance" "windows" {
  ami           = "ami-windows-2022"
  instance_type = "t3.medium"

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = var.admin_password
    host     = self.public_ip
    port     = 5986
    https    = true
    insecure = true  # Skip certificate verification for self-signed certs
    timeout  = "10m"
  }

  provisioner "remote-exec" {
    inline = [
      "powershell.exe Write-Host 'Connected!'",
    ]
  }
}
```

## Fix 1: Enable WinRM in User Data

The Windows instance must have WinRM configured and running before Terraform can connect. Use user data to set this up at boot:

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami
  instance_type = "t3.medium"
  key_name      = var.key_name

  user_data = <<-EOF
    <powershell>
    # Enable WinRM
    winrm quickconfig -q
    winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="1024"}'
    winrm set winrm/config '@{MaxTimeoutms="1800000"}'
    winrm set winrm/config/service '@{AllowUnencrypted="true"}'
    winrm set winrm/config/service/auth '@{Basic="true"}'

    # Create HTTPS listener with self-signed certificate
    $cert = New-SelfSignedCertificate -DnsName $env:COMPUTERNAME -CertStoreLocation Cert:\LocalMachine\My
    winrm create winrm/config/Listener?Address=*+Transport=HTTPS "@{Hostname=`"$env:COMPUTERNAME`";CertificateThumbprint=`"$($cert.Thumbprint)`"}"

    # Open firewall for WinRM HTTPS
    netsh advfirewall firewall add rule name="WinRM HTTPS" protocol=TCP dir=in localport=5986 action=allow

    # Set Administrator password
    net user Administrator "${var.admin_password}"
    wmic useraccount where "name='Administrator'" set PasswordExpires=FALSE

    # Restart WinRM service
    Restart-Service winrm
    </powershell>
  EOF

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = var.admin_password
    host     = self.public_ip
    port     = 5986
    https    = true
    insecure = true
    timeout  = "15m"
  }

  provisioner "remote-exec" {
    inline = [
      "powershell.exe Write-Host 'WinRM connection successful'",
    ]
  }
}
```

## Fix 2: Security Group Configuration

WinRM requires specific ports to be open in the security group:

```hcl
resource "aws_security_group" "windows" {
  name   = "windows-winrm"
  vpc_id = var.vpc_id

  # WinRM HTTP
  ingress {
    from_port   = 5985
    to_port     = 5985
    protocol    = "tcp"
    cidr_blocks = [var.terraform_runner_cidr]
  }

  # WinRM HTTPS
  ingress {
    from_port   = 5986
    to_port     = 5986
    protocol    = "tcp"
    cidr_blocks = [var.terraform_runner_cidr]
  }

  # RDP for debugging (optional)
  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = [var.terraform_runner_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Fix 3: Authentication Issues

WinRM supports several authentication methods. Basic auth is the simplest but least secure:

```hcl
# Basic auth (HTTP or HTTPS)
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  https    = true
  insecure = true
}
```

If authentication fails, check:

1. **Password is correct** - The password set in user_data must match the one in the connection block.

2. **Basic auth is enabled** - Run on the Windows instance:

```powershell
winrm get winrm/config/service/auth
# Should show Basic = true
```

3. **Password meets complexity requirements** - Windows requires strong passwords by default.

```hcl
variable "admin_password" {
  type      = string
  sensitive = true
  validation {
    condition     = length(var.admin_password) >= 12
    error_message = "Password must be at least 12 characters."
  }
}
```

## Fix 4: HTTPS Certificate Issues

When using HTTPS (recommended), the self-signed certificate can cause problems:

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  port     = 5986
  https    = true
  insecure = true  # Required for self-signed certificates
  # Without insecure=true, Terraform rejects the self-signed cert
}
```

If you need proper certificate validation, provide a CA certificate:

```hcl
connection {
  type    = "winrm"
  user    = "Administrator"
  password = var.admin_password
  host    = self.public_ip
  port    = 5986
  https   = true
  cacert  = file("${path.module}/certs/ca.pem")
}
```

## Fix 5: Windows Firewall Blocking WinRM

The Windows firewall might block WinRM even if the cloud security group allows it. Include firewall rules in your user data:

```powershell
# Open WinRM HTTPS port
netsh advfirewall firewall add rule name="WinRM HTTPS" protocol=TCP dir=in localport=5986 action=allow

# Or disable the firewall entirely (not recommended for production)
# netsh advfirewall set allprofiles state off
```

To verify WinRM is listening:

```powershell
# Run on the Windows instance
netstat -an | findstr 5986
winrm enumerate winrm/config/listener
```

## Fix 6: Timeout - Instance Takes Too Long to Boot

Windows instances take significantly longer to boot than Linux. The default 5-minute timeout might not be enough:

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  port     = 5986
  https    = true
  insecure = true
  timeout  = "15m"  # Windows needs more time to boot and run user data
}
```

The boot process includes:
1. Windows startup
2. Sysprep completion (for new instances)
3. User data script execution (WinRM configuration)
4. WinRM service start

All of this can take 5-10 minutes for a standard Windows instance.

## Fix 7: Using HTTP Instead of HTTPS

For testing or internal environments, HTTP is simpler to configure:

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  port     = 5985
  https    = false
}
```

With corresponding user data:

```powershell
winrm quickconfig -q
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
netsh advfirewall firewall add rule name="WinRM HTTP" protocol=TCP dir=in localport=5985 action=allow
```

Do not use unencrypted WinRM in production. The password is sent in clear text.

## Fix 8: Getting the Windows Password from AWS

For AWS instances using a key pair, you can retrieve the Administrator password:

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
  get_password_data = true

  # Do NOT set user_data that changes the password
  # if you want to use get_password_data
}

# Decrypt the password
output "admin_password" {
  value     = rsadecrypt(aws_instance.windows.password_data, file("~/.ssh/deploy_key"))
  sensitive = true
}
```

Then use the decrypted password in the connection:

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = rsadecrypt(self.password_data, file("~/.ssh/deploy_key"))
  host     = self.public_ip
  port     = 5986
  https    = true
  insecure = true
  timeout  = "15m"
}
```

## Debugging WinRM Issues

### Test connectivity from your machine

```bash
# Test if the port is open
nc -zv 54.123.45.67 5986

# Test with curl (WinRM uses HTTP/HTTPS)
curl -v --insecure https://54.123.45.67:5986/wsman

# Test with PowerShell (from another Windows machine)
Test-WSMan -ComputerName 54.123.45.67 -Port 5986 -UseSSL
```

### Check WinRM status on the instance

RDP into the instance and run:

```powershell
# Check WinRM service status
Get-Service WinRM

# Check WinRM configuration
winrm get winrm/config

# Check listeners
winrm enumerate winrm/config/listener

# Test locally
winrm identify -r:http://localhost:5985
```

### Enable Terraform debug logging

```bash
TF_LOG=DEBUG terraform apply 2>&1 | grep -i winrm
```

## Alternatives to WinRM Provisioners

Like SSH provisioners, WinRM provisioners should be a last resort:

- **User data scripts** - Run PowerShell at boot
- **AWS Systems Manager** - Run commands without WinRM
- **Packer** - Build pre-configured Windows AMIs
- **DSC (Desired State Configuration)** - Pull-based configuration management

```hcl
# User data approach - no WinRM needed
resource "aws_instance" "windows" {
  ami           = var.windows_ami
  instance_type = "t3.medium"

  user_data = <<-EOF
    <powershell>
    # Install IIS
    Install-WindowsFeature -name Web-Server -IncludeManagementTools

    # Configure application
    New-Item -Path C:\inetpub\wwwroot\index.html -Value "Hello from Terraform"

    # Install Chocolatey packages
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    choco install dotnet-sdk -y
    </powershell>
  EOF
}
```

## Conclusion

WinRM connection errors in Terraform provisioners usually come from three places: the WinRM service not being configured on the instance, the network not allowing traffic on port 5985/5986, or authentication problems. The fix almost always involves configuring WinRM through user data, opening the right security group ports, and giving the instance enough time to boot. For production Windows workloads, avoid WinRM provisioners entirely and use user data scripts or configuration management tools instead.
