# How to Set Up .NET SDK on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, .NET, C#, Development, Microsoft, Tutorial

Description: Complete guide to installing .NET SDK and developing .NET applications on Ubuntu.

---

.NET is Microsoft's free, open-source, cross-platform framework for building modern applications. Whether you're developing web APIs, microservices, desktop applications, or cloud-native solutions, .NET provides a robust and performant foundation. This comprehensive guide walks you through setting up the .NET SDK on Ubuntu and covers everything from basic installation to advanced deployment strategies.

## Table of Contents

1. [Installing .NET SDK](#installing-net-sdk)
2. [Managing Multiple SDK Versions](#managing-multiple-sdk-versions)
3. [Creating Projects](#creating-projects)
4. [Building and Running Applications](#building-and-running-applications)
5. [NuGet Package Management](#nuget-package-management)
6. [Entity Framework Setup](#entity-framework-setup)
7. [Testing with xUnit](#testing-with-xunit)
8. [Publishing and Deployment](#publishing-and-deployment)
9. [IDE Setup](#ide-setup)
10. [Docker Deployment](#docker-deployment)
11. [ASP.NET Core Configuration](#aspnet-core-configuration)
12. [Monitoring with OneUptime](#monitoring-with-oneuptime)

---

## Installing .NET SDK

### Method 1: Using Microsoft's Package Repository (Recommended)

The recommended approach is to use Microsoft's official package repository, which provides the latest stable releases and automatic updates.

```bash
# Download and install the Microsoft package signing key
# This ensures packages are verified and secure
wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O packages-microsoft-prod.deb

# Install the package that adds Microsoft's repository
sudo dpkg -i packages-microsoft-prod.deb

# Clean up the downloaded file
rm packages-microsoft-prod.deb

# Update the package index to include packages from the new repository
sudo apt-get update

# Install the .NET 8 SDK (Long Term Support version)
# This includes the runtime, libraries, and command-line tools
sudo apt-get install -y dotnet-sdk-8.0
```

### Method 2: Using the dotnet-install Script

For more control over the installation or for environments where you cannot modify system packages, use the official installation script.

```bash
# Download the official installation script from Microsoft
# This script supports various installation options and scenarios
curl -sSL https://dot.net/v1/dotnet-install.sh -o dotnet-install.sh

# Make the script executable
chmod +x dotnet-install.sh

# Install the latest LTS version to a custom location
# The --install-dir flag specifies where .NET will be installed
./dotnet-install.sh --channel LTS --install-dir $HOME/.dotnet

# Add .NET to your PATH permanently by adding to .bashrc
# This ensures dotnet commands are available in all terminal sessions
echo 'export DOTNET_ROOT=$HOME/.dotnet' >> ~/.bashrc
echo 'export PATH=$PATH:$HOME/.dotnet:$HOME/.dotnet/tools' >> ~/.bashrc

# Apply the changes to the current session
source ~/.bashrc
```

### Method 3: Using Snap Package

Snap packages provide automatic updates and sandboxed installation.

```bash
# Install the .NET SDK via Snap
# The --classic flag is required because .NET needs access to system resources
sudo snap install dotnet-sdk --classic

# Create a symbolic link for convenience (optional)
# This makes 'dotnet' available system-wide
sudo snap alias dotnet-sdk.dotnet dotnet
```

### Verifying the Installation

After installation, verify everything is working correctly:

```bash
# Display the installed .NET SDK version
# This confirms the SDK is properly installed and accessible
dotnet --version

# Show detailed information about all installed SDKs and runtimes
# Useful for troubleshooting and verifying your environment
dotnet --info

# List all installed SDKs with their locations
dotnet --list-sdks

# List all installed runtimes
dotnet --list-runtimes
```

---

## Managing Multiple SDK Versions

In professional development environments, you often need multiple .NET SDK versions for different projects. Here's how to manage them effectively.

### Installing Multiple Versions

```bash
# Install multiple SDK versions side by side
# Each version can coexist without conflicts
sudo apt-get install -y dotnet-sdk-6.0   # .NET 6 LTS
sudo apt-get install -y dotnet-sdk-7.0   # .NET 7 STS
sudo apt-get install -y dotnet-sdk-8.0   # .NET 8 LTS (Current)

# Or using the install script for specific versions
./dotnet-install.sh --version 6.0.400
./dotnet-install.sh --version 7.0.400
./dotnet-install.sh --version 8.0.300
```

### Using global.json for Version Pinning

Create a `global.json` file to lock a project to a specific SDK version. This ensures consistent builds across team members and CI/CD pipelines.

```bash
# Create a global.json file in your project root
# This file tells the dotnet CLI which SDK version to use
dotnet new globaljson --sdk-version 8.0.300
```

The generated `global.json` file:

```json
{
  "sdk": {
    // Specify the exact SDK version for this project
    // All team members must have this version installed
    "version": "8.0.300",

    // Roll-forward policy determines behavior when exact version is unavailable
    // "latestMinor" allows using newer minor versions if exact match isn't found
    "rollForward": "latestMinor",

    // Allow using prerelease versions (useful during beta testing)
    "allowPrerelease": false
  }
}
```

### Roll-Forward Policies Explained

```json
{
  "sdk": {
    "version": "8.0.300",
    // Available roll-forward policies:
    // "disable"      - Exact version required, fail if not found
    // "patch"        - Allow patch version updates (8.0.300 -> 8.0.301)
    // "feature"      - Allow feature band updates (8.0.300 -> 8.0.400)
    // "minor"        - Allow minor version updates (8.0.x -> 8.1.x)
    // "major"        - Allow major version updates (8.x -> 9.x)
    // "latestPatch"  - Use latest patch of specified feature band
    // "latestFeature"- Use latest feature of specified minor version
    // "latestMinor"  - Use latest minor of specified major version
    // "latestMajor"  - Use latest installed SDK
    "rollForward": "latestFeature"
  }
}
```

---

## Creating Projects

The .NET CLI provides templates for various project types. Let's explore the most common ones with detailed explanations.

### Console Application

```bash
# Create a new directory for your console application
mkdir MyConsoleApp && cd MyConsoleApp

# Generate a new console application from the template
# The -n flag specifies the project name
# The -o flag specifies the output directory (current directory by default)
dotnet new console -n MyConsoleApp
```

Edit `Program.cs` with a well-structured example:

```csharp
// Program.cs - Entry point for the console application
// Using top-level statements (C# 9+) for concise code

// Import namespaces for required functionality
using System;
using System.Threading.Tasks;

// Namespace declaration using file-scoped namespace (C# 10+)
// This reduces nesting and improves readability
namespace MyConsoleApp;

/// <summary>
/// Main program class demonstrating console application structure
/// </summary>
public class Program
{
    /// <summary>
    /// Application entry point with async support
    /// </summary>
    /// <param name="args">Command-line arguments passed to the application</param>
    /// <returns>Exit code: 0 for success, non-zero for failure</returns>
    public static async Task<int> Main(string[] args)
    {
        try
        {
            // Display welcome message with application information
            Console.WriteLine("=== .NET Console Application ===");
            Console.WriteLine($"Running on: {Environment.OSVersion}");
            Console.WriteLine($".NET Version: {Environment.Version}");
            Console.WriteLine($"Current Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");

            // Process command-line arguments if provided
            if (args.Length > 0)
            {
                Console.WriteLine("\nCommand-line arguments received:");
                for (int i = 0; i < args.Length; i++)
                {
                    // Display each argument with its index
                    Console.WriteLine($"  [{i}]: {args[i]}");
                }
            }

            // Demonstrate async operation
            await PerformAsyncOperationAsync();

            // Return success exit code
            return 0;
        }
        catch (Exception ex)
        {
            // Log error and return failure exit code
            Console.Error.WriteLine($"Error: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Demonstrates asynchronous programming patterns
    /// </summary>
    private static async Task PerformAsyncOperationAsync()
    {
        Console.WriteLine("\nPerforming async operation...");

        // Simulate async work (e.g., API call, file I/O)
        await Task.Delay(1000);

        Console.WriteLine("Async operation completed!");
    }
}
```

### Web API Project

```bash
# Create a new Web API project with OpenAPI support
# The --use-controllers flag uses the traditional MVC pattern
# Without it, minimal APIs are used (simpler but less structured)
dotnet new webapi -n MyWebApi --use-controllers

cd MyWebApi
```

Create a comprehensive API controller in `Controllers/ProductsController.cs`:

```csharp
// Controllers/ProductsController.cs
// RESTful API controller for product management

using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MyWebApi.Controllers;

/// <summary>
/// Product entity representing items in our catalog
/// </summary>
public class Product
{
    /// <summary>
    /// Unique identifier for the product
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Product name (required, 1-100 characters)
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Product description (optional, max 500 characters)
    /// </summary>
    [StringLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Product price (must be positive)
    /// </summary>
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be positive")]
    public decimal Price { get; set; }

    /// <summary>
    /// Available stock quantity
    /// </summary>
    [Range(0, int.MaxValue)]
    public int StockQuantity { get; set; }

    /// <summary>
    /// Indicates if the product is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Timestamp when the product was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for creating new products (excludes auto-generated fields)
/// </summary>
public class CreateProductDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }

    [Range(0, int.MaxValue)]
    public int StockQuantity { get; set; }
}

/// <summary>
/// RESTful API controller for product CRUD operations
/// Demonstrates proper API design patterns and error handling
/// </summary>
[ApiController]
[Route("api/[controller]")]  // Route will be: /api/products
[Produces("application/json")]
public class ProductsController : ControllerBase
{
    // In-memory storage for demonstration
    // In production, use a database via Entity Framework or similar
    private static readonly List<Product> _products = new()
    {
        new Product { Id = 1, Name = "Laptop", Description = "High-performance laptop", Price = 999.99m, StockQuantity = 50 },
        new Product { Id = 2, Name = "Mouse", Description = "Wireless ergonomic mouse", Price = 29.99m, StockQuantity = 200 },
        new Product { Id = 3, Name = "Keyboard", Description = "Mechanical gaming keyboard", Price = 149.99m, StockQuantity = 75 }
    };

    private readonly ILogger<ProductsController> _logger;

    /// <summary>
    /// Constructor with dependency injection for logging
    /// </summary>
    /// <param name="logger">Logger instance injected by DI container</param>
    public ProductsController(ILogger<ProductsController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all products with optional filtering
    /// </summary>
    /// <param name="activeOnly">Filter to show only active products</param>
    /// <param name="minPrice">Minimum price filter</param>
    /// <param name="maxPrice">Maximum price filter</param>
    /// <returns>List of products matching the criteria</returns>
    /// <response code="200">Returns the list of products</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Product>> GetAll(
        [FromQuery] bool activeOnly = false,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null)
    {
        _logger.LogInformation("Retrieving products with filters: activeOnly={ActiveOnly}, minPrice={MinPrice}, maxPrice={MaxPrice}",
            activeOnly, minPrice, maxPrice);

        // Start with all products and apply filters
        IEnumerable<Product> result = _products;

        if (activeOnly)
        {
            result = result.Where(p => p.IsActive);
        }

        if (minPrice.HasValue)
        {
            result = result.Where(p => p.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            result = result.Where(p => p.Price <= maxPrice.Value);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves a specific product by ID
    /// </summary>
    /// <param name="id">The product ID</param>
    /// <returns>The requested product</returns>
    /// <response code="200">Returns the product</response>
    /// <response code="404">Product not found</response>
    [HttpGet("{id:int}")]  // Route constraint ensures id is an integer
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Product> GetById(int id)
    {
        _logger.LogInformation("Retrieving product with ID: {ProductId}", id);

        var product = _products.FirstOrDefault(p => p.Id == id);

        if (product == null)
        {
            _logger.LogWarning("Product with ID {ProductId} not found", id);
            return NotFound(new { message = $"Product with ID {id} not found" });
        }

        return Ok(product);
    }

    /// <summary>
    /// Creates a new product
    /// </summary>
    /// <param name="dto">Product creation data</param>
    /// <returns>The created product</returns>
    /// <response code="201">Product created successfully</response>
    /// <response code="400">Invalid input data</response>
    [HttpPost]
    [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Product> Create([FromBody] CreateProductDto dto)
    {
        // Model validation is automatic with [ApiController] attribute
        // Invalid requests return 400 Bad Request automatically

        _logger.LogInformation("Creating new product: {ProductName}", dto.Name);

        // Generate new ID (in production, database handles this)
        var newId = _products.Count > 0 ? _products.Max(p => p.Id) + 1 : 1;

        var product = new Product
        {
            Id = newId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _products.Add(product);

        _logger.LogInformation("Product created with ID: {ProductId}", product.Id);

        // Return 201 Created with location header pointing to the new resource
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    /// <summary>
    /// Updates an existing product
    /// </summary>
    /// <param name="id">Product ID to update</param>
    /// <param name="dto">Updated product data</param>
    /// <returns>No content on success</returns>
    /// <response code="204">Product updated successfully</response>
    /// <response code="404">Product not found</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Update(int id, [FromBody] CreateProductDto dto)
    {
        _logger.LogInformation("Updating product with ID: {ProductId}", id);

        var product = _products.FirstOrDefault(p => p.Id == id);

        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} not found" });
        }

        // Update properties
        product.Name = dto.Name;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.StockQuantity = dto.StockQuantity;

        _logger.LogInformation("Product {ProductId} updated successfully", id);

        // Return 204 No Content for successful update
        return NoContent();
    }

    /// <summary>
    /// Deletes a product (soft delete)
    /// </summary>
    /// <param name="id">Product ID to delete</param>
    /// <returns>No content on success</returns>
    /// <response code="204">Product deleted successfully</response>
    /// <response code="404">Product not found</response>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete(int id)
    {
        _logger.LogInformation("Deleting product with ID: {ProductId}", id);

        var product = _products.FirstOrDefault(p => p.Id == id);

        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} not found" });
        }

        // Soft delete - mark as inactive instead of removing
        product.IsActive = false;

        _logger.LogInformation("Product {ProductId} marked as inactive", id);

        return NoContent();
    }
}
```

### ASP.NET Core MVC Web Application

```bash
# Create a full MVC web application with views
# Includes Razor views, authentication scaffolding options, and Bootstrap
dotnet new mvc -n MyWebApp --auth Individual

cd MyWebApp
```

### Minimal API (Modern Approach)

Create a streamlined API using minimal APIs (introduced in .NET 6):

```bash
dotnet new web -n MyMinimalApi
cd MyMinimalApi
```

Edit `Program.cs`:

```csharp
// Program.cs - Minimal API example
// Demonstrates the modern, concise approach to building APIs

// Create the web application builder with default services
var builder = WebApplication.CreateBuilder(args);

// Configure services in the dependency injection container
// Add API endpoint discovery for OpenAPI/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "My Minimal API",
        Version = "v1",
        Description = "A minimal API demonstrating modern .NET patterns"
    });
});

// Add CORS policy for cross-origin requests
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Build the application
var app = builder.Build();

// Configure the HTTP request pipeline (middleware)
if (app.Environment.IsDevelopment())
{
    // Enable Swagger UI in development
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable HTTPS redirection for security
app.UseHttpsRedirection();

// Apply CORS policy
app.UseCors("AllowAll");

// In-memory data store for demonstration
var todos = new List<Todo>
{
    new(1, "Learn .NET", true),
    new(2, "Build an API", false),
    new(3, "Deploy to production", false)
};

// Define API endpoints using method chaining
// GET /todos - Retrieve all todos
app.MapGet("/todos", () =>
{
    // Return all todos with 200 OK
    return Results.Ok(todos);
})
.WithName("GetAllTodos")
.WithTags("Todos")
.Produces<List<Todo>>(StatusCodes.Status200OK);

// GET /todos/{id} - Retrieve a specific todo
app.MapGet("/todos/{id:int}", (int id) =>
{
    var todo = todos.FirstOrDefault(t => t.Id == id);

    // Return 404 if not found, otherwise return the todo
    return todo is null
        ? Results.NotFound(new { message = $"Todo {id} not found" })
        : Results.Ok(todo);
})
.WithName("GetTodoById")
.WithTags("Todos")
.Produces<Todo>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

// POST /todos - Create a new todo
app.MapPost("/todos", (CreateTodoRequest request) =>
{
    // Generate new ID
    var newId = todos.Count > 0 ? todos.Max(t => t.Id) + 1 : 1;
    var todo = new Todo(newId, request.Title, false);
    todos.Add(todo);

    // Return 201 Created with the new todo
    return Results.Created($"/todos/{todo.Id}", todo);
})
.WithName("CreateTodo")
.WithTags("Todos")
.Produces<Todo>(StatusCodes.Status201Created);

// PUT /todos/{id} - Update a todo
app.MapPut("/todos/{id:int}", (int id, UpdateTodoRequest request) =>
{
    var index = todos.FindIndex(t => t.Id == id);

    if (index == -1)
    {
        return Results.NotFound(new { message = $"Todo {id} not found" });
    }

    // Create updated todo (records are immutable)
    todos[index] = todos[index] with
    {
        Title = request.Title,
        IsCompleted = request.IsCompleted
    };

    return Results.NoContent();
})
.WithName("UpdateTodo")
.WithTags("Todos")
.Produces(StatusCodes.Status204NoContent)
.Produces(StatusCodes.Status404NotFound);

// DELETE /todos/{id} - Delete a todo
app.MapDelete("/todos/{id:int}", (int id) =>
{
    var todo = todos.FirstOrDefault(t => t.Id == id);

    if (todo is null)
    {
        return Results.NotFound(new { message = $"Todo {id} not found" });
    }

    todos.Remove(todo);
    return Results.NoContent();
})
.WithName("DeleteTodo")
.WithTags("Todos")
.Produces(StatusCodes.Status204NoContent)
.Produces(StatusCodes.Status404NotFound);

// Start the application
app.Run();

// Record types for clean, immutable data models
// Records automatically provide value equality, ToString(), and deconstruction

/// <summary>
/// Represents a todo item
/// </summary>
/// <param name="Id">Unique identifier</param>
/// <param name="Title">Todo title/description</param>
/// <param name="IsCompleted">Completion status</param>
record Todo(int Id, string Title, bool IsCompleted);

/// <summary>
/// Request model for creating a new todo
/// </summary>
/// <param name="Title">Todo title (required)</param>
record CreateTodoRequest(string Title);

/// <summary>
/// Request model for updating an existing todo
/// </summary>
/// <param name="Title">Updated title</param>
/// <param name="IsCompleted">Updated completion status</param>
record UpdateTodoRequest(string Title, bool IsCompleted);
```

### Class Library Project

```bash
# Create a reusable class library
# Class libraries compile to DLLs that can be referenced by other projects
dotnet new classlib -n MyLibrary -f net8.0
```

### Worker Service (Background Service)

```bash
# Create a long-running background service
# Perfect for scheduled tasks, message queue processors, etc.
dotnet new worker -n MyWorkerService
```

---

## Building and Running Applications

### Development Workflow

```bash
# Restore NuGet packages (usually automatic, but useful for CI/CD)
# Downloads all dependencies defined in the project file
dotnet restore

# Build the project in Debug configuration
# Compiles code and generates output in bin/Debug/
dotnet build

# Build in Release configuration with optimizations
# Use this for production deployments
dotnet build --configuration Release

# Run the application with hot reload enabled
# Changes to code are automatically applied without restart
dotnet watch run

# Run without hot reload
dotnet run

# Run with specific configuration and additional arguments
dotnet run --configuration Release -- --arg1 value1 --arg2 value2
```

### Build Configuration Options

```bash
# Clean previous build artifacts
# Useful when switching configurations or troubleshooting
dotnet clean

# Build for specific runtime (self-contained deployment)
# Includes the .NET runtime so target machine doesn't need .NET installed
dotnet build -r linux-x64 --self-contained

# Build targeting specific framework (for multi-target projects)
dotnet build -f net8.0

# Verbose build output for debugging build issues
dotnet build --verbosity detailed

# Build and generate detailed binary log for MSBuild analysis
dotnet build -bl:build.binlog
```

### Environment Variables for Runtime

```bash
# Set ASP.NET Core environment (Development, Staging, Production)
export ASPNETCORE_ENVIRONMENT=Development

# Set URLs the application listens on
export ASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"

# Enable detailed error pages in development
export ASPNETCORE_DETAILEDERRORS=true

# Run with inline environment variables
ASPNETCORE_ENVIRONMENT=Production dotnet run
```

---

## NuGet Package Management

NuGet is the package manager for .NET, providing access to thousands of reusable libraries.

### Managing Packages via CLI

```bash
# Add a package to your project
# This modifies the .csproj file and restores automatically
dotnet add package Newtonsoft.Json

# Add a specific version of a package
dotnet add package Serilog --version 3.1.1

# Add a prerelease package for testing new features
dotnet add package Microsoft.EntityFrameworkCore --prerelease

# Update a package to the latest version
dotnet add package Newtonsoft.Json

# Remove a package
dotnet remove package Newtonsoft.Json

# List all packages in the project
dotnet list package

# Show outdated packages
dotnet list package --outdated

# Show packages with known vulnerabilities
dotnet list package --vulnerable
```

### Essential Packages for Web Development

```bash
# Entity Framework Core for database access
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.SqlServer  # For SQL Server
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL    # For PostgreSQL
dotnet add package Pomelo.EntityFrameworkCore.MySql         # For MySQL/MariaDB

# Authentication and Authorization
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore

# API Documentation
dotnet add package Swashbuckle.AspNetCore

# Logging
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.File

# Validation
dotnet add package FluentValidation.AspNetCore

# HTTP Client
dotnet add package Microsoft.Extensions.Http.Polly  # For retry policies

# Caching
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis

# Health Checks
dotnet add package AspNetCore.HealthChecks.UI
dotnet add package AspNetCore.HealthChecks.SqlServer
```

### NuGet Configuration (nuget.config)

Create a `nuget.config` file in your solution root for custom package sources:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <!-- Define package sources -->
  <packageSources>
    <!-- Clear any inherited sources -->
    <clear />

    <!-- Official NuGet Gallery -->
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />

    <!-- Private/Corporate feed (if applicable) -->
    <add key="MyCompanyFeed" value="https://pkgs.mycompany.com/nuget/v3/index.json" />

    <!-- Local packages folder for development -->
    <add key="Local" value="./packages" />
  </packageSources>

  <!-- Specify source priority -->
  <packageSourceMapping>
    <packageSource key="nuget.org">
      <package pattern="*" />
    </packageSource>
    <packageSource key="MyCompanyFeed">
      <!-- Only use company feed for company packages -->
      <package pattern="MyCompany.*" />
    </packageSource>
  </packageSourceMapping>

  <!-- Credentials for authenticated feeds -->
  <packageSourceCredentials>
    <MyCompanyFeed>
      <add key="Username" value="user" />
      <!-- Use environment variable for password -->
      <add key="ClearTextPassword" value="%NUGET_PASSWORD%" />
    </MyCompanyFeed>
  </packageSourceCredentials>
</configuration>
```

---

## Entity Framework Setup

Entity Framework Core is the recommended ORM for .NET applications, providing powerful database abstraction.

### Installation

```bash
# Install EF Core tools globally for migrations and scaffolding
dotnet tool install --global dotnet-ef

# Verify installation
dotnet ef --version

# Add EF Core packages to your project
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Design

# Add database provider (choose one based on your database)
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL  # PostgreSQL
# OR
dotnet add package Microsoft.EntityFrameworkCore.SqlServer  # SQL Server
# OR
dotnet add package Microsoft.EntityFrameworkCore.Sqlite  # SQLite (development)
```

### Creating Models and DbContext

Create `Models/ApplicationDbContext.cs`:

```csharp
// Models/ApplicationDbContext.cs
// Entity Framework Core database context configuration

using Microsoft.EntityFrameworkCore;

namespace MyWebApi.Models;

/// <summary>
/// Entity representing a blog post
/// </summary>
public class Blog
{
    /// <summary>
    /// Primary key - auto-generated by the database
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Blog URL (required, must be unique)
    /// </summary>
    public required string Url { get; set; }

    /// <summary>
    /// Blog title
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Timestamp when the blog was created
    /// Value is set automatically on insert
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Timestamp when the blog was last modified
    /// Value is updated automatically on each save
    /// </summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Navigation property - collection of related posts
    /// Enables lazy loading and eager loading of related data
    /// </summary>
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}

/// <summary>
/// Entity representing a blog post
/// </summary>
public class Post
{
    public int Id { get; set; }

    /// <summary>
    /// Post title (required)
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// Post content/body
    /// </summary>
    public required string Content { get; set; }

    /// <summary>
    /// Publication status
    /// </summary>
    public bool IsPublished { get; set; }

    /// <summary>
    /// Date when the post was published (null if draft)
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// Foreign key to the parent blog
    /// </summary>
    public int BlogId { get; set; }

    /// <summary>
    /// Navigation property to the parent blog
    /// </summary>
    public Blog Blog { get; set; } = null!;

    /// <summary>
    /// Many-to-many relationship with tags
    /// </summary>
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}

/// <summary>
/// Entity representing a tag for categorizing posts
/// </summary>
public class Tag
{
    public int Id { get; set; }

    /// <summary>
    /// Tag name (unique)
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// URL-friendly version of the tag name
    /// </summary>
    public required string Slug { get; set; }

    /// <summary>
    /// Many-to-many relationship with posts
    /// </summary>
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}

/// <summary>
/// Application database context
/// Represents a session with the database and provides DbSet properties
/// for querying and saving entities
/// </summary>
public class ApplicationDbContext : DbContext
{
    /// <summary>
    /// Constructor accepting DbContextOptions for configuration
    /// Options are typically configured in Program.cs via DI
    /// </summary>
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // DbSet properties represent database tables
    // Each DbSet<T> maps to a table with columns based on T's properties

    /// <summary>
    /// Blogs table
    /// </summary>
    public DbSet<Blog> Blogs => Set<Blog>();

    /// <summary>
    /// Posts table
    /// </summary>
    public DbSet<Post> Posts => Set<Post>();

    /// <summary>
    /// Tags table
    /// </summary>
    public DbSet<Tag> Tags => Set<Tag>();

    /// <summary>
    /// Configure the model using Fluent API
    /// Called when the model is being created
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Blog entity
        modelBuilder.Entity<Blog>(entity =>
        {
            // Set table name explicitly
            entity.ToTable("blogs");

            // Configure primary key
            entity.HasKey(b => b.Id);

            // Configure URL as required with unique constraint
            entity.Property(b => b.Url)
                  .IsRequired()
                  .HasMaxLength(500);

            entity.HasIndex(b => b.Url)
                  .IsUnique();

            // Configure title
            entity.Property(b => b.Title)
                  .HasMaxLength(200);

            // Configure default value for CreatedAt
            entity.Property(b => b.CreatedAt)
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Configure Post entity
        modelBuilder.Entity<Post>(entity =>
        {
            entity.ToTable("posts");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Title)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(p => p.Content)
                  .IsRequired();

            // Configure one-to-many relationship with Blog
            entity.HasOne(p => p.Blog)
                  .WithMany(b => b.Posts)
                  .HasForeignKey(p => p.BlogId)
                  .OnDelete(DeleteBehavior.Cascade);  // Delete posts when blog is deleted

            // Create index for efficient querying by publication status
            entity.HasIndex(p => p.IsPublished);
        });

        // Configure Tag entity
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");

            entity.HasKey(t => t.Id);

            entity.Property(t => t.Name)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(t => t.Slug)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.HasIndex(t => t.Slug)
                  .IsUnique();

            // Configure many-to-many relationship with Posts
            // EF Core automatically creates a join table
            entity.HasMany(t => t.Posts)
                  .WithMany(p => p.Tags)
                  .UsingEntity<Dictionary<string, object>>(
                      "post_tags",  // Join table name
                      j => j.HasOne<Post>().WithMany().HasForeignKey("PostId"),
                      j => j.HasOne<Tag>().WithMany().HasForeignKey("TagId")
                  );
        });

        // Seed initial data
        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Technology", Slug = "technology" },
            new Tag { Id = 2, Name = "Programming", Slug = "programming" },
            new Tag { Id = 3, Name = ".NET", Slug = "dotnet" }
        );
    }

    /// <summary>
    /// Override SaveChanges to automatically set timestamps
    /// </summary>
    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    /// <summary>
    /// Override async SaveChanges for timestamp updates
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Automatically update CreatedAt and UpdatedAt timestamps
    /// </summary>
    private void UpdateTimestamps()
    {
        var entries = ChangeTracker
            .Entries<Blog>()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
            }

            entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
    }
}
```

### Configuring DbContext in Program.cs

```csharp
// Program.cs - Configure Entity Framework Core

using Microsoft.EntityFrameworkCore;
using MyWebApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container

// Configure Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    // Get connection string from configuration (appsettings.json or environment)
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    // Configure PostgreSQL with Npgsql
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        // Enable retry on failure for transient errors
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null
        );

        // Set command timeout
        npgsqlOptions.CommandTimeout(30);

        // Enable migrations assembly if using separate project
        // npgsqlOptions.MigrationsAssembly("MyWebApi.Migrations");
    });

    // Enable sensitive data logging in development only
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Add other services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Apply pending migrations automatically (use with caution in production)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    if (app.Environment.IsDevelopment())
    {
        // Automatically apply migrations in development
        db.Database.Migrate();
    }
}

// Configure middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### Database Migrations

```bash
# Create initial migration
# This generates C# code to create database schema
dotnet ef migrations add InitialCreate

# Create migration with descriptive name
dotnet ef migrations add AddBlogTimestamps

# List all migrations
dotnet ef migrations list

# Apply pending migrations to database
dotnet ef database update

# Apply migrations to specific migration (rollback)
dotnet ef database update InitialCreate

# Generate SQL script instead of applying directly
# Useful for production deployments where you need review
dotnet ef migrations script --idempotent -o migration.sql

# Generate script between specific migrations
dotnet ef migrations script AddBlogTimestamps AddUserAuthentication -o update.sql

# Remove the last migration (if not applied)
dotnet ef migrations remove

# Reset database (drop and recreate) - development only!
dotnet ef database drop --force
dotnet ef database update
```

### Repository Pattern Example

Create `Repositories/BlogRepository.cs`:

```csharp
// Repositories/BlogRepository.cs
// Repository pattern for clean data access abstraction

using Microsoft.EntityFrameworkCore;
using MyWebApi.Models;

namespace MyWebApi.Repositories;

/// <summary>
/// Interface defining blog repository operations
/// Allows for easy mocking in unit tests
/// </summary>
public interface IBlogRepository
{
    Task<IEnumerable<Blog>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Blog?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Blog?> GetByUrlAsync(string url, CancellationToken cancellationToken = default);
    Task<Blog> CreateAsync(Blog blog, CancellationToken cancellationToken = default);
    Task UpdateAsync(Blog blog, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);
}

/// <summary>
/// Blog repository implementation using Entity Framework Core
/// </summary>
public class BlogRepository : IBlogRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BlogRepository> _logger;

    public BlogRepository(ApplicationDbContext context, ILogger<BlogRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all blogs with their posts
    /// </summary>
    public async Task<IEnumerable<Blog>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving all blogs");

        // Use AsNoTracking for read-only queries to improve performance
        // Include Posts to eagerly load the navigation property
        return await _context.Blogs
            .AsNoTracking()
            .Include(b => b.Posts)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves a blog by ID with related posts
    /// </summary>
    public async Task<Blog?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving blog with ID: {BlogId}", id);

        return await _context.Blogs
            .AsNoTracking()
            .Include(b => b.Posts)
                .ThenInclude(p => p.Tags)  // Include nested navigation
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    /// <summary>
    /// Retrieves a blog by URL
    /// </summary>
    public async Task<Blog?> GetByUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        return await _context.Blogs
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Url == url, cancellationToken);
    }

    /// <summary>
    /// Creates a new blog
    /// </summary>
    public async Task<Blog> CreateAsync(Blog blog, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Creating new blog: {BlogUrl}", blog.Url);

        _context.Blogs.Add(blog);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Blog created with ID: {BlogId}", blog.Id);

        return blog;
    }

    /// <summary>
    /// Updates an existing blog
    /// </summary>
    public async Task UpdateAsync(Blog blog, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Updating blog: {BlogId}", blog.Id);

        // Attach and mark as modified
        _context.Entry(blog).State = EntityState.Modified;

        // Don't update CreatedAt
        _context.Entry(blog).Property(b => b.CreatedAt).IsModified = false;

        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Deletes a blog by ID
    /// </summary>
    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting blog: {BlogId}", id);

        var blog = await _context.Blogs.FindAsync(new object[] { id }, cancellationToken);

        if (blog != null)
        {
            _context.Blogs.Remove(blog);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Checks if a blog exists
    /// </summary>
    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Blogs.AnyAsync(b => b.Id == id, cancellationToken);
    }
}
```

---

## Testing with xUnit

xUnit is the most popular testing framework for .NET, offering powerful features and excellent IDE integration.

### Setting Up Test Project

```bash
# Create a test project using xUnit template
dotnet new xunit -n MyWebApi.Tests

cd MyWebApi.Tests

# Add reference to the main project
dotnet add reference ../MyWebApi/MyWebApi.csproj

# Add additional testing packages
dotnet add package Moq                           # Mocking framework
dotnet add package FluentAssertions              # Readable assertions
dotnet add package Microsoft.AspNetCore.Mvc.Testing  # Integration testing
dotnet add package Microsoft.EntityFrameworkCore.InMemory  # In-memory database for testing
```

### Unit Test Example

Create `Tests/ProductServiceTests.cs`:

```csharp
// Tests/ProductServiceTests.cs
// Unit tests for product service using xUnit

using Xunit;
using Moq;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using MyWebApi.Services;
using MyWebApi.Repositories;
using MyWebApi.Models;

namespace MyWebApi.Tests;

/// <summary>
/// Unit tests for ProductService
/// Tests are organized using the Arrange-Act-Assert pattern
/// </summary>
public class ProductServiceTests
{
    // Mock dependencies
    private readonly Mock<IProductRepository> _mockRepository;
    private readonly Mock<ILogger<ProductService>> _mockLogger;
    private readonly ProductService _sut;  // System Under Test

    /// <summary>
    /// Constructor runs before each test, setting up fresh mocks
    /// This ensures test isolation
    /// </summary>
    public ProductServiceTests()
    {
        _mockRepository = new Mock<IProductRepository>();
        _mockLogger = new Mock<ILogger<ProductService>>();

        // Create the service with mocked dependencies
        _sut = new ProductService(_mockRepository.Object, _mockLogger.Object);
    }

    /// <summary>
    /// Test that GetById returns product when it exists
    /// </summary>
    [Fact]  // Marks method as a test
    public async Task GetByIdAsync_WhenProductExists_ReturnsProduct()
    {
        // Arrange - Set up test data and mock behavior
        var productId = 1;
        var expectedProduct = new Product
        {
            Id = productId,
            Name = "Test Product",
            Price = 99.99m,
            StockQuantity = 10
        };

        // Configure mock to return the expected product
        _mockRepository
            .Setup(r => r.GetByIdAsync(productId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedProduct);

        // Act - Execute the method being tested
        var result = await _sut.GetByIdAsync(productId);

        // Assert - Verify the results using FluentAssertions
        result.Should().NotBeNull();
        result!.Id.Should().Be(productId);
        result.Name.Should().Be("Test Product");
        result.Price.Should().Be(99.99m);

        // Verify the repository method was called exactly once
        _mockRepository.Verify(
            r => r.GetByIdAsync(productId, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    /// <summary>
    /// Test that GetById returns null when product doesn't exist
    /// </summary>
    [Fact]
    public async Task GetByIdAsync_WhenProductDoesNotExist_ReturnsNull()
    {
        // Arrange
        var productId = 999;

        _mockRepository
            .Setup(r => r.GetByIdAsync(productId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Product?)null);

        // Act
        var result = await _sut.GetByIdAsync(productId);

        // Assert
        result.Should().BeNull();
    }

    /// <summary>
    /// Parameterized test using Theory and InlineData
    /// Tests multiple input/output combinations
    /// </summary>
    [Theory]
    [InlineData(10, 5, true)]      // 10 in stock, need 5 = available
    [InlineData(5, 5, true)]       // Exactly enough
    [InlineData(3, 5, false)]      // Not enough in stock
    [InlineData(0, 1, false)]      // None in stock
    public async Task CheckAvailability_ReturnsCorrectResult(
        int stockQuantity,
        int requestedQuantity,
        bool expectedResult)
    {
        // Arrange
        var product = new Product
        {
            Id = 1,
            Name = "Test",
            StockQuantity = stockQuantity
        };

        _mockRepository
            .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        var result = await _sut.CheckAvailabilityAsync(1, requestedQuantity);

        // Assert
        result.Should().Be(expectedResult);
    }

    /// <summary>
    /// Test using MemberData for complex test data
    /// </summary>
    [Theory]
    [MemberData(nameof(GetPriceCalculationTestData))]
    public void CalculateTotal_WithDiscount_ReturnsCorrectAmount(
        decimal price,
        int quantity,
        decimal discountPercent,
        decimal expected)
    {
        // Act
        var result = _sut.CalculateTotal(price, quantity, discountPercent);

        // Assert - Use BeApproximately for decimal comparison
        result.Should().BeApproximately(expected, 0.01m);
    }

    /// <summary>
    /// Test data generator for MemberData
    /// </summary>
    public static IEnumerable<object[]> GetPriceCalculationTestData()
    {
        yield return new object[] { 100m, 2, 0m, 200m };      // No discount
        yield return new object[] { 100m, 2, 10m, 180m };     // 10% discount
        yield return new object[] { 50m, 3, 20m, 120m };      // 20% discount
        yield return new object[] { 99.99m, 1, 50m, 49.995m }; // 50% discount
    }

    /// <summary>
    /// Test exception handling
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithNullProduct_ThrowsArgumentNullException()
    {
        // Arrange
        Product? nullProduct = null;

        // Act & Assert
        await _sut.Invoking(s => s.CreateAsync(nullProduct!))
            .Should()
            .ThrowAsync<ArgumentNullException>()
            .WithParameterName("product");
    }

    /// <summary>
    /// Test async operations with Moq callbacks
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithValidProduct_SetsCreatedTimestamp()
    {
        // Arrange
        var product = new Product
        {
            Name = "New Product",
            Price = 49.99m
        };

        Product? savedProduct = null;

        // Capture the product that's passed to the repository
        _mockRepository
            .Setup(r => r.CreateAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()))
            .Callback<Product, CancellationToken>((p, _) => savedProduct = p)
            .ReturnsAsync((Product p, CancellationToken _) => p);

        // Act
        var before = DateTime.UtcNow;
        await _sut.CreateAsync(product);
        var after = DateTime.UtcNow;

        // Assert
        savedProduct.Should().NotBeNull();
        savedProduct!.CreatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }
}

/// <summary>
/// Test fixture for shared test context
/// Use when multiple tests need expensive setup
/// </summary>
public class DatabaseFixture : IDisposable
{
    public ApplicationDbContext Context { get; }

    public DatabaseFixture()
    {
        // Set up in-memory database for testing
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        Context = new ApplicationDbContext(options);

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        Context.Products.AddRange(
            new Product { Id = 1, Name = "Product 1", Price = 10m },
            new Product { Id = 2, Name = "Product 2", Price = 20m },
            new Product { Id = 3, Name = "Product 3", Price = 30m }
        );
        Context.SaveChanges();
    }

    public void Dispose()
    {
        Context.Dispose();
    }
}

/// <summary>
/// Tests using shared fixture via IClassFixture
/// </summary>
public class ProductRepositoryTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public ProductRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetAll_ReturnsAllProducts()
    {
        // Arrange
        var repository = new ProductRepository(_fixture.Context);

        // Act
        var products = await repository.GetAllAsync();

        // Assert
        products.Should().HaveCount(3);
    }
}
```

### Integration Test Example

Create `Tests/IntegrationTests/ProductsControllerTests.cs`:

```csharp
// Tests/IntegrationTests/ProductsControllerTests.cs
// Integration tests for the Products API

using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using FluentAssertions;
using MyWebApi.Models;

namespace MyWebApi.Tests.IntegrationTests;

/// <summary>
/// Integration tests that test the full HTTP request/response cycle
/// Uses WebApplicationFactory to create an in-memory test server
/// </summary>
public class ProductsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ProductsControllerTests(WebApplicationFactory<Program> factory)
    {
        // Configure the test server with an in-memory database
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove the real database configuration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database for testing
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDatabase");
                });

                // Ensure database is created and seeded
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();

                // Seed test data
                if (!db.Products.Any())
                {
                    db.Products.AddRange(
                        new Product { Name = "Test Product 1", Price = 10.00m, StockQuantity = 100 },
                        new Product { Name = "Test Product 2", Price = 20.00m, StockQuantity = 50 }
                    );
                    db.SaveChanges();
                }
            });
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetAll_ReturnsSuccessAndProducts()
    {
        // Act
        var response = await _client.GetAsync("/api/products");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var products = await response.Content.ReadFromJsonAsync<List<Product>>();
        products.Should().NotBeNull();
        products.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task GetById_WithValidId_ReturnsProduct()
    {
        // Act
        var response = await _client.GetAsync("/api/products/1");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var product = await response.Content.ReadFromJsonAsync<Product>();
        product.Should().NotBeNull();
        product!.Id.Should().Be(1);
    }

    [Fact]
    public async Task GetById_WithInvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/products/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_WithValidProduct_ReturnsCreated()
    {
        // Arrange
        var newProduct = new CreateProductDto
        {
            Name = "New Test Product",
            Price = 29.99m,
            StockQuantity = 25
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/products", newProduct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdProduct = await response.Content.ReadFromJsonAsync<Product>();
        createdProduct.Should().NotBeNull();
        createdProduct!.Name.Should().Be(newProduct.Name);
        createdProduct.Price.Should().Be(newProduct.Price);

        // Verify Location header is set correctly
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Contain($"/api/products/{createdProduct.Id}");
    }

    [Fact]
    public async Task Create_WithInvalidProduct_ReturnsBadRequest()
    {
        // Arrange - Missing required Name field
        var invalidProduct = new { Price = 10.00m };

        // Act
        var response = await _client.PostAsJsonAsync("/api/products", invalidProduct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_WithValidProduct_ReturnsNoContent()
    {
        // Arrange
        var updateDto = new CreateProductDto
        {
            Name = "Updated Product",
            Price = 39.99m,
            StockQuantity = 75
        };

        // Act
        var response = await _client.PutAsJsonAsync("/api/products/1", updateDto);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify the update was persisted
        var getResponse = await _client.GetAsync("/api/products/1");
        var updatedProduct = await getResponse.Content.ReadFromJsonAsync<Product>();
        updatedProduct!.Name.Should().Be("Updated Product");
    }

    [Fact]
    public async Task Delete_WithValidId_ReturnsNoContent()
    {
        // Create a product to delete
        var product = new CreateProductDto
        {
            Name = "Product to Delete",
            Price = 5.00m,
            StockQuantity = 1
        };
        var createResponse = await _client.PostAsJsonAsync("/api/products", product);
        var created = await createResponse.Content.ReadFromJsonAsync<Product>();

        // Act
        var response = await _client.DeleteAsync($"/api/products/{created!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify deletion
        var getResponse = await _client.GetAsync($"/api/products/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

### Running Tests

```bash
# Run all tests
dotnet test

# Run tests with detailed output
dotnet test --logger "console;verbosity=detailed"

# Run tests with code coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test class
dotnet test --filter "FullyQualifiedName~ProductServiceTests"

# Run tests matching a pattern
dotnet test --filter "Name~WhenProductExists"

# Run tests and generate test results file (for CI/CD)
dotnet test --logger "trx;LogFileName=test-results.trx"

# Run tests in parallel (default) or sequentially
dotnet test --parallel
dotnet test -- xunit.parallelizeAssembly=false
```

---

## Publishing and Deployment

### Framework-Dependent Deployment (FDD)

This approach creates a smaller deployment package that requires .NET runtime on the target machine.

```bash
# Publish for any platform (requires .NET runtime)
# Output is compact, typically under 1MB for simple apps
dotnet publish -c Release -o ./publish

# Publish with specific options
dotnet publish -c Release \
    --output ./publish \
    --no-restore \
    --verbosity minimal
```

### Self-Contained Deployment (SCD)

Creates a complete deployment package including the .NET runtime.

```bash
# Publish self-contained for Linux x64
# Includes everything needed to run, no external dependencies
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -o ./publish/linux-x64

# Common runtime identifiers (RIDs):
# linux-x64       - Linux 64-bit
# linux-arm64     - Linux ARM 64-bit (Raspberry Pi 4, etc.)
# win-x64         - Windows 64-bit
# osx-x64         - macOS Intel
# osx-arm64       - macOS Apple Silicon

# Publish for multiple platforms simultaneously
dotnet publish -c Release -r linux-x64 --self-contained -o ./publish/linux-x64 &
dotnet publish -c Release -r linux-arm64 --self-contained -o ./publish/linux-arm64 &
dotnet publish -c Release -r win-x64 --self-contained -o ./publish/win-x64 &
wait
```

### Single-File Deployment

Bundle the entire application into a single executable file.

```bash
# Create a single executable file
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -o ./publish/single-file

# Even smaller: Enable compression
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:EnableCompressionInSingleFile=true \
    -o ./publish/single-file-compressed
```

### Trimmed Deployment

Remove unused code to reduce deployment size significantly.

```bash
# Enable trimming to remove unused code
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishTrimmed=true \
    -o ./publish/trimmed

# Aggressive trimming (smaller but may break reflection)
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishTrimmed=true \
    -p:TrimMode=link \
    -o ./publish/trimmed-aggressive
```

### ReadyToRun (R2R) Compilation

Pre-compile to native code for faster startup time.

```bash
# Enable ReadyToRun for faster cold startup
dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishReadyToRun=true \
    -o ./publish/r2r
```

### Publish Profile Configuration

Create `Properties/PublishProfiles/Linux.pubxml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project>
  <PropertyGroup>
    <!-- Target framework -->
    <TargetFramework>net8.0</TargetFramework>

    <!-- Runtime identifier for Linux x64 -->
    <RuntimeIdentifier>linux-x64</RuntimeIdentifier>

    <!-- Self-contained deployment -->
    <SelfContained>true</SelfContained>

    <!-- Single file output -->
    <PublishSingleFile>true</PublishSingleFile>

    <!-- Enable trimming for smaller size -->
    <PublishTrimmed>true</PublishTrimmed>

    <!-- ReadyToRun compilation for faster startup -->
    <PublishReadyToRun>true</PublishReadyToRun>

    <!-- Output directory -->
    <PublishDir>./publish/linux</PublishDir>

    <!-- Remove debug symbols for production -->
    <DebugType>none</DebugType>
    <DebugSymbols>false</DebugSymbols>
  </PropertyGroup>
</Project>
```

Use the profile:

```bash
dotnet publish -p:PublishProfile=Linux
```

---

## IDE Setup

### Visual Studio Code Setup

VS Code provides excellent .NET development support with the C# extension.

```bash
# Install VS Code if not already installed
sudo snap install code --classic

# Or via apt
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

Install recommended extensions via command line:

```bash
# Essential C# extension (includes OmniSharp)
code --install-extension ms-dotnettools.csharp

# C# Dev Kit for enhanced IDE features
code --install-extension ms-dotnettools.csdevkit

# IntelliCode for AI-assisted development
code --install-extension visualstudioexptteam.vscodeintellicode

# NuGet Package Manager
code --install-extension jmrog.vscode-nuget-package-manager

# GitLens for enhanced Git integration
code --install-extension eamodio.gitlens

# REST Client for API testing
code --install-extension humao.rest-client

# Docker support
code --install-extension ms-azuretools.vscode-docker
```

Create `.vscode/settings.json` for project configuration:

```json
{
    // Use OmniSharp for C# language features
    "dotnet.server.useOmnisharp": false,

    // Enable hot reload in terminal
    "dotnet.enableHotReload": true,

    // Organize imports on save
    "editor.codeActionsOnSave": {
        "source.organizeImports": "explicit"
    },

    // Format on save for consistent style
    "editor.formatOnSave": true,

    // Use tabs or spaces based on .editorconfig
    "editor.detectIndentation": true,

    // C# specific settings
    "[csharp]": {
        "editor.defaultFormatter": "ms-dotnettools.csharp",
        "editor.tabSize": 4,
        "editor.insertSpaces": true
    },

    // Hide generated files in explorer
    "files.exclude": {
        "**/bin": true,
        "**/obj": true,
        "**/.git": true
    },

    // Enable file nesting for cleaner project view
    "explorer.fileNesting.enabled": true,
    "explorer.fileNesting.patterns": {
        "*.cs": "${capture}.Designer.cs, ${capture}.g.cs",
        "appsettings.json": "appsettings.*.json"
    }
}
```

Create `.vscode/launch.json` for debugging:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            // Launch web application with debugger
            "name": ".NET Core Launch (web)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "build",
            "program": "${workspaceFolder}/bin/Debug/net8.0/MyWebApi.dll",
            "args": [],
            "cwd": "${workspaceFolder}",
            "stopAtEntry": false,
            "env": {
                "ASPNETCORE_ENVIRONMENT": "Development",
                "ASPNETCORE_URLS": "https://localhost:5001;http://localhost:5000"
            },
            // Automatically open browser
            "serverReadyAction": {
                "action": "openExternally",
                "pattern": "\\bNow listening on:\\s+(https?://\\S+)"
            }
        },
        {
            // Launch console application
            "name": ".NET Core Launch (console)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "build",
            "program": "${workspaceFolder}/bin/Debug/net8.0/MyConsoleApp.dll",
            "args": ["arg1", "arg2"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal"
        },
        {
            // Attach to running process
            "name": ".NET Core Attach",
            "type": "coreclr",
            "request": "attach"
        }
    ]
}
```

Create `.vscode/tasks.json` for build tasks:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "build",
            "command": "dotnet",
            "type": "process",
            "args": [
                "build",
                "${workspaceFolder}/MyWebApi.csproj",
                "/property:GenerateFullPaths=true",
                "/consoleloggerparameters:NoSummary"
            ],
            "problemMatcher": "$msCompile",
            "group": {
                "kind": "build",
                "isDefault": true
            }
        },
        {
            "label": "watch",
            "command": "dotnet",
            "type": "process",
            "args": [
                "watch",
                "run",
                "--project",
                "${workspaceFolder}/MyWebApi.csproj"
            ],
            "problemMatcher": "$msCompile",
            "isBackground": true
        },
        {
            "label": "test",
            "command": "dotnet",
            "type": "process",
            "args": [
                "test",
                "${workspaceFolder}/MyWebApi.Tests/MyWebApi.Tests.csproj"
            ],
            "problemMatcher": "$msCompile",
            "group": "test"
        },
        {
            "label": "publish",
            "command": "dotnet",
            "type": "process",
            "args": [
                "publish",
                "${workspaceFolder}/MyWebApi.csproj",
                "-c",
                "Release",
                "-o",
                "${workspaceFolder}/publish"
            ],
            "problemMatcher": "$msCompile"
        }
    ]
}
```

### JetBrains Rider Setup

Rider is a powerful cross-platform .NET IDE with excellent refactoring and debugging capabilities.

```bash
# Install Rider via snap (recommended)
sudo snap install rider --classic

# Or download directly from JetBrains
# https://www.jetbrains.com/rider/download/#section=linux
```

Recommended Rider plugins:

1. **Rainbow Brackets** - Color-codes matching brackets
2. **Key Promoter X** - Learn keyboard shortcuts
3. **String Manipulation** - Text transformation tools
4. **.NET Core User Secrets** - Manage development secrets
5. **Database Tools** - Built-in database management

Rider configuration recommendations:

```
# Enable .NET Hot Reload
Settings -> Build, Execution, Deployment -> Hot Reload -> Enable Hot Reload

# Configure code style
Settings -> Editor -> Code Style -> C# -> Set to your team's standards

# Enable EditorConfig support
Settings -> Editor -> Code Style -> Enable EditorConfig support

# Configure test runner
Settings -> Build, Execution, Deployment -> Unit Testing -> Enable auto-detection
```

---

## Docker Deployment

Docker enables consistent deployments across all environments. Here's how to containerize your .NET applications.

### Basic Dockerfile

Create `Dockerfile`:

```dockerfile
# Dockerfile for .NET 8 Web API
# Multi-stage build for optimized image size

# =============================================================================
# Stage 1: Build stage
# Uses the full SDK image to compile the application
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory inside the container
WORKDIR /src

# Copy project files first (for better layer caching)
# This layer only changes when dependencies change
COPY ["MyWebApi.csproj", "./"]

# Restore NuGet packages
# This is cached unless csproj files change
RUN dotnet restore "MyWebApi.csproj"

# Copy all source files
COPY . .

# Build the application in Release mode
RUN dotnet build "MyWebApi.csproj" -c Release -o /app/build

# =============================================================================
# Stage 2: Publish stage
# Creates the optimized publish output
# =============================================================================
FROM build AS publish

# Publish the application
RUN dotnet publish "MyWebApi.csproj" -c Release -o /app/publish \
    # Don't restore again (already done)
    --no-restore \
    # Don't build again (already done)
    --no-build

# =============================================================================
# Stage 3: Runtime stage
# Uses the minimal runtime-only image
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

# Set the working directory
WORKDIR /app

# Create a non-root user for security
# Running as non-root prevents container escape attacks
RUN adduser --disabled-password --gecos '' appuser

# Copy published files from the publish stage
COPY --from=publish /app/publish .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port the app listens on
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check to verify the container is running correctly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "MyWebApi.dll"]
```

### Optimized Production Dockerfile

Create `Dockerfile.production`:

```dockerfile
# Production-optimized Dockerfile with security best practices
# Uses distroless base image for minimal attack surface

# =============================================================================
# Stage 1: Build and test
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["MyWebApi.sln", "./"]
COPY ["src/MyWebApi/MyWebApi.csproj", "src/MyWebApi/"]
COPY ["tests/MyWebApi.Tests/MyWebApi.Tests.csproj", "tests/MyWebApi.Tests/"]

# Restore all projects
RUN dotnet restore

# Copy all source code
COPY . .

# Run tests (fail build if tests fail)
RUN dotnet test --no-restore --verbosity normal

# Publish optimized build
RUN dotnet publish "src/MyWebApi/MyWebApi.csproj" \
    -c Release \
    -o /app/publish \
    # Self-contained for distroless image
    --self-contained true \
    # Target Linux runtime
    -r linux-x64 \
    # Single file deployment
    -p:PublishSingleFile=true \
    # Trim unused code
    -p:PublishTrimmed=true \
    # ReadyToRun compilation for faster startup
    -p:PublishReadyToRun=true

# =============================================================================
# Stage 2: Runtime using distroless image
# =============================================================================
FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-jammy-chiseled AS final

# Labels for container metadata
LABEL maintainer="your-team@example.com"
LABEL version="1.0.0"
LABEL description="Production API service"

WORKDIR /app

# Copy the single-file executable
COPY --from=build /app/publish/MyWebApi .

# Use non-root user (UID 1000 is standard)
USER 1000

# Expose port
EXPOSE 8080

# Environment configuration
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Entry point
ENTRYPOINT ["./MyWebApi"]
```

### Docker Compose for Development

Create `docker-compose.yml`:

```yaml
# Docker Compose configuration for local development
# Includes application, database, and monitoring services

version: '3.8'

services:
  # Main API application
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mywebapi
    ports:
      - "5000:8080"    # HTTP
    environment:
      # Application environment
      - ASPNETCORE_ENVIRONMENT=Development
      # Database connection
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=myapp;Username=postgres;Password=postgres
      # Redis cache connection
      - ConnectionStrings__Redis=redis:6379
      # Logging level
      - Logging__LogLevel__Default=Information
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network
    # Mount source code for hot reload during development
    volumes:
      - ./src:/src:ro
    restart: unless-stopped

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    container_name: mywebapi-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      # Persist database data
      - postgres_data:/var/lib/postgresql/data
      # Initialize database with custom scripts
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis cache
  redis:
    image: redis:7-alpine
    container_name: mywebapi-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

  # pgAdmin for database management (development only)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: mywebapi-pgadmin
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      - postgres
    networks:
      - app-network
    profiles:
      - dev  # Only start with --profile dev

# Persistent storage volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# Network configuration
networks:
  app-network:
    driver: bridge
```

### Docker Commands

```bash
# Build the Docker image
docker build -t mywebapi:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.production -t mywebapi:production .

# Run the container
docker run -d \
    --name mywebapi \
    -p 5000:8080 \
    -e ASPNETCORE_ENVIRONMENT=Production \
    -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;..." \
    mywebapi:latest

# View container logs
docker logs -f mywebapi

# Execute command in running container
docker exec -it mywebapi /bin/bash

# Docker Compose commands
# Start all services
docker-compose up -d

# Start with dev profile (includes pgAdmin)
docker-compose --profile dev up -d

# View logs from all services
docker-compose logs -f

# Rebuild and restart a specific service
docker-compose up -d --build api

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Scale a service (if configured)
docker-compose up -d --scale api=3
```

---

## ASP.NET Core Configuration

### Configuration Sources and Hierarchy

Create `appsettings.json`:

```json
{
  // Logging configuration
  // Controls what gets logged and at what level
  "Logging": {
    "LogLevel": {
      // Default level for all categories
      "Default": "Information",
      // Microsoft framework logs (reduce noise)
      "Microsoft": "Warning",
      // EF Core SQL logging
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning",
      // ASP.NET Core hosting logs
      "Microsoft.AspNetCore": "Warning"
    }
  },

  // Connection strings for databases and services
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=myapp;Username=postgres;Password=postgres",
    "Redis": "localhost:6379"
  },

  // Application-specific settings
  "AppSettings": {
    "ApplicationName": "My Web API",
    "Version": "1.0.0",
    "MaxItemsPerPage": 100,
    "EnableSwagger": true
  },

  // JWT authentication settings
  "Jwt": {
    "Issuer": "https://myapi.example.com",
    "Audience": "https://myapi.example.com",
    // NOTE: In production, use secrets management, not appsettings!
    "SecretKey": "your-secret-key-here-min-32-characters"
  },

  // CORS configuration
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://myapp.example.com"
    ]
  },

  // Rate limiting configuration
  "RateLimiting": {
    "PermitLimit": 100,
    "Window": 60,
    "QueueLimit": 2
  },

  // Feature flags
  "FeatureFlags": {
    "EnableNewDashboard": false,
    "EnableExperimentalApi": false
  }
}
```

Create `appsettings.Development.json`:

```json
{
  // Development-specific overrides
  // These settings are merged with appsettings.json

  "Logging": {
    "LogLevel": {
      // More verbose logging in development
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information",
      // See EF Core SQL queries
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  },

  "ConnectionStrings": {
    // Local development database
    "DefaultConnection": "Host=localhost;Database=myapp_dev;Username=postgres;Password=postgres"
  },

  "AppSettings": {
    // Enable Swagger in development
    "EnableSwagger": true
  },

  "FeatureFlags": {
    // Enable experimental features for testing
    "EnableExperimentalApi": true
  }
}
```

### Strongly-Typed Configuration

Create `Configuration/AppSettings.cs`:

```csharp
// Configuration/AppSettings.cs
// Strongly-typed configuration classes for type safety and IntelliSense

namespace MyWebApi.Configuration;

/// <summary>
/// Application-wide settings
/// Bound from "AppSettings" section in appsettings.json
/// </summary>
public class AppSettings
{
    /// <summary>
    /// Configuration section name for binding
    /// </summary>
    public const string SectionName = "AppSettings";

    /// <summary>
    /// Application display name
    /// </summary>
    public string ApplicationName { get; set; } = "My Web API";

    /// <summary>
    /// Application version
    /// </summary>
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// Maximum items returned per page in paginated responses
    /// </summary>
    public int MaxItemsPerPage { get; set; } = 100;

    /// <summary>
    /// Enable Swagger UI
    /// </summary>
    public bool EnableSwagger { get; set; } = true;
}

/// <summary>
/// JWT authentication configuration
/// </summary>
public class JwtSettings
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// Token issuer (who created the token)
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Token audience (who the token is intended for)
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Secret key for signing tokens (min 32 characters)
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Token expiration time in minutes
    /// </summary>
    public int ExpirationMinutes { get; set; } = 60;

    /// <summary>
    /// Refresh token expiration time in days
    /// </summary>
    public int RefreshTokenExpirationDays { get; set; } = 7;
}

/// <summary>
/// CORS policy configuration
/// </summary>
public class CorsSettings
{
    public const string SectionName = "Cors";

    /// <summary>
    /// Allowed origins for CORS requests
    /// </summary>
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
}

/// <summary>
/// Rate limiting configuration
/// </summary>
public class RateLimitingSettings
{
    public const string SectionName = "RateLimiting";

    /// <summary>
    /// Maximum requests allowed in the time window
    /// </summary>
    public int PermitLimit { get; set; } = 100;

    /// <summary>
    /// Time window in seconds
    /// </summary>
    public int Window { get; set; } = 60;

    /// <summary>
    /// Maximum requests that can be queued
    /// </summary>
    public int QueueLimit { get; set; } = 2;
}

/// <summary>
/// Feature flags for feature toggling
/// </summary>
public class FeatureFlags
{
    public const string SectionName = "FeatureFlags";

    public bool EnableNewDashboard { get; set; }
    public bool EnableExperimentalApi { get; set; }
}
```

### Complete Program.cs with Configuration

```csharp
// Program.cs - Complete ASP.NET Core configuration example

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;
using MyWebApi.Configuration;
using MyWebApi.Models;
using MyWebApi.Repositories;
using MyWebApi.Services;

// =============================================================================
// Configure Serilog early for startup logging
// =============================================================================
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting application...");

    var builder = WebApplication.CreateBuilder(args);

    // =============================================================================
    // Configure Serilog from appsettings.json
    // =============================================================================
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .WriteTo.Console(
            outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
        .WriteTo.File(
            path: "logs/mywebapi-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 7)
    );

    // =============================================================================
    // Bind strongly-typed configuration
    // =============================================================================
    var appSettings = builder.Configuration
        .GetSection(AppSettings.SectionName)
        .Get<AppSettings>() ?? new AppSettings();

    var jwtSettings = builder.Configuration
        .GetSection(JwtSettings.SectionName)
        .Get<JwtSettings>() ?? new JwtSettings();

    var corsSettings = builder.Configuration
        .GetSection(CorsSettings.SectionName)
        .Get<CorsSettings>() ?? new CorsSettings();

    var rateLimitSettings = builder.Configuration
        .GetSection(RateLimitingSettings.SectionName)
        .Get<RateLimitingSettings>() ?? new RateLimitingSettings();

    // Register settings for dependency injection
    builder.Services.Configure<AppSettings>(
        builder.Configuration.GetSection(AppSettings.SectionName));
    builder.Services.Configure<JwtSettings>(
        builder.Configuration.GetSection(JwtSettings.SectionName));
    builder.Services.Configure<FeatureFlags>(
        builder.Configuration.GetSection(FeatureFlags.SectionName));

    // =============================================================================
    // Configure Database
    // =============================================================================
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(3);
                npgsqlOptions.CommandTimeout(30);
            }
        );

        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    });

    // =============================================================================
    // Configure Authentication
    // =============================================================================
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Validate the issuer (who created the token)
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,

            // Validate the audience (who the token is for)
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,

            // Validate the signing key
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),

            // Validate expiration
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero  // No grace period
        };

        // Handle JWT events for custom logging/behavior
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Log.Warning("Authentication failed: {Error}", context.Exception.Message);
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Log.Debug("Token validated for user: {User}",
                    context.Principal?.Identity?.Name);
                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAuthorization();

    // =============================================================================
    // Configure CORS
    // =============================================================================
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DefaultPolicy", policy =>
        {
            if (corsSettings.AllowedOrigins.Length > 0)
            {
                policy.WithOrigins(corsSettings.AllowedOrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
            else
            {
                // Development fallback - allow all
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            }
        });
    });

    // =============================================================================
    // Configure Rate Limiting
    // =============================================================================
    builder.Services.AddRateLimiter(options =>
    {
        // Global rate limiter
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: context.User.Identity?.Name
                    ?? context.Connection.RemoteIpAddress?.ToString()
                    ?? "anonymous",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = rateLimitSettings.PermitLimit,
                    Window = TimeSpan.FromSeconds(rateLimitSettings.Window),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = rateLimitSettings.QueueLimit
                }));

        // Custom response when rate limited
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                error = "Too many requests",
                message = "Rate limit exceeded. Please try again later.",
                retryAfter = rateLimitSettings.Window
            }, token);
        };
    });

    // =============================================================================
    // Configure Health Checks
    // =============================================================================
    builder.Services.AddHealthChecks()
        .AddNpgSql(
            builder.Configuration.GetConnectionString("DefaultConnection")!,
            name: "postgresql",
            tags: new[] { "db", "sql", "postgresql" })
        .AddRedis(
            builder.Configuration.GetConnectionString("Redis")!,
            name: "redis",
            tags: new[] { "cache", "redis" });

    // =============================================================================
    // Register Application Services
    // =============================================================================
    // Repositories
    builder.Services.AddScoped<IBlogRepository, BlogRepository>();
    builder.Services.AddScoped<IProductRepository, ProductRepository>();

    // Services
    builder.Services.AddScoped<IProductService, ProductService>();
    builder.Services.AddScoped<IBlogService, BlogService>();

    // HTTP clients for external services
    builder.Services.AddHttpClient("ExternalApi", client =>
    {
        client.BaseAddress = new Uri("https://api.external-service.com/");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    // =============================================================================
    // Configure Controllers and API
    // =============================================================================
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            // Use camelCase for JSON property names
            options.JsonSerializerOptions.PropertyNamingPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
            // Pretty print in development
            options.JsonSerializerOptions.WriteIndented =
                builder.Environment.IsDevelopment();
        });

    builder.Services.AddEndpointsApiExplorer();

    // =============================================================================
    // Configure Swagger/OpenAPI
    // =============================================================================
    if (appSettings.EnableSwagger)
    {
        builder.Services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = appSettings.ApplicationName,
                Version = appSettings.Version,
                Description = "A comprehensive .NET 8 Web API example",
                Contact = new OpenApiContact
                {
                    Name = "API Support",
                    Email = "support@example.com"
                }
            });

            // Add JWT authentication to Swagger
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header. Enter 'Bearer {token}'",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            // Include XML documentation
            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
            }
        });
    }

    // =============================================================================
    // Build Application
    // =============================================================================
    var app = builder.Build();

    // =============================================================================
    // Configure Middleware Pipeline
    // Order matters! Middleware executes in the order added
    // =============================================================================

    // Use Serilog request logging
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    });

    // Exception handling
    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }
    else
    {
        app.UseExceptionHandler("/error");
        app.UseHsts();
    }

    // Swagger UI
    if (appSettings.EnableSwagger)
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
            options.RoutePrefix = "swagger";
        });
    }

    // Security headers
    app.UseHttpsRedirection();

    // CORS must be before routing
    app.UseCors("DefaultPolicy");

    // Rate limiting
    app.UseRateLimiter();

    // Authentication & Authorization
    app.UseAuthentication();
    app.UseAuthorization();

    // Health check endpoints
    app.MapHealthChecks("/health");
    app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("db")
    });

    // Map controllers
    app.MapControllers();

    // Default route
    app.MapGet("/", () => Results.Redirect("/swagger"));

    // =============================================================================
    // Apply Migrations (Development only)
    // =============================================================================
    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

    // =============================================================================
    // Start Application
    // =============================================================================
    Log.Information("Application started successfully");
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
```

### User Secrets for Development

User secrets provide a secure way to store sensitive configuration during development.

```bash
# Initialize user secrets for your project
# Creates a secrets.json file outside your project directory
dotnet user-secrets init

# Set a secret value
dotnet user-secrets set "Jwt:SecretKey" "your-super-secret-key-at-least-32-chars"

# Set connection string
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=myapp;Username=postgres;Password=secret"

# Set nested configuration
dotnet user-secrets set "ExternalServices:ApiKey" "your-api-key"

# List all secrets
dotnet user-secrets list

# Remove a secret
dotnet user-secrets remove "Jwt:SecretKey"

# Clear all secrets
dotnet user-secrets clear
```

---

## Monitoring with OneUptime

After deploying your .NET application, proper monitoring is essential for maintaining reliability and performance. [OneUptime](https://oneuptime.com) provides comprehensive monitoring capabilities that integrate seamlessly with .NET applications.

### Why Monitor Your .NET Application?

1. **Uptime Monitoring**: Ensure your API endpoints are responsive and returning expected status codes
2. **Performance Tracking**: Monitor response times and identify slow endpoints
3. **Error Tracking**: Catch and alert on exceptions before users report them
4. **Resource Monitoring**: Track CPU, memory, and database connection usage
5. **Log Management**: Centralize and search logs from all your services

### Setting Up OneUptime Monitoring

OneUptime offers several monitoring approaches for .NET applications:

**HTTP/API Monitoring**: Monitor your health check endpoints and critical API routes to ensure they're responding correctly.

**Infrastructure Monitoring**: Track server metrics including CPU, memory, disk usage, and network performance.

**Log Aggregation**: Send your Serilog output to OneUptime for centralized log management and alerting.

**Status Pages**: Create public or private status pages to communicate service health to your users.

### Key Benefits of Using OneUptime

- **Open Source**: Full transparency and community-driven development
- **Self-Hosted Option**: Deploy on your own infrastructure for complete control
- **Affordable**: Competitive pricing compared to other monitoring solutions
- **Comprehensive**: Single platform for uptime, performance, logs, and incidents
- **Integration-Ready**: Webhooks, Slack, PagerDuty, and more

For production .NET applications, implementing proper monitoring from day one helps you identify issues proactively, maintain SLA commitments, and provide a better experience for your users. Visit [OneUptime](https://oneuptime.com) to get started with monitoring your .NET applications today.

---

## Summary

This guide covered the essential aspects of setting up and developing with .NET SDK on Ubuntu:

1. **Installation**: Multiple methods including Microsoft repository, install script, and Snap
2. **Version Management**: Using global.json for SDK version pinning
3. **Project Creation**: Console apps, Web APIs, MVC applications, and minimal APIs
4. **Building and Running**: Development workflow with hot reload and various build configurations
5. **Package Management**: NuGet CLI commands and configuration
6. **Entity Framework**: Database setup, migrations, and repository patterns
7. **Testing**: xUnit with Moq and FluentAssertions for unit and integration tests
8. **Deployment**: Framework-dependent, self-contained, trimmed, and single-file deployments
9. **IDE Setup**: VS Code and Rider configuration for optimal development experience
10. **Docker**: Multi-stage builds, production optimization, and Docker Compose
11. **Configuration**: Strongly-typed settings, environment-specific configuration, and secrets management

With these fundamentals in place, you're well-equipped to build, test, and deploy robust .NET applications on Ubuntu. Happy coding!
