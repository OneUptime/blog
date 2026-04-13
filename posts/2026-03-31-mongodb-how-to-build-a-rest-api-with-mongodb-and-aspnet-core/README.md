# How to Build a REST API with MongoDB and ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ASP.NET Core, C#, REST API, .NET

Description: Learn how to build a REST API with ASP.NET Core and the official MongoDB C# driver including models, repository pattern, CRUD controllers, and validation.

---

## Project Setup

```bash
dotnet new webapi -n MongoApi --no-openapi
cd MongoApi
dotnet add package MongoDB.Driver
```

## Configuration

```json
// appsettings.json
{
  "MongoDb": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "myapp"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

## Settings Model

```csharp
// Settings/MongoDbSettings.cs
namespace MongoApi.Settings;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
}
```

## Document Model

```csharp
// Models/User.cs
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MongoApi.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}

public record CreateUserRequest(string Name, string Email);
public record UpdateUserRequest(string? Name, string? Email);
```

## Repository

```csharp
// Repositories/UserRepository.cs
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoApi.Models;
using MongoApi.Settings;

namespace MongoApi.Repositories;

public class UserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _users = db.GetCollection<User>("users");

        // Create unique index on email
        var indexKeys = Builders<User>.IndexKeys.Ascending(u => u.Email);
        var indexOptions = new CreateIndexOptions { Unique = true };
        _users.Indexes.CreateOne(new CreateIndexModel<User>(indexKeys, indexOptions));
    }

    public async Task<List<User>> GetAllAsync(int page, int limit)
    {
        return await _users.Find(_ => true)
            .SortByDescending(u => u.CreatedAt)
            .Skip((page - 1) * limit)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<long> CountAsync() =>
        await _users.CountDocumentsAsync(_ => true);

    public async Task<User?> GetByIdAsync(string id) =>
        await _users.Find(u => u.Id == id).FirstOrDefaultAsync();

    public async Task<User> CreateAsync(User user)
    {
        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<User?> UpdateAsync(string id, UpdateDefinition<User> update)
    {
        var options = new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After };
        return await _users.FindOneAndUpdateAsync(u => u.Id == id, update, options);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _users.DeleteOneAsync(u => u.Id == id);
        return result.DeletedCount > 0;
    }
}
```

## Controller

```csharp
// Controllers/UsersController.cs
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoApi.Models;
using MongoApi.Repositories;

namespace MongoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserRepository _repo;

    public UsersController(UserRepository repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var users = await _repo.GetAllAsync(page, limit);
        var total = await _repo.CountAsync();
        return Ok(new { data = users, pagination = new { page, limit, total } });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var user = await _repo.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        var user = new User { Name = req.Name, Email = req.Email.ToLower() };
        try
        {
            var created = await _repo.CreateAsync(user);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "Email already exists" });
        }
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest req)
    {
        var updates = new List<UpdateDefinition<User>>();
        if (req.Name is not null) updates.Add(Builders<User>.Update.Set(u => u.Name, req.Name));
        if (req.Email is not null) updates.Add(Builders<User>.Update.Set(u => u.Email, req.Email.ToLower()));
        if (!updates.Any()) return BadRequest(new { error = "No fields to update" });

        updates.Add(Builders<User>.Update.Set(u => u.UpdatedAt, DateTime.UtcNow));
        var update = Builders<User>.Update.Combine(updates);

        var updated = await _repo.UpdateAsync(id, update);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await _repo.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
```

## Register Services

```csharp
// Program.cs
using MongoApi.Repositories;
using MongoApi.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDb"));

builder.Services.AddSingleton<UserRepository>();
builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

## Summary

ASP.NET Core with the MongoDB C# driver provides a clean repository pattern for building REST APIs. Using `[BsonId]` with `[BsonRepresentation(BsonType.ObjectId)]` enables string-based IDs in C# while storing ObjectIds in MongoDB, and catching `MongoWriteException` with `ServerErrorCategory.DuplicateKey` properly handles unique constraint violations.
