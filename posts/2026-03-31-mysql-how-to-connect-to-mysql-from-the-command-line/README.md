# How to Connect to MySQL from the Command Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Command Line, Mysql Client, Connection, CLI

Description: Connect to MySQL from the command line using the mysql client with options for host, port, user, password, database, and SSL configuration.

---

## The mysql Command-Line Client

MySQL ships with a command-line client called `mysql`. This tool lets you connect to a local or remote MySQL server, run SQL queries, and manage databases interactively or via scripts.

## Basic Connection Syntax

The general syntax for connecting is:

```bash
mysql -u username -p -h host -P port database_name
```

Options:
- `-u` - username
- `-p` - prompt for password (do not include the password inline)
- `-h` - hostname or IP address (default: `localhost`, which uses a Unix socket on Linux/macOS)
- `-P` - port (default: `3306`)
- `database_name` - optional, selects a database on connect

## Connecting as Root Locally

```bash
mysql -u root -p
```

You will be prompted for the root password. After successful authentication, you see the MySQL prompt:

```text
mysql>
```

## Connecting to a Specific Database

```bash
mysql -u root -p myapp_db
```

This connects to MySQL and immediately selects the `myapp_db` database, equivalent to running `USE myapp_db;` manually.

## Connecting to a Remote Server

```bash
mysql -u appuser -p -h 192.168.1.100 -P 3306
```

If the remote server uses a non-standard port:

```bash
mysql -u appuser -p -h db.example.com -P 3307
```

## Avoiding the Password Prompt in Scripts

For automated scripts, you can store credentials in a `~/.my.cnf` file to avoid typing passwords or passing them on the command line:

```text
[client]
user     = myuser
password = MySecretPass123!
host     = 127.0.0.1
```

Set secure permissions on the file:

```bash
chmod 600 ~/.my.cnf
```

Now connect without specifying credentials:

```bash
mysql myapp_db
```

Alternatively, use a login path (MySQL 5.6.6+):

```bash
mysql_config_editor set --login-path=local \
  --host=127.0.0.1 \
  --user=root \
  --password

# Connect using the stored profile
mysql --login-path=local
```

## Running a Single SQL Command

Execute a SQL statement without entering the interactive shell:

```bash
mysql -u root -p myapp_db -e "SELECT COUNT(*) FROM users;"
```

Example output:

```text
+----------+
| COUNT(*) |
+----------+
|      512 |
+----------+
```

## Running a SQL Script File

Execute a `.sql` file against a database:

```bash
mysql -u root -p myapp_db < /path/to/schema.sql
```

To suppress output during import:

```bash
mysql -u root -p myapp_db < dump.sql > /dev/null
```

## Connecting with SSL

To enforce SSL for a connection to a remote server:

```bash
mysql -u appuser -p \
  -h db.example.com \
  --ssl-ca=/etc/mysql/ssl/ca-cert.pem \
  --ssl-cert=/etc/mysql/ssl/client-cert.pem \
  --ssl-key=/etc/mysql/ssl/client-key.pem
```

Verify SSL is active inside the MySQL shell:

```sql
\s
```

Look for the `SSL` line in the status output - it should show the cipher being used rather than `Not in use`.

## Useful MySQL Shell Commands

Once connected, these shortcuts help navigate the shell:

```text
\h       - display help
\s       - show connection status and server info
\q       - quit the shell
\u db    - switch to database named db
SHOW DATABASES;         - list all databases
SHOW TABLES;            - list tables in current database
DESCRIBE tablename;     - show table structure
```

## Connection Troubleshooting

Common error messages and their causes:

```text
ERROR 1045 (28000): Access denied for user 'root'@'localhost'
```
- Wrong password, or the user does not have permission from this host.

```text
ERROR 2002 (HY000): Can't connect to local MySQL server through socket
```
- MySQL is not running, or the socket file path is wrong.

```text
ERROR 2003 (HY000): Can't connect to MySQL server on '192.168.1.100'
```
- Firewall is blocking port 3306, or `bind-address` is not set to allow remote connections.

## Summary

Use the `mysql` command with `-u`, `-p`, `-h`, and `-P` flags to connect to local or remote MySQL servers. Store credentials in `~/.my.cnf` or use `mysql_config_editor` for secure, password-free script connections. The `-e` flag runs a single SQL command non-interactively, while `<` redirects a SQL file for batch execution.
