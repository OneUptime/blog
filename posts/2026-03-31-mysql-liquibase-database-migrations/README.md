# How to Use Liquibase for MySQL Database Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Liquibase, Migration, Schema Management

Description: Learn how to set up Liquibase for MySQL, write changelogs in SQL and YAML, and roll back schema changes safely.

---

Liquibase is an open-source schema change management tool. Unlike Flyway, it supports multiple changelog formats (SQL, YAML, XML, JSON), a robust rollback mechanism, and conditional change sets.

## Installation

```bash
# macOS with Homebrew
brew install liquibase

# Or download the binary
curl -L https://github.com/liquibase/liquibase/releases/download/v4.27.0/liquibase-4.27.0.tar.gz | tar xvz
```

## Configuration

Create `liquibase.properties`:

```text
url=jdbc:mysql://localhost:3306/myapp
username=appuser
password=secret
driver=com.mysql.cj.jdbc.Driver
changeLogFile=db/changelog/db.changelog-master.yaml
```

Add the MySQL JDBC driver:

```bash
# Download mysql-connector-j and place in liquibase/lib/
```

## Master Changelog

```yaml
# db/changelog/db.changelog-master.yaml
databaseChangeLog:
  - include:
      file: db/changelog/001-create-users.yaml
  - include:
      file: db/changelog/002-create-orders.sql
```

## Writing a Changeset in YAML

```yaml
# db/changelog/001-create-users.yaml
databaseChangeLog:
  - changeSet:
      id: 001-create-users
      author: nawazdhandala
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: INT UNSIGNED
                  autoIncrement: true
                  constraints:
                    primaryKey: true
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
                    unique: true
              - column:
                  name: created_at
                  type: DATETIME
                  defaultValueComputed: CURRENT_TIMESTAMP
      rollback:
        - dropTable:
            tableName: users
```

## Writing a Changeset in SQL

```sql
-- db/changelog/002-create-orders.sql
-- liquibase formatted sql

-- changeset nawazdhandala:002-create-orders
CREATE TABLE orders (
    id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED   NOT NULL,
    total       DECIMAL(10,2)  NOT NULL,
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- rollback DROP TABLE orders;
```

## Running Liquibase

```bash
# Apply pending changesets
liquibase update

# Show status of pending changesets
liquibase status

# Roll back the last changeset
liquibase rollbackCount 1

# Roll back to a specific tag
liquibase rollback v1.0
```

## Tagging a Release

```bash
liquibase tag v1.0
```

## Generating a Diff

```bash
# Compare two databases and output a changelog
liquibase diff \
  --referenceUrl=jdbc:mysql://prod:3306/myapp \
  --referenceUsername=root \
  --referencePassword=secret
```

## Summary

Liquibase tracks schema changes in a `DATABASECHANGELOG` table and supports YAML, SQL, XML, and JSON changelog formats. Write explicit `rollback` blocks for every changeset to enable automated rollback. Use `liquibase tag` before each release to create a named rollback point. Run `liquibase update` in your CI/CD pipeline before starting the application.
