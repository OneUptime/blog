# How to Connect to MySQL from Kotlin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kotlin, JDBC, Exposed, Connection

Description: Learn how to connect to a MySQL database from Kotlin using JDBC, HikariCP connection pooling, and the Exposed ORM framework.

---

## Overview

Kotlin runs on the JVM and uses the same JDBC infrastructure as Java. The recommended approach for Kotlin applications is to combine MySQL Connector/J with HikariCP for connection pooling, and optionally the `Exposed` DSL library for idiomatic Kotlin database access.

## Dependencies (Gradle Kotlin DSL)

```kotlin
dependencies {
    implementation("com.mysql:mysql-connector-j:9.0.0")
    implementation("com.zaxxer:HikariCP:5.1.0")
    // Optional - Exposed ORM
    implementation("org.jetbrains.exposed:exposed-core:0.53.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.53.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.53.0")
}
```

## Basic JDBC Connection

```kotlin
import java.sql.DriverManager

fun main() {
    val url = "jdbc:mysql://localhost:3306/shop" +
              "?useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC"

    DriverManager.getConnection(url, "app_user", "secret").use { conn ->
        println("Connected: ${conn.metaData.databaseProductVersion}")

        conn.prepareStatement("SELECT id, name FROM products WHERE price < ?").use { ps ->
            ps.setDouble(1, 50.0)
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    println("${rs.getInt("id")}  ${rs.getString("name")}")
                }
            }
        }
    }
}
```

## HikariCP Connection Pool

```kotlin
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource

val hikariConfig = HikariConfig().apply {
    jdbcUrl         = "jdbc:mysql://${System.getenv("DB_HOST")}:3306/${System.getenv("DB_NAME")}"
    username        = System.getenv("DB_USER")
    password        = System.getenv("DB_PASSWORD")
    maximumPoolSize = 10
    minimumIdle     = 2
    connectionTimeout = 30_000L
    addDataSourceProperty("characterEncoding", "UTF-8")
    addDataSourceProperty("useUnicode", "true")
}

val dataSource = HikariDataSource(hikariConfig)
```

## Using Exposed ORM

Exposed provides a type-safe SQL DSL for Kotlin:

```kotlin
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

object Products : Table("products") {
    val id    = integer("id").autoIncrement()
    val name  = varchar("name", 255)
    val price = double("price")
    override val primaryKey = PrimaryKey(id)
}

Database.connect(dataSource)

transaction {
    val cheapProducts = Products.selectAll().where { Products.price less 50.0 }
    cheapProducts.forEach {
        println("${it[Products.id]}  ${it[Products.name]}  ${it[Products.price]}")
    }
}
```

## Inserting Data with Exposed

```kotlin
transaction {
    Products.insert {
        it[name]  = "Widget Pro"
        it[price] = 29.99
    }
}
```

## Coroutines with Exposed

For Ktor or other coroutine-based frameworks, use `newSuspendedTransaction`:

```kotlin
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

suspend fun getProducts(): List<ResultRow> = newSuspendedTransaction {
    Products.selectAll().toList()
}
```

## Summary

Kotlin MySQL connectivity builds on the JVM JDBC ecosystem. Use HikariCP for connection pooling and the Exposed DSL for idiomatic, type-safe queries. For Spring Boot applications, the `spring-boot-starter-data-jpa` with `mysql-connector-j` provides full integration with Hibernate and Spring Data repositories.
