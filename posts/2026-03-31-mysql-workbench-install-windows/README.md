# How to Install MySQL Workbench on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, Window, Installation, GUI

Description: Install MySQL Workbench on Windows 10 or 11 using the MySQL Installer or the standalone MSI, create connection profiles, and use the SQL editor.

---

## How It Works

MySQL Workbench is available for Windows as part of the MySQL Installer bundle or as a standalone MSI package. It requires Microsoft Visual C++ Redistributable 2019 or later, which the installer provides automatically.

```mermaid
flowchart LR
    A[Run MySQL Installer or Workbench MSI] --> B[Install prerequisites]
    B --> C[Complete installation wizard]
    C --> D[Launch Workbench]
    D --> E[Create connection]
    E --> F[Connect to MySQL server]
```

## Prerequisites

- Windows 10 or Windows 11 (64-bit)
- Microsoft Visual C++ Redistributable 2019 or later
- .NET Framework 4.5.2 or later
- ~500 MB free disk space

## Method 1 - Install via MySQL Installer (Recommended)

The MySQL Installer manages all MySQL products (server, Workbench, Shell, connectors) in one place.

1. Download from [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/)
2. Run `mysql-installer-community-x.x.x.x.msi`
3. On the **Setup Type** screen, choose **Developer Default** (includes Workbench) or **Custom** to select individual products.
4. Click **Next**, then **Execute** to install.
5. After installation, Workbench appears in the **Start Menu** under **MySQL**.

## Method 2 - Install the Standalone MSI

For Workbench only, without other MySQL products:

1. Go to [https://dev.mysql.com/downloads/workbench/](https://dev.mysql.com/downloads/workbench/)
2. Download `mysql-workbench-community-8.0.x-winx64.msi`
3. Double-click the MSI and follow the wizard:
   - Welcome > License Agreement > Choose Setup Type (Complete) > Install
4. Accept UAC prompts when asked.

## Launching MySQL Workbench

Open from the Start Menu: **MySQL > MySQL Workbench 8.0 CE**

Or from PowerShell / Command Prompt:

```bash
"C:\Program Files\MySQL\MySQL Workbench 8.0 CE\MySQLWorkbench.exe"
```

## Creating a Connection Profile

### Local Connection

1. Click **+** next to "MySQL Connections."
2. Fill in the fields:

```text
Connection Name:  Local Dev
Connection Method: Standard (TCP/IP)
Hostname:         127.0.0.1
Port:             3306
Username:         root
```

3. Click **Store in Vault** and enter the password.
4. Click **Test Connection** to verify.
5. Click **OK**.

### Remote Connection via SSH Tunnel

```text
Connection Method: Standard TCP/IP over SSH
SSH Hostname:     your-server.example.com:22
SSH Username:     ec2-user
SSH Key File:     C:\Users\YourName\.ssh\id_rsa
MySQL Hostname:   127.0.0.1
MySQL Port:       3306
Username:         appuser
```

## Using the SQL Editor

Open a new query tab with `Ctrl+T`.

```sql
-- List databases
SHOW DATABASES;

-- Create a table
CREATE TABLE orders (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer   VARCHAR(100) NOT NULL,
    total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO orders (customer, total)
VALUES ('Alice', 149.99), ('Bob', 79.50);

-- Query the table
SELECT * FROM orders ORDER BY created_at DESC;
```

Run with `Ctrl+Shift+Enter`.

## Schema Design with EER Diagrams

1. Go to **File > New Model**.
2. Double-click **Add Diagram**.
3. Drag tables from the Catalog panel onto the canvas.
4. Use the relationship toolbar to add foreign key lines.
5. Forward-engineer to generate SQL: **Database > Forward Engineer**.

## Exporting and Importing Data

Export a database to SQL dump:

```text
Server > Data Export
Select schema(s) > Export to Self-Contained File
File: C:\Backups\myapp-2026-03-31.sql
```

Import from dump:

```text
Server > Data Import
Import from Self-Contained File: C:\Backups\myapp-2026-03-31.sql
Default Target Schema: myapp
```

## Updating MySQL Workbench

Open MySQL Installer and click **Update** next to MySQL Workbench, or re-run the standalone MSI.

## Summary

MySQL Workbench on Windows is best installed through the MySQL Installer, which also manages the MySQL server, Shell, and connectors. After installation, create connection profiles for local and remote servers. The SQL editor, visual explain plan, schema designer, and export/import tools make Workbench a comprehensive database management environment for Windows users.
