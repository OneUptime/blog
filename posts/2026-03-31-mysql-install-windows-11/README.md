# How to Install MySQL on Windows 11

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Window, Database, Configuration

Description: Install MySQL 8.0 on Windows 11 using the MySQL Installer, configure the server type, set the root password, and start the Windows service.

---

## How It Works

MySQL provides a graphical installer for Windows that handles downloading, installing, and configuring multiple MySQL products (server, Workbench, Shell, connectors) in a single wizard. The server registers as a Windows service so it starts automatically on boot.

```mermaid
flowchart LR
    A[Download MySQL Installer] --> B[Run mysql-installer-community.exe]
    B --> C[Select setup type]
    C --> D[Install products]
    D --> E[Configure server]
    E --> F[Set root password]
    F --> G[MySQL Windows Service starts]
```

## Prerequisites

- Windows 11 (64-bit)
- Administrator account
- Microsoft Visual C++ Redistributable 2019 or later (the installer provides this)
- ~500 MB disk space for a developer default install

## Step 1 - Download MySQL Installer

Go to [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/) and download the **mysql-installer-community** package (the larger offline installer is recommended for reliability).

## Step 2 - Run the Installer

Double-click the downloaded `.exe` file. Accept the UAC prompt.

On the **Choosing a Setup Type** screen, select the appropriate type:

```text
Developer Default   MySQL Server + Workbench + Shell + connectors (recommended for dev)
Server Only         MySQL Server only
Custom              Choose individual products
```

Click **Next** and then **Execute** to download and install the selected products.

## Step 3 - Configure the MySQL Server

After installation, the configuration wizard launches automatically.

**Config Type** - Select **Development Computer** for a local dev machine or **Server Computer** for a dedicated server. This adjusts default memory allocation.

**Connectivity** - Keep the default port **3306** unless another service already uses it. Enable **Open Windows Firewall port for network access** if other machines need to connect.

**Authentication Method** - Choose **Use Strong Password Encryption** (caching_sha2_password). Note that older clients (PHP < 7.4, older JDBC drivers) may require the legacy authentication option.

```text
Recommended: Use Strong Password Encryption (caching_sha2_password)
Legacy:      Use Legacy Authentication Method (mysql_native_password)
```

## Step 4 - Set the Root Password

Enter a strong root password. Optionally add additional MySQL user accounts on the **Accounts and Roles** screen.

```text
Password requirements for STRONG policy:
  - At least 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character (!@#$%^&*)
```

## Step 5 - Configure the Windows Service

On the **Windows Service** screen:

```text
Service Name:        MySQL80
Start at System Startup: Checked
Run Windows Service as:  Standard System Account
```

Click **Next** and then **Execute** to apply the configuration.

## Step 6 - Verify the Installation

Open Command Prompt or PowerShell as Administrator.

```bash
mysql -u root -p
```

Enter the root password. You should see the MySQL prompt.

```text
mysql>
```

Check the version.

```sql
SELECT VERSION();
```

```text
+-----------+
| VERSION() |
+-----------+
| 8.0.x     |
+-----------+
```

## Managing the MySQL Service

Open PowerShell as Administrator.

```powershell
# Check service status
Get-Service -Name MySQL80

# Stop the service
Stop-Service -Name MySQL80

# Start the service
Start-Service -Name MySQL80

# Restart the service
Restart-Service -Name MySQL80
```

Alternatively, use the Services applet (`services.msc`) or the MySQL Notifier tray application.

## Adding MySQL to the PATH

If `mysql` is not recognized in Command Prompt, add the MySQL bin directory to the system PATH.

```text
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

In PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable(
  "Path",
  $env:Path + ";C:\Program Files\MySQL\MySQL Server 8.0\bin",
  "Machine"
)
```

Restart your terminal for the change to take effect.

## Key File Locations

```text
C:\ProgramData\MySQL\MySQL Server 8.0\my.ini   Configuration file
C:\ProgramData\MySQL\MySQL Server 8.0\Data\    Data directory
C:\ProgramData\MySQL\MySQL Server 8.0\Data\<hostname>.err   Error log
```

## Summary

MySQL on Windows 11 is installed via the MySQL Installer wizard, which configures the server, sets authentication parameters, and registers a Windows service in a guided workflow. Choose the Developer Default setup type to get MySQL Workbench and MySQL Shell alongside the server. After installation, the server starts automatically and is accessible from the `mysql` command-line client using the root password you set during configuration.
