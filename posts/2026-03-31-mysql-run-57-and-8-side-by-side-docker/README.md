# How to Run MySQL 5.7 and MySQL 8 Side by Side in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Docker, Migration, Container, Version

Description: Run MySQL 5.7 and MySQL 8.0 simultaneously in Docker on different ports to test migrations, compare behavior, and validate application compatibility.

---

Running multiple MySQL versions side by side is useful when migrating from MySQL 5.7 to 8.0. You can test your application against both versions simultaneously, validate schema changes, and compare query results before committing to an upgrade.

## Why Run Both Versions Together

MySQL 8.0 introduced breaking changes including the deprecation of the `utf8` alias for `utf8mb3`, deprecated `GROUP BY ... ASC/DESC` syntax, stricter SQL mode defaults, and changes to the default authentication plugin from `mysql_native_password` to `caching_sha2_password`. Running both versions lets you identify compatibility issues without touching production.

## Setting Up with Docker Compose

The easiest approach uses Docker Compose with two MySQL services bound to different host ports:

```yaml
services:
  mysql57:
    image: mysql:5.7
    container_name: mysql57
    environment:
      MYSQL_ROOT_PASSWORD: root57
      MYSQL_DATABASE: testdb
    ports:
      - "3306:3306"
    volumes:
      - mysql57_data:/var/lib/mysql
    networks:
      - mysql-test

  mysql8:
    image: mysql:8.0
    container_name: mysql8
    environment:
      MYSQL_ROOT_PASSWORD: root80
      MYSQL_DATABASE: testdb
    ports:
      - "3307:3306"
    volumes:
      - mysql8_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - mysql-test

volumes:
  mysql57_data:
  mysql8_data:

networks:
  mysql-test:
```

Start both containers:

```bash
docker compose up -d
docker compose ps
```

## Connecting to Each Version

Connect to MySQL 5.7 on port 3306 and MySQL 8.0 on port 3307:

```bash
# Connect to MySQL 5.7
mysql -h 127.0.0.1 -P 3306 -uroot -proot57

# Connect to MySQL 8.0
mysql -h 127.0.0.1 -P 3307 -uroot -proot80

# Verify versions
mysql -h 127.0.0.1 -P 3306 -uroot -proot57 -e "SELECT VERSION();"
mysql -h 127.0.0.1 -P 3307 -uroot -proot80 -e "SELECT VERSION();"
```

## Copying Data Between Versions for Testing

Dump a schema from MySQL 5.7 and import it into MySQL 8.0 to verify compatibility:

```bash
# Dump from MySQL 5.7
mysqldump -h 127.0.0.1 -P 3306 -uroot -proot57 testdb > dump57.sql

# Import into MySQL 8.0
mysql -h 127.0.0.1 -P 3307 -uroot -proot80 testdb < dump57.sql
```

If the dump contains `utf8` or deprecated syntax, MySQL 8.0 will log warnings during import. Review them:

```sql
SHOW WARNINGS;
```

## Validating Query Compatibility

Run the same query on both servers to compare results and catch compatibility issues:

```bash
# Test a query on both versions
for PORT in 3306 3307; do
  echo "=== Port $PORT ==="
  if [ "$PORT" = "3306" ]; then PASS="root57"; else PASS="root80"; fi
  mysql -h 127.0.0.1 -P $PORT -uroot -p"$PASS" \
    -e "SELECT @@sql_mode, @@version;" 2>/dev/null
done
```

Check the SQL mode differences - MySQL 8.0 enables `ONLY_FULL_GROUP_BY` by default, which rejects some GROUP BY queries that MySQL 5.7 allowed:

```sql
-- This works in MySQL 5.7 but may fail in MySQL 8.0
SELECT department, name, MAX(salary)
FROM employees
GROUP BY department;

-- Fix: use aggregate or include name in GROUP BY
SELECT department, MAX(salary)
FROM employees
GROUP BY department;
```

## Summary

Docker makes it straightforward to run MySQL 5.7 and MySQL 8.0 side by side by binding each container to a different host port. Use this setup to test schema migrations, verify query compatibility, and validate authentication changes before upgrading production. The `--default-authentication-plugin=mysql_native_password` flag on MySQL 8.0 helps maintain compatibility with older drivers during the transition period.
