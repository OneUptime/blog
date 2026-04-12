# How to Run MongoDB as a Windows Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Window, Administration

Description: Learn how to install, configure, and manage MongoDB as a Windows Service so it starts automatically and runs in the background on Windows Server.

---

Running MongoDB as a Windows Service ensures it starts automatically when the server boots and restarts on failure. This guide covers installing MongoDB as a service using the MSI installer and the command line.

## Prerequisites

- MongoDB Community or Enterprise Edition installer for Windows
- Administrator privileges
- At least 4 GB RAM recommended for production

## Method 1: Install as a Service via MSI Installer

1. Download the MongoDB MSI from mongodb.com/try/download/community.
2. Run the installer and select "Complete" installation.
3. On the "Service Configuration" screen, check "Install MongoDB as a Service".
4. Set the Service Name (default: `MongoDB`), data directory, and log directory.
5. Complete the installation.

The service starts automatically after installation.

## Method 2: Install as a Service via Command Line

First, create the necessary directories:

```bash
mkdir C:\data\db
mkdir C:\data\log
```

Create a configuration file at `C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`:

```text
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\db
net:
  port: 27017
  bindIp: 127.0.0.1
```

Install the service from an Administrator command prompt:

```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg" --install
```

## Starting and Stopping the Service

Using `net` commands:

```bash
# Start the service
net start MongoDB

# Stop the service
net stop MongoDB
```

Or using PowerShell:

```powershell
# Start
Start-Service -Name MongoDB

# Stop
Stop-Service -Name MongoDB

# Check status
Get-Service -Name MongoDB
```

## Configuring Service Recovery Options

Set the service to restart automatically on failure using PowerShell:

```powershell
sc.exe failure MongoDB reset= 86400 actions= restart/5000/restart/10000/restart/30000
```

This restarts the service after 5, 10, and 30 seconds on successive failures, resetting the failure count every 24 hours.

## Removing the Service

Stop the service first, then remove it:

```bash
net stop MongoDB
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --remove
```

## Verifying the Service is Running

Check the service status:

```powershell
Get-Service -Name MongoDB
```

Connect with mongosh to confirm:

```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongosh.exe" --port 27017
```

```javascript
db.adminCommand({ ping: 1 })
```

Expected output:

```text
{ ok: 1 }
```

## Common Issues

**Service fails to start - check the log:**

```bash
type C:\data\log\mongod.log
```

**Port 27017 already in use:**

```bash
netstat -ano | findstr :27017
```

Kill the conflicting process or change the MongoDB port in `mongod.cfg`.

## Summary

MongoDB can be installed as a Windows Service via the MSI installer or the `--install` command-line flag. Once installed, manage it with `net start`/`net stop` or PowerShell's `Start-Service`/`Stop-Service`. Configure automatic restart on failure using `sc.exe failure` for production reliability.
