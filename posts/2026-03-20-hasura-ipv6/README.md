# How to Configure Hasura with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hasura, GraphQL, IPv6, PostgreSQL, Docker

Description: Configure Hasura GraphQL Engine to listen on IPv6 addresses and connect to PostgreSQL databases over IPv6.

## Overview

Configure Hasura GraphQL Engine to listen on IPv6 addresses and connect to PostgreSQL databases over IPv6. This guide covers the configuration steps and best practices.

## Prerequisites

- Basic understanding of IPv6 networking
- The relevant software installed and running
- IPv6 connectivity on your server

## Configuration

For Hasura, the important settings are `HASURA_GRAPHQL_SERVER_HOST` (or `--server-host`) for the HTTP listener and PostgreSQL connection URLs that use bracketed IPv6 literals. If Hasura and PostgreSQL are both running on a Docker bridge network, Docker IPv6 networking also needs to be enabled for that network.

```bash
# Verify IPv6 is available on your system

ip -6 addr show
ping -6 -c 3 ::1
```

## Step-by-Step Setup

### 1. Bind to IPv6 Interfaces

Hasura GraphQL Engine exposes `HASURA_GRAPHQL_SERVER_HOST` (or `--server-host`) for the listen address. Hasura uses Warp host preferences here, so `*6` prefers IPv6 and `!6` is IPv6-only:

```yaml
graphql-engine:
  environment:
    HASURA_GRAPHQL_SERVER_HOST: "*6" # use !6 for IPv6-only
```

### 2. Connect to PostgreSQL over IPv6

When you use a literal IPv6 address in a PostgreSQL connection URI, enclose the address in square brackets:

```yaml
graphql-engine:
  environment:
    HASURA_GRAPHQL_METADATA_DATABASE_URL: postgresql://hasura:secret@[2001:db8::10]:5432/postgres
    HASURA_GRAPHQL_DATABASE_URL: postgresql://hasura:secret@[2001:db8::10]:5432/appdb
```

PostgreSQL must also listen on IPv6 and allow the client network in `pg_hba.conf`:

```conf
# postgresql.conf
listen_addresses = '::'

# pg_hba.conf
host    all    all    2001:db8:1234::/64    scram-sha-256
```

### 3. Firewall Configuration

Ensure your firewall allows incoming connections on Hasura's default port over IPv6:

```bash
# UFW
sudo ufw allow 8080/tcp

# ip6tables
sudo ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### 4. DNS Configuration

Add an AAAA record pointing to your server's IPv6 address:

```text
example.com.  300  IN  AAAA  2001:db8::1
```

## Testing

```bash
# Test public endpoints over IPv6
curl -6 http://[2001:db8::1]:8080/healthz
curl -6 http://[2001:db8::1]:8080/v1/version

# Test the GraphQL endpoint over IPv6
curl -6 http://[2001:db8::1]:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: myadminsecretkey" \
  -d '{"query":"query { __typename }"}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your service's IPv6 endpoints. Set up HTTP monitors pointing to your AAAA-backed hostname or bracketed IPv6 URL and configure alerts for availability and response time thresholds.

## Conclusion

Configuring Hasura with IPv6 is primarily about setting `HASURA_GRAPHQL_SERVER_HOST` to an IPv6-capable value, using bracketed IPv6 addresses in PostgreSQL connection URLs, and making sure PostgreSQL and your firewall permit IPv6 traffic.
