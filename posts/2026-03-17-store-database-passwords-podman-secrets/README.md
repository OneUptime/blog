# How to Store Database Passwords as Podman Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Database, Password, Security

Description: Learn how to securely store and use database passwords with Podman secrets for PostgreSQL, MySQL, MongoDB, and other databases.

---

> Database passwords should never be passed as plain environment variables or stored in images. Podman secrets provide the secure alternative for delivering credentials to database containers.

Database credentials are among the most sensitive data in any application. Exposing them in environment variables, command lines, or image layers creates security risks. Podman secrets deliver passwords securely as files that are only accessible inside the container.

---

## PostgreSQL Password Secret

```bash
# Create the password secret

echo -n "secure-postgres-password-2026" | podman secret create pg_password -

# Run PostgreSQL using the secret with _FILE suffix
podman run -d \
  --name postgres \
  --secret pg_password \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/pg_password \
  -e POSTGRES_USER=myapp \
  -e POSTGRES_DB=myappdb \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15
```

## MySQL Password Secret

```bash
# Create secrets for MySQL root and application user
echo -n "mysql-root-password" | podman secret create mysql_root_pass -
echo -n "mysql-app-password" | podman secret create mysql_app_pass -

# Run MySQL using _FILE environment variables
podman run -d \
  --name mysql \
  --secret mysql_root_pass \
  --secret mysql_app_pass \
  -e MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root_pass \
  -e MYSQL_PASSWORD_FILE=/run/secrets/mysql_app_pass \
  -e MYSQL_USER=appuser \
  -e MYSQL_DATABASE=myapp \
  -v mysqldata:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8
```

## MongoDB Password Secret

```bash
# Create MongoDB admin password
echo -n "mongo-admin-password" | podman secret create mongo_pass -

# Run MongoDB with secret-based authentication
podman run -d \
  --name mongodb \
  --secret mongo_pass \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_pass \
  -v mongodata:/data/db \
  -p 27017:27017 \
  mongo:7
```

## Redis Authentication Secret

```bash
# Create Redis auth config with the password
printf "requirepass redis-strong-password\n" | podman secret create redis_conf -

# Run Redis with secret-based authentication
podman run -d \
  --name redis \
  --secret redis_conf,target=/usr/local/etc/redis/redis.conf \
  redis:7 \
  redis-server /usr/local/etc/redis/redis.conf
```

## Application Connecting to Database

```bash
# Create both the database and application secrets
echo -n "shared-db-password" | podman secret create db_password -

# Create a pod network
podman network create app-network

# Start the database
podman run -d \
  --name postgres \
  --network app-network \
  --secret db_password \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/db_password \
  -e POSTGRES_DB=myapp \
  postgres:15

# Start the application with the same secret
podman run -d \
  --name app \
  --network app-network \
  --secret db_password \
  -p 8080:8080 \
  my-app:latest

# The application reads /run/secrets/db_password to connect to postgres
```

## Reading Database Passwords in Application Code

```bash
# Python example for reading the secret file
# password = open('/run/secrets/db_password').read().strip()

# Node.js example
# const password = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();

# Go example
# data, _ := os.ReadFile("/run/secrets/db_password")
# password := strings.TrimSpace(string(data))
```

## Summary

Store database passwords as Podman secrets using `podman secret create` and deliver them to containers via file mounts. Many official database images support the `_FILE` suffix convention (like `POSTGRES_PASSWORD_FILE`) to read credentials from files. When the image reads the mounted secret file directly, this approach keeps passwords out of environment variable listings, process tables, and container inspection output, providing a significant security improvement over plain environment variables.
