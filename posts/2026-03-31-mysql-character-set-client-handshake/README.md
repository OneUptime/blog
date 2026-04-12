# How to Configure MySQL Character Set Client Handshake

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Character Set, Encoding, Handshake, Configuration

Description: Learn how MySQL character set negotiation works during client connection handshake and how to configure it correctly to avoid encoding issues.

---

## Overview

When a MySQL client connects to the server, a character set negotiation handshake occurs that determines how text data is encoded for the session. Misconfigured character sets lead to corrupted data, question marks, or incorrect string comparisons. Understanding the handshake process lets you configure it correctly from the start.

## The Character Set Handshake Process

During connection establishment:

```text
1. Client connects to server
2. Server sends handshake packet with server_charset
3. Client sends response with desired character set
4. Server adjusts session variables:
   - character_set_client  (encoding of queries sent by client)
   - character_set_results (encoding of results sent to client)
   - character_set_connection (character set for literals and number-to-string conversion)
```

## Viewing Current Character Set Settings

```sql
-- View all character set session variables
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
```

Example output:

```text
+--------------------------+--------------------+
| Variable_name            | Value              |
+--------------------------+--------------------+
| character_set_client     | utf8mb4            |
| character_set_connection | utf8mb4            |
| character_set_database   | utf8mb4            |
| character_set_results    | utf8mb4            |
| character_set_server     | utf8mb4            |
| character_set_system     | utf8               |
+--------------------------+--------------------+
```

## The character_set_client_handshake Variable

The server variable `character_set_client_handshake` controls whether the server honors the character set requested by the client:

```sql
SHOW VARIABLES LIKE 'character_set_client_handshake';
```

```text
ON  (default) - Server uses the character set requested by the client
OFF           - Server ignores the client's request and uses server default
```

Setting it to `OFF` forces all clients to use the server's default character set, regardless of what the client requests - useful when you need to enforce a specific encoding across all connections.

## Configuring the Default Character Set

Set the server's default to `utf8mb4` for full Unicode support (including emoji):

```text
[mysqld]
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci
character_set_client_handshake = ON
```

## Setting Character Set per Session

Clients can explicitly request a character set after connecting:

```sql
-- Set all three character set variables at once
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Equivalent to:
SET character_set_client = utf8mb4;
SET character_set_results = utf8mb4;
SET character_set_connection = utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;
```

Most drivers send `SET NAMES` automatically if configured:

```python
import mysql.connector

config = {
    'host': 'localhost',
    'user': 'app_user',
    'password': 'secure_password',
    'database': 'myapp',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
    'use_unicode': True
}

conn = mysql.connector.connect(**config)
```

## Diagnosing Character Set Issues

```sql
-- Check what character set is active in the current session
SELECT
    @@character_set_client AS client,
    @@character_set_connection AS connection_cs,
    @@character_set_results AS results,
    @@character_set_database AS database_cs;

-- Check if a specific string contains unexpected encoding
SELECT HEX('Hello World');
SELECT HEX(name) FROM users WHERE id = 1;
```

## Forcing utf8mb4 for All Connections

For a server where all data must be `utf8mb4`:

```text
[mysqld]
character_set_server    = utf8mb4
collation_server        = utf8mb4_unicode_ci
init_connect            = 'SET NAMES utf8mb4'
```

Note: `init_connect` does not run for users with `SUPER` privilege - ensure application users do not have `SUPER`.

## Summary

MySQL character set handshake negotiation determines the encoding for each client session. The `character_set_client_handshake` variable controls whether the server honors client-requested character sets. Configure your server with `utf8mb4` as the default to support the full Unicode character range, including emoji and non-BMP characters. Ensure application drivers are configured with `charset=utf8mb4` so they request the correct encoding during the handshake, and use `SET NAMES utf8mb4` for clients that cannot configure this through their driver.
