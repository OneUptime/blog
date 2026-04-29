# How to Configure ksqlDB to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, KsqlDB, IPv4, Streaming, Configuration, SQL

Description: Configure ksqlDB server to listen on a specific IPv4 address, connect to Kafka brokers over IPv4, and restrict access to the ksqlDB REST API.

## Introduction

ksqlDB is a streaming SQL engine built on Kafka Streams. It exposes a REST API for running queries and creating streams/tables. Configuring which IPv4 address ksqlDB listens on controls access to this API and enables network isolation.

## ksqlDB Server Configuration

```properties
# /etc/ksqldb/ksql-server.properties

# REST API listener - bind to specific IPv4

listeners=http://10.0.0.5:8088

# Or for HTTPS (configure ssl.keystore.* and ssl.truststore.* too):
# listeners=https://10.0.0.5:8088

# Bootstrap server(s) - one or more Kafka broker IPv4 addresses
bootstrap.servers=10.0.0.1:9092,10.0.0.2:9092,10.0.0.3:9092

# Only needed when the listener address is not routable from other ksqlDB nodes
# ksql.advertised.listener=http://10.0.0.5:8088

# KsqlDB state store and processing
ksql.streams.state.dir=/var/lib/ksqldb/data
```

## Security Configuration

```properties
# /etc/ksqldb/ksql-server.properties

# Require HTTP Basic authentication for the REST API
authentication.method=BASIC
authentication.realm=KsqlServer-Props
authentication.roles=admin,developer

# If you switch listeners to HTTPS, configure TLS for the listener too:
# ssl.truststore.location=/etc/ksqldb/ssl/ksql.server.truststore.jks
# ssl.truststore.password=trustpass
# ssl.keystore.location=/etc/ksqldb/ssl/ksql.server.keystore.jks
# ssl.keystore.password=keypass
# ssl.key.password=keypass

# SSL for Kafka connections (if brokers use SSL)
security.protocol=SSL
ksql.streams.ssl.truststore.location=/etc/ksqldb/ssl/kafka.client.truststore.jks
ksql.streams.ssl.truststore.password=trustpass
```

```properties
# /etc/ksqldb/jaas_config.conf
KsqlServer-Props {
  org.eclipse.jetty.security.jaas.spi.PropertyFileLoginModule required
  file="/etc/ksqldb/password-file"
  debug="false";
};

# /etc/ksqldb/password-file
admin: AdminPass123,admin
appuser: ReadPass,developer
```

## Running ksqlDB

```bash
# Start ksqlDB server
KSQL_OPTS="-Djava.security.auth.login.config=/etc/ksqldb/jaas_config.conf" \
  ksql-server-start /etc/ksqldb/ksql-server.properties

# In another terminal, verify it's listening
sudo ss -tlnp | grep java | grep 8088
# Expected: 10.0.0.5:8088

# Check ksqlDB server status
curl --http1.1 -s -u admin:AdminPass123 http://10.0.0.5:8088/info | python3 -m json.tool
```

## Firewall Rules

```bash
# Allow ksqlDB REST API from app servers only
sudo ufw allow from 10.0.0.0/24 to any port 8088 proto tcp
sudo ufw deny 8088/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 8088 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8088 -j DROP
```

## Using the ksqlDB CLI

```bash
# Connect ksqlDB CLI to specific server IP
ksql http://10.0.0.5:8088

# Or with authentication:
ksql --user admin --password AdminPass123 http://10.0.0.5:8088

# In the CLI, run SQL:
ksql> CREATE STREAM orders (id BIGINT, product VARCHAR)
      WITH (KAFKA_TOPIC='orders', VALUE_FORMAT='JSON');

ksql> SELECT * FROM orders EMIT CHANGES;

# List streams
ksql> SHOW STREAMS;
```

## Using the REST API

```bash
# List all streams
curl --http1.1 -s -u admin:AdminPass123 http://10.0.0.5:8088/ksql \
  -H "Accept: application/vnd.ksql.v1+json" \
  -H "Content-Type: application/vnd.ksql.v1+json" \
  -d '{"ksql": "SHOW STREAMS;"}' | python3 -m json.tool

# Run a push query
curl --http2 -s -u admin:AdminPass123 http://10.0.0.5:8088/query-stream \
  -H "Accept: application/json" \
  -H "Content-Type: application/vnd.ksql.v1+json" \
  -d '{"sql": "SELECT * FROM orders EMIT CHANGES;"}'

# Check server status
curl --http1.1 -s -u admin:AdminPass123 http://10.0.0.5:8088/info
```

## Conclusion

ksqlDB's `listeners` property (not `listener.name`) defines the REST API binding address. Use `http://ip:8088` format to bind to a specific IPv4. Set `bootstrap.servers` to one or more reachable Kafka broker IPv4 addresses. Use `ksql.advertised.listener` only when other ksqlDB nodes can't route to the bound listener directly. Restrict the REST API port with firewall rules, and if you enable basic authentication, use the documented `authentication.*` settings with a JAAS file and HTTPS in production. The ksqlDB CLI and REST API use the same port.
