# How to Implement GraphQL APIs with Hot Chocolate in ASP.NET Core on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, GraphQL, Hot Chocolate, ASP.NET Core, C#, App Service, API

Description: Build a GraphQL API using Hot Chocolate in ASP.NET Core with queries, mutations, subscriptions, and deploy it to Azure App Service.

---

REST APIs work well for most scenarios, but when your frontend needs to fetch data from multiple related resources in a single request, or when different clients need different subsets of data, GraphQL is a better fit. Hot Chocolate is the most popular GraphQL server for .NET. It integrates deeply with ASP.NET Core and supports the full GraphQL specification including queries, mutations, subscriptions, and schema stitching.

In this post, I will build a GraphQL API with Hot Chocolate, deploy it to Azure App Service, and cover the patterns you will use most often.

## Setting Up

Create an ASP.NET Core project and add Hot Chocolate.

```bash
dotnet new web -n GraphQLBookstore
cd GraphQLBookstore

# Add Hot Chocolate packages
dotnet add package HotChocolate.AspNetCore
dotnet add package HotChocolate.Data
dotnet add package HotChocolate.Data.EntityFramework
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
```

## Defining the Data Model

Start with EF Core models for a bookstore.

```csharp
// Models/Author.cs
public class Author
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Biography { get; set; }
    public DateTime BornDate { get; set; }

    public ICollection<Book> Books { get; set; } = new List<Book>();
}

// Models/Book.cs
public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Pages { get; set; }
    public DateTime PublishedDate { get; set; }
    public string Genre { get; set; } = string.Empty;

    public int AuthorId { get; set; }
    public Author Author { get; set; } = null!;

    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}

// Models/Review.cs
public class Review
{
    public int Id { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int Rating { get; set; }  // 1-5
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
}
```

## Setting Up the DbContext

```csharp
// Data/BookstoreContext.cs
using Microsoft.EntityFrameworkCore;

public class BookstoreContext : DbContext
{
    public BookstoreContext(DbContextOptions<BookstoreContext> options)
        : base(options) { }

    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>()
            .Property(b => b.Price)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Book>()
            .HasIndex(b => b.Isbn)
            .IsUnique();

        // Seed some data
        modelBuilder.Entity<Author>().HasData(
            new Author { Id = 1, Name = "Robert C. Martin", BornDate = new DateTime(1952, 12, 5) },
            new Author { Id = 2, Name = "Martin Fowler", BornDate = new DateTime(1963, 12, 18) }
        );

        modelBuilder.Entity<Book>().HasData(
            new Book { Id = 1, Title = "Clean Code", Isbn = "978-0132350884", Price = 39.99m, Pages = 464, PublishedDate = new DateTime(2008, 8, 1), Genre = "Technical", AuthorId = 1 },
            new Book { Id = 2, Title = "Refactoring", Isbn = "978-0134757599", Price = 49.99m, Pages = 448, PublishedDate = new DateTime(2018, 11, 20), Genre = "Technical", AuthorId = 2 }
        );
    }
}
```

## Defining the GraphQL Query

Hot Chocolate uses C# classes to define the schema. Each public method on a query type becomes a field in the GraphQL schema.

```csharp
// GraphQL/Query.cs
using HotChocolate.Data;
using Microsoft.EntityFrameworkCore;

public class Query
{
    /// <summary>
    /// Get all books with filtering, sorting, and pagination.
    /// The [UseDbContext] attribute manages the DbContext lifecycle.
    /// [UseFiltering] and [UseSorting] add automatic filter and sort capabilities.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Book> GetBooks([ScopedService] BookstoreContext context)
    {
        return context.Books.Include(b => b.Author);
    }

    /// <summary>
    /// Get a single book by ID.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    public async Task<Book?> GetBookById(
        [ScopedService] BookstoreContext context,
        int id)
    {
        return await context.Books
            .Include(b => b.Author)
            .Include(b => b.Reviews)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    /// <summary>
    /// Get all authors.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Author> GetAuthors([ScopedService] BookstoreContext context)
    {
        return context.Authors;
    }

    /// <summary>
    /// Get a single author by ID with their books.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    public async Task<Author?> GetAuthorById(
        [ScopedService] BookstoreContext context,
        int id)
    {
        return await context.Authors
            .Include(a => a.Books)
            .FirstOrDefaultAsync(a => a.Id == id);
    }
}
```

## Defining Mutations

Mutations handle create, update, and delete operations.

```csharp
// GraphQL/Mutation.cs
using Microsoft.EntityFrameworkCore;

public class Mutation
{
    /// <summary>
    /// Add a new book to the catalog.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    public async Task<Book> AddBook(
        [ScopedService] BookstoreContext context,
        AddBookInput input)
    {
        var author = await context.Authors.FindAsync(input.AuthorId);
        if (author == null)
        {
            throw new GraphQLException("Author not found");
        }

        var book = new Book
        {
            Title = input.Title,
            Isbn = input.Isbn,
            Price = input.Price,
            Pages = input.Pages,
            PublishedDate = input.PublishedDate,
            Genre = input.Genre,
            AuthorId = input.AuthorId
        };

        context.Books.Add(book);
        await context.SaveChangesAsync();

        return book;
    }

    /// <summary>
    /// Add a review for a book.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    public async Task<Review> AddReview(
        [ScopedService] BookstoreContext context,
        AddReviewInput input)
    {
        var book = await context.Books.FindAsync(input.BookId);
        if (book == null)
        {
            throw new GraphQLException("Book not found");
        }

        if (input.Rating < 1 || input.Rating > 5)
        {
            throw new GraphQLException("Rating must be between 1 and 5");
        }

        var review = new Review
        {
            BookId = input.BookId,
            ReviewerName = input.ReviewerName,
            Content = input.Content,
            Rating = input.Rating
        };

        context.Reviews.Add(review);
        await context.SaveChangesAsync();

        return review;
    }

    /// <summary>
    /// Update a book's price.
    /// </summary>
    [UseDbContext(typeof(BookstoreContext))]
    public async Task<Book> UpdateBookPrice(
        [ScopedService] BookstoreContext context,
        int bookId,
        decimal newPrice)
    {
        var book = await context.Books.FindAsync(bookId)
            ?? throw new GraphQLException("Book not found");

        book.Price = newPrice;
        await context.SaveChangesAsync();

        return book;
    }
}

// Input types for mutations
public record AddBookInput(
    string Title,
    string Isbn,
    decimal Price,
    int Pages,
    DateTime PublishedDate,
    string Genre,
    int AuthorId
);

public record AddReviewInput(
    int BookId,
    string ReviewerName,
    string Content,
    int Rating
);
```

## Configuring the GraphQL Server

Wire everything together in Program.cs.

```csharp
// Program.cs
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register DbContext
builder.Services.AddPooledDbContextFactory<BookstoreContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("BookstoreDb"),
        sql => sql.EnableRetryOnFailure(5)
    )
);

// Register Hot Chocolate GraphQL server
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddFiltering()
    .AddSorting()
    .AddProjections();

var app = builder.Build();

// Map the GraphQL endpoint
app.MapGraphQL();

// Redirect root to the Banana Cake Pop IDE (built-in GraphQL explorer)
app.MapGet("/", () => Results.Redirect("/graphql"));

app.Run();
```

## Running and Testing

Start the application and open the Banana Cake Pop IDE at `/graphql`.

```bash
dotnet run
# Open https://localhost:5001/graphql in your browser
```

Here are some example queries you can run in the IDE.

```graphql
# Query all books with their authors
query {
  books {
    title
    isbn
    price
    genre
    author {
      name
    }
  }
}

# Get a specific book with reviews
query {
  bookById(id: 1) {
    title
    price
    reviews {
      reviewerName
      rating
      content
    }
  }
}

# Filter books by genre and sort by price
query {
  books(
    where: { genre: { eq: "Technical" } }
    order: { price: ASC }
  ) {
    title
    price
  }
}

# Create a new book
mutation {
  addBook(input: {
    title: "The Pragmatic Programmer"
    isbn: "978-0135957059"
    price: 49.99
    pages: 352
    publishedDate: "2019-09-13"
    genre: "Technical"
    authorId: 1
  }) {
    id
    title
    price
  }
}

# Add a review
mutation {
  addReview(input: {
    bookId: 1
    reviewerName: "Alice"
    content: "Essential reading for any developer"
    rating: 5
  }) {
    id
    rating
  }
}
```

## Deploying to Azure App Service

```bash
# Create resources
az group create --name graphql-rg --location eastus

az appservice plan create \
    --name graphql-plan \
    --resource-group graphql-rg \
    --is-linux \
    --sku B1

az webapp create \
    --name my-graphql-api \
    --resource-group graphql-rg \
    --plan graphql-plan \
    --runtime "DOTNET|8.0"

# Set the connection string
az webapp config connection-string set \
    --name my-graphql-api \
    --resource-group graphql-rg \
    --connection-string-type SQLAzure \
    --settings BookstoreDb="Server=my-sql-server.database.windows.net;Database=bookstore;User Id=sqladmin;Password=YourP@ss!;Encrypt=True;"

# Deploy
dotnet publish -c Release -o ./publish
cd publish && zip -r ../deploy.zip . && cd ..
az webapp deployment source config-zip \
    --name my-graphql-api \
    --resource-group graphql-rg \
    --src deploy.zip
```

## Securing the GraphQL Endpoint

In production, you probably want to disable the Banana Cake Pop IDE and add authentication.

```csharp
// Program.cs - production configuration
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddFiltering()
    .AddSorting()
    .AddAuthorization();

// Disable the IDE in production
if (!app.Environment.IsDevelopment())
{
    app.MapGraphQL().WithOptions(new GraphQLServerOptions
    {
        Tool = { Enable = false }
    });
}
```

## Performance: DataLoader

When querying lists of books, each book might trigger a separate query for its author. DataLoader solves this N+1 problem by batching lookups.

```csharp
// GraphQL/AuthorDataLoader.cs
public class AuthorBatchDataLoader : BatchDataLoader<int, Author>
{
    private readonly IDbContextFactory<BookstoreContext> _contextFactory;

    public AuthorBatchDataLoader(
        IDbContextFactory<BookstoreContext> contextFactory,
        IBatchScheduler batchScheduler,
        DataLoaderOptions? options = null)
        : base(batchScheduler, options)
    {
        _contextFactory = contextFactory;
    }

    protected override async Task<IReadOnlyDictionary<int, Author>> LoadBatchAsync(
        IReadOnlyList<int> keys, CancellationToken cancellationToken)
    {
        await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

        // Single query for all requested authors
        return await context.Authors
            .Where(a => keys.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, cancellationToken);
    }
}
```

## Best Practices

1. **Use filtering and sorting.** Hot Chocolate generates them from your models, saving you manual work.
2. **Implement DataLoaders.** They prevent the N+1 query problem that plagues naive GraphQL implementations.
3. **Use input types for mutations.** They make the schema cleaner and easier to evolve.
4. **Validate inputs in mutations.** Throw GraphQLException with clear messages.
5. **Disable introspection in production** if your API is not public.
6. **Set query depth and complexity limits** to prevent abuse.

## Wrapping Up

Hot Chocolate gives you a full-featured GraphQL server on ASP.NET Core with minimal configuration. The code-first approach using C# classes feels natural to .NET developers, and the built-in filtering, sorting, and pagination support saves significant development time. Deploying to Azure App Service is the same as any ASP.NET Core application, and the Banana Cake Pop IDE makes development and testing interactive.
