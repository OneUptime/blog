# How to Use MySQL with GORM (Go ORM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GORM, Go, ORM, Database

Description: Learn how to connect a Go application to MySQL using GORM, define models with struct tags, run auto-migrations, and perform CRUD operations with the GORM API.

---

## Introduction

GORM is the most popular ORM library for Go. It provides a clean API for interacting with MySQL, supporting model definition via struct tags, auto-migration, associations, hooks, and a fluent query builder. This guide walks through connecting GORM to MySQL and performing common operations.

## Installation

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

## Connecting to MySQL

```go
package main

import (
    "log"
    "time"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func main() {
    dsn := "root:password@tcp(localhost:3306)/mydb?charset=utf8mb4&parseTime=True&loc=Local"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        log.Fatal("failed to connect to MySQL:", err)
    }

    // Configure connection pool
    sqlDB, _ := db.DB()
    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(5)
    sqlDB.SetConnMaxLifetime(5 * time.Minute)
}
```

## Defining Models

```go
import "time"

type Category struct {
    ID        uint      `gorm:"primaryKey;autoIncrement"`
    Name      string    `gorm:"size:100;uniqueIndex;not null"`
    Products  []Product `gorm:"foreignKey:CategoryID"`
}

type Product struct {
    ID         uint      `gorm:"primaryKey;autoIncrement"`
    CategoryID uint      `gorm:"not null;index:idx_category_price,priority:1"`
    Name       string    `gorm:"size:200;not null"`
    Price      float64   `gorm:"type:decimal(10,2);not null;index:idx_category_price,priority:2"`
    Stock      int       `gorm:"default:0"`
    Active     bool      `gorm:"default:true"`
    CreatedAt  time.Time
    Category   Category  `gorm:"foreignKey:CategoryID"`
}
```

## Auto-Migration

```go
err := db.AutoMigrate(&Category{}, &Product{})
if err != nil {
    log.Fatal("migration failed:", err)
}
```

## CRUD Operations

```go
// Create
category := Category{Name: "Electronics"}
db.Create(&category)

product := Product{
    Name:       "Laptop",
    Price:      999.99,
    Stock:      50,
    CategoryID: category.ID,
}
db.Create(&product)

// Read
var products []Product
db.Preload("Category").
    Where("price <= ? AND stock > 0", 1000).
    Order("price asc").
    Limit(20).
    Find(&products)

// Read single record
var p Product
db.First(&p, "name = ?", "Laptop")

// Update
db.Model(&Product{}).Where("stock = 0").Update("active", false)

// Delete
db.Where("price > ?", 50000).Delete(&Product{})
```

## Transactions

```go
err := db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&order).Error; err != nil {
        return err
    }
    if err := tx.Model(&Product{}).
        Where("id = ?", productID).
        UpdateColumn("stock", gorm.Expr("stock - 1")).Error; err != nil {
        return err
    }
    return nil
})
```

## Raw SQL

```go
var results []map[string]interface{}
db.Raw(`
    SELECT c.name AS category, SUM(p.stock) AS total_stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.id
    HAVING total_stock > 0
`).Scan(&results)
```

## Summary

GORM provides a productive interface for MySQL in Go through struct-based model definitions and a chainable query API. Use `AutoMigrate` for development schema management, `Preload` for eager-loading associations, and the `Transaction` helper for multi-step atomic operations. Set connection pool parameters on the underlying `*sql.DB` to match your production concurrency requirements.
