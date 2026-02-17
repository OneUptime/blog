# How to Use Entity Framework Core with Azure SQL Database in ASP.NET Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Entity Framework Core, C#, ASP.NET Core, Azure SQL, ORM, Database

Description: Build an ASP.NET Core application using Entity Framework Core with Azure SQL Database including migrations, relationships, and query optimization.

---

Entity Framework Core is the standard ORM for .NET applications. It maps your C# classes to database tables and translates LINQ queries into SQL. Paired with Azure SQL Database, you get a managed SQL Server instance that handles backups, patching, and scaling. In this post, I will walk through setting up EF Core with Azure SQL Database in an ASP.NET Core application, including model design, migrations, and common patterns.

## Setting Up the Project

Create an ASP.NET Core Web API project and add the required packages.

```bash
# Create the project
dotnet new webapi -n BookstoreApi
cd BookstoreApi

# Add EF Core packages
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Azure.Identity
```

## Creating the Azure SQL Database

```bash
# Create a SQL server
az sql server create \
    --name my-sql-server \
    --resource-group my-rg \
    --location eastus \
    --admin-user sqladmin \
    --admin-password "YourStr0ngP@ss!"

# Create the database
az sql db create \
    --resource-group my-rg \
    --server my-sql-server \
    --name bookstore \
    --service-objective S0

# Allow Azure services to connect
az sql server firewall-rule create \
    --resource-group my-rg \
    --server my-sql-server \
    --name AllowAzure \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0

# Allow your local IP
az sql server firewall-rule create \
    --resource-group my-rg \
    --server my-sql-server \
    --name AllowLocal \
    --start-ip-address <your-ip> \
    --end-ip-address <your-ip>
```

## Defining the Models

Here are the domain models for a bookstore application.

```csharp
// Models/Author.cs
public class Author
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property - one author has many books
    public ICollection<Book> Books { get; set; } = new List<Book>();
}

// Models/Book.cs
public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PageCount { get; set; }
    public DateTime PublishedDate { get; set; }
    public bool IsAvailable { get; set; } = true;

    // Foreign key
    public int AuthorId { get; set; }

    // Navigation properties
    public Author Author { get; set; } = null!;
    public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();
}

// Models/Category.cs
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Many-to-many through join entity
    public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();
}

// Models/BookCategory.cs - Join table for many-to-many
public class BookCategory
{
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
}
```

## Setting Up the DbContext

The DbContext is your connection to the database.

```csharp
// Data/BookstoreDbContext.cs
using Microsoft.EntityFrameworkCore;

public class BookstoreDbContext : DbContext
{
    public BookstoreDbContext(DbContextOptions<BookstoreDbContext> options)
        : base(options) { }

    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<BookCategory> BookCategories => Set<BookCategory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure Author
        modelBuilder.Entity<Author>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Name).HasMaxLength(200).IsRequired();
            entity.Property(a => a.Bio).HasMaxLength(1000);
        });

        // Configure Book
        modelBuilder.Entity<Book>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Title).HasMaxLength(300).IsRequired();
            entity.Property(b => b.Isbn).HasMaxLength(20).IsRequired();
            entity.Property(b => b.Price).HasPrecision(10, 2);

            // Index on ISBN for fast lookups
            entity.HasIndex(b => b.Isbn).IsUnique();

            // Relationship: each book belongs to one author
            entity.HasOne(b => b.Author)
                .WithMany(a => a.Books)
                .HasForeignKey(b => b.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure many-to-many relationship
        modelBuilder.Entity<BookCategory>(entity =>
        {
            entity.HasKey(bc => new { bc.BookId, bc.CategoryId });

            entity.HasOne(bc => bc.Book)
                .WithMany(b => b.BookCategories)
                .HasForeignKey(bc => bc.BookId);

            entity.HasOne(bc => bc.Category)
                .WithMany(c => c.BookCategories)
                .HasForeignKey(bc => bc.CategoryId);
        });

        // Seed some initial categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Fiction", Description = "Fictional works" },
            new Category { Id = 2, Name = "Non-Fiction", Description = "Non-fictional works" },
            new Category { Id = 3, Name = "Technical", Description = "Technical and programming books" }
        );
    }
}
```

## Configuring the Connection

In Program.cs, register the DbContext with the Azure SQL connection string.

```csharp
// Program.cs
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register EF Core with Azure SQL Database
builder.Services.AddDbContext<BookstoreDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("BookstoreDb"),
        sqlOptions =>
        {
            // Enable retry logic for transient failures
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null
            );

            // Set command timeout
            sqlOptions.CommandTimeout(30);
        }
    )
);

var app = builder.Build();
app.Run();
```

The connection string goes in appsettings.json.

```json
{
    "ConnectionStrings": {
        "BookstoreDb": "Server=my-sql-server.database.windows.net;Database=bookstore;User Id=sqladmin;Password=YourStr0ngP@ss!;Encrypt=True;TrustServerCertificate=False;"
    }
}
```

## Running Migrations

Create and apply database migrations.

```bash
# Create the initial migration
dotnet ef migrations add InitialCreate

# Apply the migration to the database
dotnet ef database update

# Or apply at startup (useful for CI/CD)
```

For automated migration on startup, add this to Program.cs.

```csharp
// Apply pending migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookstoreDbContext>();
    await db.Database.MigrateAsync();
}
```

## Building API Endpoints

Here are the CRUD endpoints using EF Core.

```csharp
// Endpoints/BookEndpoints.cs
using Microsoft.EntityFrameworkCore;

public static class BookEndpoints
{
    public static void MapBookEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/books");

        // GET all books with pagination
        group.MapGet("/", async (
            BookstoreDbContext db,
            int page = 1,
            int pageSize = 10,
            string? search = null) =>
        {
            var query = db.Books
                .Include(b => b.Author)
                .Include(b => b.BookCategories)
                    .ThenInclude(bc => bc.Category)
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(b =>
                    b.Title.Contains(search) ||
                    b.Author.Name.Contains(search));
            }

            var total = await query.CountAsync();
            var books = await query
                .OrderByDescending(b => b.PublishedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Isbn,
                    b.Price,
                    b.IsAvailable,
                    Author = b.Author.Name,
                    Categories = b.BookCategories.Select(bc => bc.Category.Name)
                })
                .ToListAsync();

            return Results.Ok(new { books, total, page, pageSize });
        });

        // GET single book
        group.MapGet("/{id}", async (int id, BookstoreDbContext db) =>
        {
            var book = await db.Books
                .Include(b => b.Author)
                .Include(b => b.BookCategories)
                    .ThenInclude(bc => bc.Category)
                .FirstOrDefaultAsync(b => b.Id == id);

            return book is null ? Results.NotFound() : Results.Ok(book);
        });

        // POST create book
        group.MapPost("/", async (CreateBookRequest request, BookstoreDbContext db) =>
        {
            var author = await db.Authors.FindAsync(request.AuthorId);
            if (author is null)
                return Results.BadRequest("Author not found");

            var book = new Book
            {
                Title = request.Title,
                Isbn = request.Isbn,
                Price = request.Price,
                PageCount = request.PageCount,
                PublishedDate = request.PublishedDate,
                AuthorId = request.AuthorId
            };

            db.Books.Add(book);
            await db.SaveChangesAsync();

            return Results.Created($"/api/books/{book.Id}", book);
        });

        // PUT update book
        group.MapPut("/{id}", async (int id, UpdateBookRequest request, BookstoreDbContext db) =>
        {
            var book = await db.Books.FindAsync(id);
            if (book is null)
                return Results.NotFound();

            if (request.Title is not null) book.Title = request.Title;
            if (request.Price.HasValue) book.Price = request.Price.Value;
            if (request.IsAvailable.HasValue) book.IsAvailable = request.IsAvailable.Value;

            await db.SaveChangesAsync();
            return Results.Ok(book);
        });

        // DELETE book
        group.MapDelete("/{id}", async (int id, BookstoreDbContext db) =>
        {
            var book = await db.Books.FindAsync(id);
            if (book is null)
                return Results.NotFound();

            db.Books.Remove(book);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

// Request DTOs
public record CreateBookRequest(
    string Title,
    string Isbn,
    decimal Price,
    int PageCount,
    DateTime PublishedDate,
    int AuthorId
);

public record UpdateBookRequest(
    string? Title,
    decimal? Price,
    bool? IsAvailable
);
```

Register the endpoints in Program.cs.

```csharp
app.MapBookEndpoints();
```

## Query Optimization

EF Core generates SQL behind the scenes. Here are some patterns for better performance.

```csharp
// Use AsNoTracking for read-only queries (skips change tracking overhead)
var books = await db.Books
    .AsNoTracking()
    .Where(b => b.IsAvailable)
    .ToListAsync();

// Project to DTOs instead of loading full entities
var summaries = await db.Books
    .Where(b => b.Price < 30)
    .Select(b => new { b.Title, b.Price, AuthorName = b.Author.Name })
    .ToListAsync();

// Use explicit loading when you need related data conditionally
var author = await db.Authors.FindAsync(1);
if (author is not null)
{
    await db.Entry(author).Collection(a => a.Books).LoadAsync();
}
```

## Connection Resilience

Azure SQL can have transient failures. The retry logic in the SQL Server provider handles this automatically, but you should also configure connection pool settings.

```csharp
builder.Services.AddDbContext<BookstoreDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null
        );
    })
);
```

## Best Practices

1. **Enable retry on failure.** Transient errors happen with cloud databases.
2. **Use AsNoTracking for reads.** It reduces memory usage and improves query performance.
3. **Project to DTOs.** Do not return full entities with navigation properties from your API.
4. **Use migrations in CI/CD.** Run `dotnet ef database update` as part of your deployment pipeline.
5. **Monitor generated SQL.** Enable logging to see what queries EF Core generates and optimize slow ones.
6. **Keep your DbContext scoped.** In ASP.NET Core, the default DI scope is per-request, which is correct for EF Core.

## Wrapping Up

Entity Framework Core with Azure SQL Database gives you a productive development experience. The strongly-typed models, LINQ queries, and automatic migrations let you iterate quickly. Azure SQL handles the database management. The key things to get right are connection resilience (retry on failure), query optimization (AsNoTracking, projections), and proper migration management. With these fundamentals in place, EF Core scales well from small APIs to large applications.
