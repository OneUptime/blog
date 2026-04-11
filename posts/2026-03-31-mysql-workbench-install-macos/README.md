# How to Install MySQL Workbench on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, macOS, Installation, GUI

Description: Install MySQL Workbench on macOS using the official DMG package, connect to a local or remote MySQL server, and use the SQL editor and schema designer.

---

## How It Works

MySQL Workbench for macOS is distributed as a DMG containing a standard `.app` bundle. Drag it to the Applications folder to install. No package manager is required, though an unofficial Homebrew cask is also available.

```mermaid
flowchart LR
    A[Download Workbench DMG] --> B[Drag to Applications]
    B --> C[Allow Gatekeeper / notarization]
    C --> D[Launch MySQL Workbench]
    D --> E[Create connection profile]
    E --> F[Connect to MySQL server]
```

## Prerequisites

- macOS 12 Monterey, 13 Ventura, 14 Sonoma, or 15 Sequoia
- MySQL server installed locally or accessible remotely
- Apple Silicon (ARM) or Intel Mac - separate DMG packages for each architecture

## Method 1 - Install from the Official DMG

1. Visit [https://dev.mysql.com/downloads/workbench/](https://dev.mysql.com/downloads/workbench/)
2. Select **macOS** from the OS dropdown.
3. Choose the correct architecture:
   - **macOS 14 ARM, 64-bit** for Apple Silicon (M1/M2/M3/M4)
   - **macOS 14 x86, 64-bit** for Intel Macs
4. Click **Download** (you can skip the Oracle login).
5. Open the downloaded `.dmg` file.
6. Drag **MySQLWorkbench.app** to the **Applications** folder.
7. Eject the DMG.

## Method 2 - Install via Homebrew

```bash
brew install --cask mysql-workbench
```

## Step 2 - Launch MySQL Workbench

Open from **Applications** or Spotlight (`Cmd+Space`, type "MySQL Workbench").

On the first launch, macOS Gatekeeper may show a warning. Go to **System Settings > Privacy & Security** and click **Open Anyway**.

## Step 3 - Create a Local Connection

1. Click **+** next to "MySQL Connections."
2. Enter connection details:

```text
Connection Name:  Local MySQL
Connection Method: Standard (TCP/IP)
Hostname:         127.0.0.1
Port:             3306
Username:         root
```

3. Click **Store in Keychain** to save the password securely.
4. Click **Test Connection**.
5. Click **OK**.

## Step 4 - Connect to a Remote Server via SSH Tunnel

1. Click **+** to add a new connection.
2. Set **Connection Method** to **Standard TCP/IP over SSH**.

```text
SSH Hostname:     db.example.com:22
SSH Username:     ubuntu
SSH Key File:     /Users/yourname/.ssh/id_rsa
MySQL Hostname:   127.0.0.1
MySQL Port:       3306
Username:         appuser
```

## Using the SQL Editor

Open a query tab with `Cmd+T`.

```sql
-- Show all databases
SHOW DATABASES;

-- Use a specific database
USE myapp;

-- Create a table
CREATE TABLE products (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Query
SELECT name, price FROM products WHERE price > 50 ORDER BY price;
```

Execute all with `Cmd+Shift+Enter`, or the statement at the cursor with `Cmd+Enter`.

## Visual Explain Plan

1. Write a SELECT statement.
2. Click the **Explain** button or press `Cmd+Shift+X`.
3. Click **Visual Explain** for a graphical query execution plan.
4. Look for `Full Table Scan` (red) nodes - those indicate missing indexes.

## Exporting a Schema

Go to **Server > Data Export**, select the schema, choose **Export to Self-Contained File**, and click **Start Export**. This generates a `.sql` file compatible with `mysql` on the command line.

## Updating MySQL Workbench

Download the latest DMG from the MySQL website and drag the new `.app` to Applications, replacing the old version.

Or via Homebrew:

```bash
brew upgrade --cask mysql-workbench
```

## Troubleshooting

### "MySQL Workbench is damaged and cannot be opened"

Run the following to clear the quarantine attribute.

```bash
xattr -d com.apple.quarantine /Applications/MySQLWorkbench.app
```

### Workbench cannot find the local socket

On macOS, the MySQL socket is at `/tmp/mysql.sock`. Verify this matches the MySQL configuration.

```bash
mysql -u root -p -e "SHOW VARIABLES LIKE 'socket';"
```

If the path differs, update the connection in Workbench to point to the correct socket path via the **Advanced** tab of the connection editor.

## Summary

MySQL Workbench on macOS is installed by dragging the `.app` from the downloaded DMG to the Applications folder. Homebrew offers a simpler install and upgrade path via `brew install --cask mysql-workbench`. After launching, create connection profiles for local and remote databases. The SQL editor, visual explain plan, and schema design tools make it a full-featured database workstation for macOS developers.
