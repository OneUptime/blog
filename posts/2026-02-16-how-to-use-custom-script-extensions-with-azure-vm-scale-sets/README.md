# How to Use Custom Script Extensions with Azure VM Scale Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Custom Script Extension, Automation, Configuration Management, DevOps

Description: Learn how to use Azure Custom Script Extensions to automate software installation and configuration on VM Scale Set instances.

---

When you create a VM Scale Set, you start with a base OS image. But a bare OS is rarely useful - you need to install packages, configure services, deploy application code, and set up monitoring agents. Custom Script Extensions let you automate all of this by running scripts on each instance after it boots, turning a generic OS image into a ready-to-serve application server without manual intervention.

I use Custom Script Extensions as the glue between a golden OS image and a fully configured application. The image has the OS and base dependencies baked in, and the script extension handles the last-mile configuration - pulling the latest application code, setting environment-specific variables, and starting services.

## How Custom Script Extensions Work

The Custom Script Extension downloads a script file from Azure Blob Storage, GitHub, or any accessible URL, and then executes it on the VM. For scale sets, the extension is defined as part of the scale set model, which means every new instance (whether from initial deployment, scale-out, or reimaging) automatically runs the script.

The execution flow:

1. The VM boots and the Azure VM Agent starts.
2. The VM Agent downloads the Custom Script Extension handler.
3. The handler downloads your script from the specified source.
4. The script runs with root (Linux) or admin (Windows) privileges.
5. The exit code is reported back to Azure as the extension status.

## Adding a Custom Script Extension (Linux)

Here is a basic example that installs nginx and deploys a web application on each scale set instance:

```bash
# Add the Custom Script Extension to a scale set
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myScaleSet \
  --name CustomScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --settings '{
    "fileUris": ["https://raw.githubusercontent.com/myorg/myapp/main/deploy/setup.sh"],
    "commandToExecute": "./setup.sh"
  }'
```

And here is what a typical setup script looks like:

```bash
#!/bin/bash
# setup.sh - Configure a web server instance for the scale set
# This script runs as root on each new instance

set -euo pipefail

# Log everything to a file for debugging
exec > /var/log/setup-script.log 2>&1
echo "Starting setup at $(date)"

# Update package lists and install dependencies
apt-get update
apt-get install -y nginx nodejs npm

# Create the application directory
mkdir -p /var/www/myapp

# Download the application code
# Using a release archive from GitHub
curl -L https://github.com/myorg/myapp/releases/download/v2.1.0/app.tar.gz \
  -o /tmp/app.tar.gz

# Extract to the web root
tar xzf /tmp/app.tar.gz -C /var/www/myapp

# Install Node.js dependencies
cd /var/www/myapp
npm install --production

# Configure nginx as a reverse proxy
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Health check endpoint
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # Proxy to the Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Start services
systemctl restart nginx
systemctl enable nginx

# Start the Node.js application
cd /var/www/myapp
npm start &

echo "Setup completed at $(date)"
```

## Using Protected Settings for Secrets

Never put credentials in the `settings` field - those are visible in the Azure portal and API. Use `protectedSettings` for anything sensitive:

```bash
# Use protected settings for secrets
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myScaleSet \
  --name CustomScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --settings '{
    "fileUris": ["https://mystorageaccount.blob.core.windows.net/scripts/setup.sh"]
  }' \
  --protected-settings '{
    "commandToExecute": "./setup.sh --db-password SuperSecret123 --api-key abc123",
    "storageAccountName": "mystorageaccount",
    "storageAccountKey": "base64encodedkey..."
  }'
```

When using Azure Blob Storage with a private container, the `storageAccountName` and `storageAccountKey` in protected settings allow the extension to authenticate and download the script.

## Custom Script Extension for Windows

The Windows version uses a different publisher and slightly different syntax:

```bash
# Add Custom Script Extension for Windows scale set
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myWindowsScaleSet \
  --name CustomScriptExtension \
  --publisher Microsoft.Compute \
  --version 1.10 \
  --settings '{
    "fileUris": ["https://mystorageaccount.blob.core.windows.net/scripts/setup.ps1"]
  }' \
  --protected-settings '{
    "commandToExecute": "powershell -ExecutionPolicy Unrestricted -File setup.ps1",
    "storageAccountName": "mystorageaccount",
    "storageAccountKey": "base64encodedkey..."
  }'
```

A typical Windows setup script:

```powershell
# setup.ps1 - Configure a Windows web server instance
# Runs with administrator privileges

# Log output
Start-Transcript -Path C:\setup-script.log

# Install IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install .NET hosting bundle
$dotnetUrl = "https://download.visualstudio.microsoft.com/download/pr/hosting-bundle.exe"
Invoke-WebRequest -Uri $dotnetUrl -OutFile C:\temp\hosting-bundle.exe
Start-Process -FilePath C:\temp\hosting-bundle.exe -ArgumentList "/install /quiet" -Wait

# Download and deploy the application
Invoke-WebRequest -Uri "https://myrelease.blob.core.windows.net/releases/app-v2.1.0.zip" `
  -OutFile C:\temp\app.zip
Expand-Archive -Path C:\temp\app.zip -DestinationPath C:\inetpub\wwwroot\myapp

# Configure IIS site
Import-Module WebAdministration
New-WebSite -Name "MyApp" -PhysicalPath "C:\inetpub\wwwroot\myapp" -Port 80 -Force

Stop-Transcript
```

## Using ARM Templates

For infrastructure-as-code, define the extension in your ARM template:

```json
{
  "type": "Microsoft.Compute/virtualMachineScaleSets",
  "apiVersion": "2023-07-01",
  "name": "myScaleSet",
  "properties": {
    "virtualMachineProfile": {
      "extensionProfile": {
        "extensions": [
          {
            "name": "CustomScript",
            "properties": {
              "publisher": "Microsoft.Azure.Extensions",
              "type": "CustomScript",
              "typeHandlerVersion": "2.1",
              "autoUpgradeMinorVersion": true,
              "settings": {
                "fileUris": [
                  "[concat('https://', variables('storageAccountName'), '.blob.core.windows.net/scripts/setup.sh')]"
                ]
              },
              "protectedSettings": {
                "commandToExecute": "[concat('./setup.sh --env ', parameters('environment'))]",
                "storageAccountName": "[variables('storageAccountName')]",
                "storageAccountKey": "[listKeys(resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName')), '2023-01-01').keys[0].value]"
              }
            }
          }
        ]
      }
    }
  }
}
```

## Extension Sequencing

If you have multiple extensions (for example, Custom Script plus a monitoring agent), you can control the execution order:

```bash
# Ensure the Custom Script runs before the monitoring agent
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myScaleSet \
  --name CustomScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --provision-after-extensions "DependencyAgentLinux" \
  --settings '{
    "fileUris": ["https://mystorageaccount.blob.core.windows.net/scripts/setup.sh"],
    "commandToExecute": "./setup.sh"
  }'
```

This ensures your application is set up before the monitoring agent starts, so the agent can immediately begin collecting application-specific metrics.

## Troubleshooting Script Failures

When a Custom Script Extension fails, it can be tricky to debug because you cannot SSH into the instance before the extension runs. Here is how to investigate:

### Check Extension Status

```bash
# View extension status for all instances
az vmss get-instance-view \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --instance-id "*" \
  --query "[].{Instance:instanceId, Extensions:extensions[].{Name:name, Status:statuses[0].displayStatus, Message:statuses[0].message}}" \
  -o json
```

### Check Logs on the Instance

If you can SSH into the instance, check the extension logs:

```bash
# Linux extension logs location
cat /var/lib/waagent/custom-script/download/0/stderr
cat /var/lib/waagent/custom-script/download/0/stdout

# Your script's own log file (if you set one up)
cat /var/log/setup-script.log
```

```powershell
# Windows extension logs location
Get-Content "C:\Packages\Plugins\Microsoft.Compute.CustomScriptExtension\1.10\Status\0.status"
```

### Common Failure Causes

**Script download failure**: The URL is wrong, the storage account key is expired, or NSG rules block outbound HTTPS. Test the URL from a VM in the same network first.

**Script execution error**: The script has a bug. Always use `set -euo pipefail` in bash scripts so errors are caught rather than silently ignored. Log everything.

**Timeout**: Custom Script Extensions have a 90-minute timeout by default. If your setup takes longer, consider baking more into the base image.

**Idempotency**: Scripts might run more than once (during reimaging or model updates). Write scripts that can safely run multiple times. Check if packages are already installed before installing them, use `mkdir -p` instead of `mkdir`, etc.

## Best Practices

**Keep scripts small**: The Custom Script Extension should handle the last-mile configuration, not the entire server setup. Bake common packages and configuration into your golden image and use the script for deployment-specific tasks.

**Use version-pinned downloads**: Do not download "latest" anything in a setup script. Pin versions for every package and artifact so you can reproduce the exact same configuration.

**Implement health endpoints**: Your script should end by starting the application and verifying it responds to health checks. This way, the scale set's health monitoring can detect script failures.

**Store scripts in versioned storage**: Use Azure Blob Storage with versioning or a Git repository for your scripts. Being able to roll back to a previous script version is critical.

**Monitor extension execution time**: Track how long the extension takes across instances using monitoring tools like OneUptime. If setup time creeps up, it slows down scaling and new deployments.

## Wrapping Up

Custom Script Extensions bridge the gap between a base OS image and a production-ready application server. They run automatically on every new scale set instance, ensuring consistent configuration without manual intervention. Write idempotent scripts, protect your secrets with protectedSettings, log everything for debugging, and keep the script focused on last-mile configuration while baking common dependencies into the image. That combination gives you fast, reliable, and reproducible deployments across your entire scale set.
