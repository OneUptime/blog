# How to Start and Stop MySQL on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Service, Window, Administration, Configuration

Description: Start, stop, restart, and configure the MySQL Windows service using PowerShell, the Services console, net commands, and the MySQL Notifier tray application.

---

## How It Works

On Windows, MySQL runs as a Windows service registered by the MySQL Installer. The default service name is `MySQL80` for MySQL 8.0. You can manage it with PowerShell cmdlets, the `net` command, the Services MMC snap-in (`services.msc`), or the MySQL Notifier tray icon.

```mermaid
flowchart LR
    A[Windows Service Manager] --> B[MySQL80 service]
    B --> C[mysqld.exe process]
    C --> D[Port 3306 listening]
    D --> E[Accepts TCP connections]
```

## Finding the MySQL Service Name

Open PowerShell and list MySQL-related services.

```bash
Get-Service -DisplayName "MySQL*"
```

```text
Status   Name               DisplayName
------   ----               -----------
Running  MySQL80            MySQL80
```

The service name (e.g., `MySQL80`) is what you use in all management commands.

## Method 1 - PowerShell (Recommended)

Run PowerShell as Administrator for service management commands.

```bash
# Start MySQL
Start-Service -Name MySQL80

# Stop MySQL
Stop-Service -Name MySQL80

# Restart MySQL
Restart-Service -Name MySQL80

# Check status
Get-Service -Name MySQL80
```

Output example:

```text
Status   Name               DisplayName
------   ----               -----------
Running  MySQL80            MySQL80
```

## Method 2 - net Commands (Command Prompt)

Open Command Prompt as Administrator.

```bash
# Start MySQL
net start MySQL80

# Stop MySQL
net stop MySQL80
```

## Method 3 - Services Console (services.msc)

1. Press `Win+R`, type `services.msc`, and press Enter.
2. Scroll to find **MySQL80**.
3. Right-click and select **Start**, **Stop**, or **Restart**.

## Method 4 - MySQL Notifier (Deprecated)

MySQL Notifier was a tray application previously bundled with MySQL Installer. It is no longer included in current MySQL 8.0+ Installer packages. If you have an older installation that includes it, the steps are:

1. Right-click the MySQL tray icon.
2. Hover over the service name (e.g., `MySQL80`).
3. Click **Start**, **Stop**, or **Restart**.

## Configuring Automatic Startup

To ensure MySQL starts when Windows boots:

```bash
Set-Service -Name MySQL80 -StartupType Automatic
```

To prevent automatic startup:

```bash
Set-Service -Name MySQL80 -StartupType Manual
```

Check the current startup type:

```bash
Get-Service -Name MySQL80 | Select-Object Name, StartType
```

## Verifying MySQL Is Running

After starting the service, confirm MySQL is accepting connections.

```bash
mysql -u root -p -e "SELECT 1;"
```

```text
+---+
| 1 |
+---+
| 1 |
+---+
```

Check the port is listening.

```bash
netstat -an | findstr 3306
```

```text
TCP    0.0.0.0:3306    0.0.0.0:0    LISTENING
```

Or with PowerShell:

```bash
Get-NetTCPConnection -LocalPort 3306
```

## Viewing MySQL Service Logs on Windows

MySQL logs to a file in the data directory (set during installation). The default location is:

```text
C:\ProgramData\MySQL\MySQL Server 8.0\Data\<hostname>.err
```

View the last 50 lines in PowerShell:

```bash
Get-Content "C:\ProgramData\MySQL\MySQL Server 8.0\Data\YOURHOST.err" -Tail 50
```

Follow the log in real time:

```bash
Get-Content "C:\ProgramData\MySQL\MySQL Server 8.0\Data\YOURHOST.err" -Wait -Tail 10
```

## Starting MySQL Manually (Without the Service)

To start mysqld directly from the command line (useful for troubleshooting):

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --console
```

Press `Ctrl+C` to stop.

## Registering or Removing the Service

Register the service (if it was manually removed):

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --install MySQL80 --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
```

Remove the service:

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --remove MySQL80
```

## Summary

MySQL on Windows runs as a service named `MySQL80` (or similar). Use PowerShell `Start-Service`, `Stop-Service`, and `Restart-Service` cmdlets, or the `net start` / `net stop` commands from an Administrator prompt. The Services console offers a graphical alternative. Configure `Automatic` startup type to ensure MySQL starts with Windows.
