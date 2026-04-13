# How to Use MongoDB with Blazor Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Blazor, CSharp, DotNet, Component

Description: Learn how to connect Blazor Server applications to MongoDB using the .NET Driver and display real-time data in Blazor components.

---

## Overview

Blazor Server renders components on the server and communicates with the browser via a SignalR connection. This means Blazor Server components run on the server and have full access to backend services - including MongoDB. This guide shows how to wire up the MongoDB .NET Driver with Blazor Server and build interactive data components.

## Project Setup

```bash
dotnet new blazorserver -n BlazorMongoApp
cd BlazorMongoApp
dotnet add package MongoDB.Driver
```

## Configuration

```json
// appsettings.json
{
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "shopdb"
  }
}
```

## Settings Class

```csharp
// Models/MongoDbSettings.cs
public class MongoDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
}
```

## MongoDB Service Registration

```csharp
// Program.cs
using MongoDB.Driver;

builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDB"));

builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var cfg = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(cfg.ConnectionString);
});

builder.Services.AddScoped<ProductService>();
```

## Product Service

```csharp
// Services/ProductService.cs
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;

public class ProductService
{
    private readonly IMongoCollection<Product> _products;

    public ProductService(IMongoClient client,
        IOptions<MongoDbSettings> settings)
    {
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _products = db.GetCollection<Product>("products");
    }

    public async Task<List<Product>> GetAllAsync() =>
        await _products.Find(_ => true).ToListAsync();

    public async Task<List<Product>> GetByCategoryAsync(string category) =>
        await _products
            .Find(p => p.Category == category)
            .SortBy(p => p.Price)
            .ToListAsync();

    public async Task AddProductAsync(Product product) =>
        await _products.InsertOneAsync(product);

    public async Task DeleteAsync(string id) =>
        await _products.DeleteOneAsync(p => p.Id == id);
}
```

## Product Model

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Stock { get; set; }
}
```

## Blazor Component: Product List

```razor
@* Pages/Products.razor *@
@page "/products"
@inject ProductService ProductService

<h3>Products</h3>

@if (products is null)
{
    <p>Loading...</p>
}
else
{
    <table class="table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Stock</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            @foreach (var p in products)
            {
                <tr>
                    <td>@p.Name</td>
                    <td>@p.Price.ToString("C")</td>
                    <td>@p.Category</td>
                    <td>@p.Stock</td>
                    <td>
                        <button class="btn btn-sm btn-danger"
                                @onclick="() => DeleteProduct(p.Id!)">
                            Delete
                        </button>
                    </td>
                </tr>
            }
        </tbody>
    </table>
}

<h4>Add Product</h4>
<EditForm Model="@newProduct" OnValidSubmit="AddProduct">
    <InputText @bind-Value="newProduct.Name" placeholder="Name" />
    <InputNumber @bind-Value="newProduct.Price" />
    <InputText @bind-Value="newProduct.Category" placeholder="Category" />
    <button type="submit" class="btn btn-primary">Add</button>
</EditForm>

@code {
    private List<Product>? products;
    private Product newProduct = new();

    protected override async Task OnInitializedAsync()
    {
        products = await ProductService.GetAllAsync();
    }

    private async Task AddProduct()
    {
        await ProductService.AddProductAsync(newProduct);
        products = await ProductService.GetAllAsync();
        newProduct = new Product();
    }

    private async Task DeleteProduct(string id)
    {
        await ProductService.DeleteAsync(id);
        products = await ProductService.GetAllAsync();
    }
}
```

## Scoped vs. Singleton Lifetime

`MongoClient` is registered as a singleton because it maintains the connection pool. `ProductService` is registered as scoped so each Blazor circuit gets its own service instance, preventing state leakage between users.

## Summary

Blazor Server connects to MongoDB the same way as any ASP.NET Core application - register `MongoClient` as a singleton, create service classes that inject `IMongoClient`, and inject those services into Blazor components via `@inject`. Use `OnInitializedAsync` to load data when the component mounts and call `StateHasChanged` or re-fetch the collection after mutations to update the UI.
