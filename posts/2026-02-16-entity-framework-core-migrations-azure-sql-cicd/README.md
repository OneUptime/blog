# How to Use Entity Framework Core Migrations with Azure SQL in a CI/CD Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Entity Framework Core, Azure SQL, CI/CD, Migrations, .NET, DevOps, Database

Description: Automate Entity Framework Core database migrations with Azure SQL Database in a CI/CD pipeline for safe and repeatable deployments.

---

Running database migrations manually is a recipe for trouble. Someone forgets to apply a migration, someone applies them out of order, or someone runs a migration against the wrong database. Automating migrations in your CI/CD pipeline eliminates these problems. Every deployment includes the exact migrations needed, applied in the right order, against the right database. Entity Framework Core has solid migration tooling, and with a bit of pipeline configuration, you can run those migrations as part of your deployment to Azure SQL Database.

This guide covers generating migrations, creating migration bundles, and integrating them into GitHub Actions and Azure DevOps pipelines.

## Prerequisites

- .NET 8 SDK
- An Azure SQL Database
- Azure CLI
- Git and GitHub or Azure DevOps
- Basic EF Core knowledge

## Setting Up the Project

Create a .NET Web API project with Entity Framework Core:

```bash
# Create the solution and project
dotnet new webapi -n MigrationDemo
cd MigrationDemo

# Add EF Core packages
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

Define your data model:

```csharp
// Models/Product.cs - Product entity
namespace MigrationDemo.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

Create the DbContext:

```csharp
// Data/AppDbContext.cs - Database context
using Microsoft.EntityFrameworkCore;
using MigrationDemo.Models;

namespace MigrationDemo.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure the Product table
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Price)
                .HasPrecision(18, 2);

            entity.Property(e => e.Category)
                .IsRequired()
                .HasMaxLength(100);

            // Add indexes for common query patterns
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Name);
        });
    }
}
```

Configure the database connection in `Program.cs`:

```csharp
// Program.cs - Configure services
using Microsoft.EntityFrameworkCore;
using MigrationDemo.Data;

var builder = WebApplication.CreateBuilder(args);

// Add the DbContext with Azure SQL connection
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            // Enable retry logic for transient Azure SQL errors
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        }));

builder.Services.AddControllers();
var app = builder.Build();

app.MapControllers();
app.Run();
```

## Creating Migrations

Generate the initial migration:

```bash
# Create the first migration
dotnet ef migrations add InitialCreate

# Review the generated SQL before applying
dotnet ef migrations script --idempotent -o migrations.sql
```

The `--idempotent` flag generates SQL that checks which migrations have already been applied, making it safe to run multiple times. This is important for CI/CD pipelines where you want the script to work regardless of the current database state.

## Migration Bundles

EF Core migration bundles are self-contained executables that apply migrations. They are perfect for CI/CD because they do not require the .NET SDK or EF tools on the deployment agent:

```bash
# Create a migration bundle
dotnet ef migrations bundle --self-contained --target-runtime linux-x64 -o efbundle
```

This creates an executable that you can run against any database:

```bash
# Apply migrations using the bundle
./efbundle --connection "Server=your-server.database.windows.net;Database=MigrationDemo;User Id=admin;Password=pass;Encrypt=True;"
```

## GitHub Actions Pipeline

Here is a complete GitHub Actions workflow that builds the application, creates a migration bundle, and applies it to Azure SQL:

```yaml
# .github/workflows/deploy.yml - CI/CD with EF Core migrations
name: Build and Deploy with Migrations

on:
  push:
    branches: [main]

env:
  DOTNET_VERSION: '8.0.x'
  AZURE_SQL_CONNECTION: ${{ secrets.AZURE_SQL_CONNECTION_STRING }}

jobs:
  build-and-migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Install EF Core tools
        run: dotnet tool install --global dotnet-ef

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --configuration Release --no-restore

      - name: Run tests
        run: dotnet test --no-build --configuration Release

      # Generate the migration bundle
      - name: Create migration bundle
        run: |
          dotnet ef migrations bundle \
            --project MigrationDemo \
            --self-contained \
            --target-runtime linux-x64 \
            --configuration Release \
            -o efbundle
          chmod +x efbundle

      # Generate idempotent SQL script as backup
      - name: Generate migration script
        run: |
          dotnet ef migrations script \
            --project MigrationDemo \
            --idempotent \
            --configuration Release \
            -o migrations.sql

      # Apply migrations to Azure SQL
      - name: Apply migrations
        run: |
          ./efbundle --connection "${{ env.AZURE_SQL_CONNECTION }}"

      # Deploy the application
      - name: Publish application
        run: dotnet publish --configuration Release --output ./publish

      - name: Deploy to Azure
        uses: azure/webapps-deploy@v3
        with:
          app-name: migration-demo-app
          package: ./publish
```

## Azure DevOps Pipeline

The same concept works in Azure DevOps:

```yaml
# azure-pipelines.yml - Azure DevOps pipeline with migrations
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'
  dotnetVersion: '8.0.x'

stages:
  - stage: Build
    displayName: 'Build and Test'
    jobs:
      - job: BuildJob
        steps:
          - task: UseDotNet@2
            inputs:
              version: $(dotnetVersion)

          - script: dotnet restore
            displayName: 'Restore packages'

          - script: dotnet build --configuration $(buildConfiguration)
            displayName: 'Build solution'

          - script: dotnet test --configuration $(buildConfiguration) --no-build
            displayName: 'Run tests'

          # Create the migration bundle artifact
          - script: |
              dotnet tool install --global dotnet-ef
              dotnet ef migrations bundle --self-contained --target-runtime linux-x64 --configuration $(buildConfiguration) -o $(Build.ArtifactStagingDirectory)/efbundle
              chmod +x $(Build.ArtifactStagingDirectory)/efbundle
            displayName: 'Create migration bundle'

          - script: dotnet publish --configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)/app
            displayName: 'Publish application'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: $(Build.ArtifactStagingDirectory)
              ArtifactName: 'drop'

  - stage: Deploy
    displayName: 'Deploy to Azure'
    dependsOn: Build
    jobs:
      - deployment: DeployJob
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                # Apply migrations before deploying the app
                - script: |
                    chmod +x $(Pipeline.Workspace)/drop/efbundle
                    $(Pipeline.Workspace)/drop/efbundle --connection "$(AzureSqlConnectionString)"
                  displayName: 'Apply database migrations'

                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'your-service-connection'
                    appName: 'migration-demo-app'
                    package: '$(Pipeline.Workspace)/drop/app'
```

## Safe Migration Practices

A few rules that prevent migration disasters:

Never delete a migration that has been applied to any shared environment. If you need to undo changes, create a new migration that reverses them.

Always generate and review the SQL script before applying migrations to production:

```bash
# Generate the SQL to review before deploying
dotnet ef migrations script --idempotent
```

For breaking changes like renaming columns, use a multi-step approach: first add the new column, deploy the application to use both, then remove the old column in a later migration. This avoids downtime when the old application code is still running during deployment.

## Rollback Strategy

EF Core does not have a built-in rollback mechanism for production, but you can create one:

```bash
# Generate a script to revert to a specific migration
dotnet ef migrations script CurrentMigration PreviousMigration -o rollback.sql
```

Keep this rollback script alongside your deployment artifacts so you can quickly revert if something goes wrong.

## Wrapping Up

Automating EF Core migrations in your CI/CD pipeline removes human error from database deployments. Migration bundles are self-contained and do not require the .NET SDK on your deployment agents. Idempotent scripts provide a safety net since they can be run multiple times without side effects. The combination of automated migrations with code deployments means your database schema and application code are always in sync, which eliminates an entire class of deployment failures.
