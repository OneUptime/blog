# How to Connect to MySQL Using MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Shell, Connection, URI, Tool

Description: Learn how to connect to MySQL using MySQL Shell with URI syntax, individual parameters, and session types including X Protocol and classic MySQL protocol.

---

MySQL Shell is the modern command-line client for MySQL, supporting SQL, JavaScript, and Python modes as well as the X DevAPI and AdminAPI. Connecting to a MySQL server with MySQL Shell differs from the classic `mysql` client in syntax and available options.

## Prerequisites

MySQL Shell (`mysqlsh`) must be installed. Verify with:

```bash
mysqlsh --version
```

## Connect Using URI Syntax

MySQL Shell uses a URI-style connection string:

```bash
# General URI format: [user[:password]@]host[:port][/schema]
mysqlsh root@localhost
mysqlsh root@localhost:3306
mysqlsh root@localhost/mydb

# With password in URI (not recommended for scripts - password visible in shell history)
mysqlsh root:mypassword@localhost/mydb

# With TCP/IP protocol
mysqlsh root@localhost:3306/mydb --sql
```

When you connect without a password, MySQL Shell will prompt you securely.

## Connect Using Individual Parameters

```bash
# Use long-form flags
mysqlsh --host=localhost --port=3306 --user=root --schema=mydb

# Short-form flags
mysqlsh -h localhost -P 3306 -u root -D mydb
```

## Connect via Unix Socket

```bash
mysqlsh root@localhost --socket=/var/lib/mysql/mysql.sock
```

## X Protocol vs Classic Protocol

MySQL Shell defaults to the X Protocol (port 33060). To use the classic MySQL protocol:

```bash
# Classic protocol (port 3306)
mysqlsh root@localhost:3306 --mysql

# X Protocol (port 33060)
mysqlsh root@localhost:33060 --mysqlx
```

Check if X Plugin is enabled on the server:

```sql
SHOW PLUGINS;
-- Look for mysqlx with Status: ACTIVE
```

## Connect to a Remote Server

```bash
# Connect to a remote host
mysqlsh dbadmin@db.production.example.com:3306/mydb

# With SSL required
mysqlsh dbadmin@db.production.example.com:3306 --ssl-mode=REQUIRED
```

## Start in a Specific Mode

By default, MySQL Shell starts in JavaScript mode. Specify the mode:

```bash
# Start in SQL mode directly
mysqlsh root@localhost --sql

# Start in Python mode
mysqlsh root@localhost --py

# Start in JavaScript mode (default)
mysqlsh root@localhost --js
```

## Use a Config File

Store connection details in a configuration file to avoid repeating them:

```bash
# Always save passwords to the credential store (default is "prompt")
mysqlsh --save-passwords=always root@localhost
```

You can also set persistent options using the `\option` command inside MySQL Shell:

```text
\option --persist defaultMode sql
\option --persist showWarnings true
```

## Non-Interactive / Scripted Connections

For automation and scripts:

```bash
# Execute a single SQL statement
mysqlsh root@localhost --sql -e "SHOW DATABASES;"

# Execute a SQL file
mysqlsh root@localhost --sql < script.sql

# Read password from stdin
echo "mypassword" | mysqlsh root@localhost --passwords-from-stdin --sql -e "SELECT 1;"
```

## Summary

MySQL Shell connects using URI syntax (`user@host:port/schema`) or individual flags. It defaults to X Protocol on port 33060 but can use the classic protocol with `--mysql` on port 3306. Use `--sql`, `--py`, or `--js` to start in a specific language mode. For scripting, pass SQL statements with `-e` or pipe in a SQL file.
