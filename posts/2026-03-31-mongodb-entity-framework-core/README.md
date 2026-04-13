# How to Use MongoDB with Entity Framework Core (EF Core Provider)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Entity Framework, CSharp, DotNet, ORM

Description: Learn how to use the MongoDB EF Core provider to query and modify MongoDB documents using familiar Entity Framework Core DbContext patterns.

---

## Overview

The MongoDB EF Core Provider (released by MongoDB) enables developers to use Entity Framework Core's `DbContext`, `DbSet`, and LINQ API against a MongoDB database. This is ideal for teams migrating from relational databases or those who prefer EF Core's unit-of-work pattern.

## Installation

```bash
dotnet add package MongoDB.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore
```

## Defining a Document Entity

EF Core uses `[Key]` to mark primary keys. For MongoDB, map it to `ObjectId`:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;

public class Product
{
    [Key]
    public ObjectId Id { get; set; }

    public string Name { get; set; } = null!;

    public double Price { get; set; }

    public string Category { get; set; } = null!;

    public int Stock { get; set; }
}
```

## Creating the DbContext

```csharp
using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;

public class ShopDbContext : DbContext
{
    public DbSet<Product> Products { get; set; } = null!;

    public ShopDbContext(DbContextOptions<ShopDbContext> options)
        : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Product>().ToCollection("products");
    }
}
```

## Registering in ASP.NET Core

```csharp
// Program.cs
using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;

builder.Services.AddDbContext<ShopDbContext>(options =>
    options.UseMongoDB(
        "mongodb://localhost:27017",
        "shopdb"
    )
);
```

## CRUD with EF Core Patterns

```csharp
// Inject DbContext
public class ProductService
{
    private readonly ShopDbContext _context;

    public ProductService(ShopDbContext context) => _context = context;

    // Create
    public async Task<Product> AddProductAsync(Product product)
    {
        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return product;
    }

    // Read
    public async Task<List<Product>> GetByCategory(string category) =>
        await _context.Products
            .Where(p => p.Category == category)
            .ToListAsync();

    public async Task<Product?> FindById(ObjectId id) =>
        await _context.Products.FindAsync(id);

    // Update
    public async Task UpdatePriceAsync(ObjectId id, double newPrice)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return;

        product.Price = newPrice;
        await _context.SaveChangesAsync();
    }

    // Delete
    public async Task DeleteAsync(ObjectId id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return;

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
    }
}
```

## LINQ Queries

```csharp
// Filter, sort, and page
var electronics = await _context.Products
    .Where(p => p.Category == "electronics" && p.Price <= 200)
    .OrderBy(p => p.Price)
    .Skip(0)
    .Take(10)
    .ToListAsync();

// Count
int count = await _context.Products
    .CountAsync(p => p.Category == "electronics");

// Any
bool hasStock = await _context.Products
    .AnyAsync(p => p.Stock > 0);
```

## Embedded Documents

```csharp
public class Address
{
    public string Street { get; set; } = null!;
    public string City { get; set; } = null!;
}

public class Customer
{
    [Key]
    public ObjectId Id { get; set; }
    public string Name { get; set; } = null!;
    public Address ShippingAddress { get; set; } = null!;
}

// In DbContext OnModelCreating:
modelBuilder.Entity<Customer>().OwnsOne(c => c.ShippingAddress);
```

## Current Limitations

The MongoDB EF Core provider does not support all EF Core features. Key unsupported items include joins across collections, raw SQL, and migrations. Transactions are supported as of version 8.1.0 and are enabled by default with auto-transactional `SaveChanges` and `SaveChangesAsync`. For complex aggregations or unsupported query patterns, use the native MongoDB .NET Driver directly alongside EF Core.

## Summary

The MongoDB EF Core Provider brings the familiar `DbContext` and LINQ patterns from the relational world to MongoDB. Define entities with `[Key]`, create a `DbContext` subclass with `DbSet<T>` properties, call `ToCollection("name")` to map to MongoDB collections, and register with `UseMongoDB()`. This is a strong choice when transitioning relational EF Core code to MongoDB or when your team is more productive with EF Core patterns than the native MongoDB Driver API.
