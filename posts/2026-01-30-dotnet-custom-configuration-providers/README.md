# How to Create Custom Configuration Providers in .NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, .NET, Configuration, Architecture

Description: Build custom configuration providers in .NET to load settings from databases, remote APIs, or custom file formats with change notification support.

---

The .NET configuration system is flexible and extensible. While the built-in providers handle JSON, environment variables, and command-line arguments, real-world applications often need to pull configuration from databases, remote APIs, or proprietary file formats. This post walks through building custom configuration providers from scratch.

## Understanding the Configuration Architecture

The .NET configuration system consists of three main components:

| Component | Purpose | Interface |
|-----------|---------|-----------|
| Configuration Source | Factory that creates providers | `IConfigurationSource` |
| Configuration Provider | Loads and exposes key-value pairs | `IConfigurationProvider` |
| Configuration Builder | Orchestrates sources and builds the final configuration | `IConfigurationBuilder` |

When you call `builder.Build()`, each source creates its provider, and all providers are queried in order. Later providers override earlier ones with the same keys.

## The IConfigurationSource Interface

The configuration source is a factory. It has one job: create an instance of your provider.

```csharp
public interface IConfigurationSource
{
    IConfigurationProvider Build(IConfigurationBuilder builder);
}
```

Here is a minimal implementation:

```csharp
public class DatabaseConfigurationSource : IConfigurationSource
{
    public string ConnectionString { get; set; } = string.Empty;
    public string TableName { get; set; } = "AppConfiguration";
    public TimeSpan? ReloadInterval { get; set; }

    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new DatabaseConfigurationProvider(this);
    }
}
```

The source holds configuration options for the provider itself. This pattern keeps the provider focused on loading data while the source handles setup.

## The IConfigurationProvider Interface

The provider does the actual work of loading configuration data. You can implement `IConfigurationProvider` directly, but inheriting from `ConfigurationProvider` is easier.

```csharp
public abstract class ConfigurationProvider : IConfigurationProvider
{
    protected IDictionary<string, string?> Data { get; set; }

    public virtual void Load() { }

    public virtual bool TryGet(string key, out string? value);
    public virtual void Set(string key, string? value);
    public virtual IEnumerable<string> GetChildKeys(
        IEnumerable<string> earlierKeys,
        string? parentPath);
    public virtual IChangeToken GetReloadToken();
}
```

The base class manages the `Data` dictionary and handles key lookups. You just override `Load()` to populate the dictionary.

## Building a Database Configuration Provider

Let us build a provider that reads configuration from a SQL Server table. First, define the table structure:

```sql
CREATE TABLE AppConfiguration (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ConfigKey NVARCHAR(256) NOT NULL,
    ConfigValue NVARCHAR(MAX) NULL,
    IsEnabled BIT NOT NULL DEFAULT 1,
    LastModified DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_ConfigKey UNIQUE (ConfigKey)
);

-- Insert sample data
INSERT INTO AppConfiguration (ConfigKey, ConfigValue) VALUES
('Application:Name', 'MyApp'),
('Application:Version', '2.0.0'),
('Features:EnableCaching', 'true'),
('Features:CacheDuration', '3600'),
('Database:CommandTimeout', '30');
```

Now implement the provider:

```csharp
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;
using System.Collections.Concurrent;

public class DatabaseConfigurationProvider : ConfigurationProvider, IDisposable
{
    private readonly DatabaseConfigurationSource _source;
    private readonly CancellationTokenSource _cancellationTokenSource;
    private Task? _pollingTask;
    private bool _disposed;

    public DatabaseConfigurationProvider(DatabaseConfigurationSource source)
    {
        _source = source ?? throw new ArgumentNullException(nameof(source));
        _cancellationTokenSource = new CancellationTokenSource();
    }

    // Load is called once during startup
    public override void Load()
    {
        var data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        try
        {
            LoadFromDatabase(data);
            Data = data;

            // Start polling if interval is configured
            if (_source.ReloadInterval.HasValue && _pollingTask == null)
            {
                _pollingTask = PollForChangesAsync();
            }
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(
                $"Failed to load configuration from database table '{_source.TableName}'",
                ex);
        }
    }

    private void LoadFromDatabase(IDictionary<string, string?> data)
    {
        using var connection = new SqlConnection(_source.ConnectionString);
        connection.Open();

        var query = $@"
            SELECT ConfigKey, ConfigValue
            FROM {_source.TableName}
            WHERE IsEnabled = 1";

        using var command = new SqlCommand(query, connection);
        command.CommandTimeout = 30;

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var key = reader.GetString(0);
            var value = reader.IsDBNull(1) ? null : reader.GetString(1);
            data[key] = value;
        }
    }

    private async Task PollForChangesAsync()
    {
        while (!_cancellationTokenSource.Token.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_source.ReloadInterval!.Value, _cancellationTokenSource.Token);

                var newData = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
                LoadFromDatabase(newData);

                // Check if data actually changed
                if (!DataEquals(Data, newData))
                {
                    Data = newData;
                    OnReload(); // Triggers change notification
                }
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                // Log but continue polling
                Console.Error.WriteLine($"Error polling for config changes: {ex.Message}");
            }
        }
    }

    private static bool DataEquals(
        IDictionary<string, string?> first,
        IDictionary<string, string?> second)
    {
        if (first.Count != second.Count)
            return false;

        foreach (var kvp in first)
        {
            if (!second.TryGetValue(kvp.Key, out var value) || value != kvp.Value)
                return false;
        }
        return true;
    }

    public void Dispose()
    {
        if (_disposed) return;

        _cancellationTokenSource.Cancel();
        _cancellationTokenSource.Dispose();
        _disposed = true;
    }
}
```

## Creating Extension Methods for Clean Registration

Following the .NET convention, create extension methods for easy registration:

```csharp
public static class DatabaseConfigurationExtensions
{
    // Basic registration with connection string
    public static IConfigurationBuilder AddDatabaseConfiguration(
        this IConfigurationBuilder builder,
        string connectionString,
        string tableName = "AppConfiguration")
    {
        return builder.Add(new DatabaseConfigurationSource
        {
            ConnectionString = connectionString,
            TableName = tableName
        });
    }

    // Registration with action delegate for full configuration
    public static IConfigurationBuilder AddDatabaseConfiguration(
        this IConfigurationBuilder builder,
        Action<DatabaseConfigurationSource> configureSource)
    {
        var source = new DatabaseConfigurationSource();
        configureSource(source);
        return builder.Add(source);
    }

    // Registration with reload interval
    public static IConfigurationBuilder AddDatabaseConfiguration(
        this IConfigurationBuilder builder,
        string connectionString,
        TimeSpan reloadInterval)
    {
        return builder.Add(new DatabaseConfigurationSource
        {
            ConnectionString = connectionString,
            ReloadInterval = reloadInterval
        });
    }
}
```

Usage in your application:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add database configuration after appsettings.json
// Later providers override earlier ones
builder.Configuration.AddDatabaseConfiguration(
    connectionString: builder.Configuration.GetConnectionString("ConfigDb")!,
    reloadInterval: TimeSpan.FromMinutes(5));

var app = builder.Build();
```

## Implementing Change Tokens for Hot Reload

Change tokens notify the configuration system when data changes. The base `ConfigurationProvider` class handles this through `OnReload()`, but you can implement custom change notification for push-based updates.

Here is a provider that uses SQL Server Service Broker for real-time notifications:

```csharp
public class SqlDependencyConfigurationProvider : ConfigurationProvider, IDisposable
{
    private readonly SqlDependencyConfigurationSource _source;
    private ConfigurationReloadToken _reloadToken = new();
    private bool _disposed;

    public SqlDependencyConfigurationProvider(SqlDependencyConfigurationSource source)
    {
        _source = source;
        SqlDependency.Start(_source.ConnectionString);
    }

    public override void Load()
    {
        LoadDataWithDependency();
    }

    private void LoadDataWithDependency()
    {
        var data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        using var connection = new SqlConnection(_source.ConnectionString);
        connection.Open();

        // Query must meet SqlDependency requirements
        var query = @"
            SELECT ConfigKey, ConfigValue
            FROM dbo.AppConfiguration
            WHERE IsEnabled = 1";

        using var command = new SqlCommand(query, connection);

        // Create dependency before executing
        var dependency = new SqlDependency(command);
        dependency.OnChange += OnDependencyChange;

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var key = reader.GetString(0);
            var value = reader.IsDBNull(1) ? null : reader.GetString(1);
            data[key] = value;
        }

        Data = data;
    }

    private void OnDependencyChange(object sender, SqlNotificationEventArgs e)
    {
        if (e.Type == SqlNotificationType.Change)
        {
            // Reload data and set up new dependency
            LoadDataWithDependency();

            // Signal that configuration changed
            var previousToken = Interlocked.Exchange(
                ref _reloadToken,
                new ConfigurationReloadToken());
            previousToken.OnReload();
        }
    }

    public override IChangeToken GetReloadToken() => _reloadToken;

    public void Dispose()
    {
        if (_disposed) return;

        SqlDependency.Stop(_source.ConnectionString);
        _disposed = true;
    }
}
```

## Building a Remote API Configuration Provider

For microservices, you might need to fetch configuration from a central config server. Here is a provider that loads from an HTTP endpoint:

```csharp
public class RemoteConfigurationSource : IConfigurationSource
{
    public string Endpoint { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
    public TimeSpan? ReloadInterval { get; set; }
    public bool Optional { get; set; } = false;

    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new RemoteConfigurationProvider(this);
    }
}

public class RemoteConfigurationProvider : ConfigurationProvider, IDisposable
{
    private readonly RemoteConfigurationSource _source;
    private readonly HttpClient _httpClient;
    private readonly CancellationTokenSource _cts = new();
    private Task? _pollingTask;

    public RemoteConfigurationProvider(RemoteConfigurationSource source)
    {
        _source = source;
        _httpClient = new HttpClient
        {
            Timeout = source.Timeout
        };

        if (!string.IsNullOrEmpty(source.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Api-Key", source.ApiKey);
        }
    }

    public override void Load()
    {
        try
        {
            LoadAsync().GetAwaiter().GetResult();

            if (_source.ReloadInterval.HasValue && _pollingTask == null)
            {
                _pollingTask = PollForChangesAsync();
            }
        }
        catch (Exception ex) when (_source.Optional)
        {
            // Log warning but continue with empty config
            Console.Error.WriteLine($"Optional remote config failed: {ex.Message}");
            Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private async Task LoadAsync()
    {
        var response = await _httpClient.GetAsync(_source.Endpoint);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        // Parse JSON into flat key-value pairs
        using var document = JsonDocument.Parse(json);
        ParseElement(document.RootElement, string.Empty, data);

        Data = data;
    }

    private void ParseElement(
        JsonElement element,
        string prefix,
        IDictionary<string, string?> data)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    var key = string.IsNullOrEmpty(prefix)
                        ? property.Name
                        : $"{prefix}:{property.Name}";
                    ParseElement(property.Value, key, data);
                }
                break;

            case JsonValueKind.Array:
                var index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    var key = $"{prefix}:{index}";
                    ParseElement(item, key, data);
                    index++;
                }
                break;

            case JsonValueKind.Null:
                data[prefix] = null;
                break;

            default:
                data[prefix] = element.ToString();
                break;
        }
    }

    private async Task PollForChangesAsync()
    {
        while (!_cts.Token.IsCancellationRequested)
        {
            await Task.Delay(_source.ReloadInterval!.Value, _cts.Token);

            try
            {
                var previousData = Data;
                await LoadAsync();

                if (!DataEquals(previousData, Data))
                {
                    OnReload();
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Remote config reload failed: {ex.Message}");
            }
        }
    }

    private static bool DataEquals(
        IDictionary<string, string?> a,
        IDictionary<string, string?> b)
    {
        if (a.Count != b.Count) return false;

        foreach (var kvp in a)
        {
            if (!b.TryGetValue(kvp.Key, out var value) || value != kvp.Value)
                return false;
        }
        return true;
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();
        _httpClient.Dispose();
    }
}
```

## Configuration Binding to Strongly-Typed Classes

Once your provider loads data, you can bind it to classes using the options pattern:

```csharp
// Define your settings classes
public class ApplicationSettings
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
}

public class FeatureSettings
{
    public bool EnableCaching { get; set; }
    public int CacheDuration { get; set; }
    public List<string> EnabledFeatures { get; set; } = new();
}

public class DatabaseSettings
{
    public int CommandTimeout { get; set; } = 30;
    public int MaxRetryCount { get; set; } = 3;
    public string ConnectionString { get; set; } = string.Empty;
}
```

Register the options in your service configuration:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add your custom provider
builder.Configuration.AddDatabaseConfiguration(
    builder.Configuration.GetConnectionString("ConfigDb")!,
    reloadInterval: TimeSpan.FromMinutes(5));

// Bind configuration sections to classes
builder.Services.Configure<ApplicationSettings>(
    builder.Configuration.GetSection("Application"));

builder.Services.Configure<FeatureSettings>(
    builder.Configuration.GetSection("Features"));

// Use IOptionsMonitor for hot reload support
builder.Services.AddSingleton<IOptionsChangeTokenSource<FeatureSettings>>(
    sp => new ConfigurationChangeTokenSource<FeatureSettings>(
        Options.DefaultName,
        sp.GetRequiredService<IConfiguration>().GetSection("Features")));
```

Inject and use the settings in your services:

```csharp
public class CacheService
{
    private readonly IOptionsMonitor<FeatureSettings> _options;
    private readonly ILogger<CacheService> _logger;

    public CacheService(
        IOptionsMonitor<FeatureSettings> options,
        ILogger<CacheService> logger)
    {
        _options = options;
        _logger = logger;

        // React to configuration changes
        _options.OnChange(settings =>
        {
            _logger.LogInformation(
                "Feature settings changed. Caching enabled: {Enabled}",
                settings.EnableCaching);
        });
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory)
    {
        var settings = _options.CurrentValue;

        if (!settings.EnableCaching)
        {
            return await factory();
        }

        // Cache implementation with configurable duration
        var duration = TimeSpan.FromSeconds(settings.CacheDuration);
        // ... cache logic
    }
}
```

## Provider Ordering and Precedence

Configuration providers are applied in registration order. Later providers override values from earlier ones with the same key.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Default order in ASP.NET Core:
// 1. appsettings.json
// 2. appsettings.{Environment}.json
// 3. User secrets (Development only)
// 4. Environment variables
// 5. Command-line arguments

// Add your custom providers at the right position
builder.Configuration.Sources.Clear(); // Start fresh if needed

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddDatabaseConfiguration(connectionString, reloadInterval: TimeSpan.FromMinutes(5))
    .AddEnvironmentVariables()  // Environment vars override database
    .AddCommandLine(args);      // Command line has highest priority
```

Common ordering patterns:

| Scenario | Recommended Order |
|----------|-------------------|
| Database as override | JSON, Environment, Database, Command-line |
| Database as defaults | Database, JSON, Environment, Command-line |
| Remote config server | JSON, Remote, Environment, Command-line |
| Feature flags | JSON, Environment, Feature Flag Service |

## Testing Your Configuration Provider

Write unit tests to verify your provider works correctly:

```csharp
public class DatabaseConfigurationProviderTests
{
    [Fact]
    public void Load_ReturnsConfigurationFromDatabase()
    {
        // Arrange - use test container or in-memory database
        var source = new DatabaseConfigurationSource
        {
            ConnectionString = GetTestConnectionString(),
            TableName = "TestConfiguration"
        };

        SeedTestData(source.ConnectionString);
        var provider = new DatabaseConfigurationProvider(source);

        // Act
        provider.Load();

        // Assert
        Assert.True(provider.TryGet("Application:Name", out var name));
        Assert.Equal("TestApp", name);
    }

    [Fact]
    public void Load_HandlesEmptyTable()
    {
        // Arrange
        var source = new DatabaseConfigurationSource
        {
            ConnectionString = GetTestConnectionString(),
            TableName = "EmptyConfiguration"
        };

        var provider = new DatabaseConfigurationProvider(source);

        // Act
        provider.Load();

        // Assert
        Assert.False(provider.TryGet("AnyKey", out _));
    }

    [Fact]
    public async Task Reload_NotifiesOnChange()
    {
        // Arrange
        var source = new DatabaseConfigurationSource
        {
            ConnectionString = GetTestConnectionString(),
            TableName = "TestConfiguration",
            ReloadInterval = TimeSpan.FromMilliseconds(100)
        };

        var provider = new DatabaseConfigurationProvider(source);
        provider.Load();

        var changeNotified = false;
        var token = provider.GetReloadToken();
        token.RegisterChangeCallback(_ => changeNotified = true, null);

        // Act - modify database
        UpdateConfigValue(source.ConnectionString, "Application:Name", "UpdatedApp");
        await Task.Delay(200);

        // Assert
        Assert.True(changeNotified);
        Assert.True(provider.TryGet("Application:Name", out var name));
        Assert.Equal("UpdatedApp", name);
    }
}
```

## Integration Tests with WebApplicationFactory

Test the full configuration pipeline in integration tests:

```csharp
public class ConfigurationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ConfigurationIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.Sources.Clear();
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Application:Name"] = "TestApp",
                    ["Features:EnableCaching"] = "true"
                });
            });
        });
    }

    [Fact]
    public void Configuration_BindsCorrectly()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var options = scope.ServiceProvider
            .GetRequiredService<IOptions<ApplicationSettings>>();

        // Assert
        Assert.Equal("TestApp", options.Value.Name);
    }
}
```

## Error Handling Best Practices

Configuration failures at startup can crash your application. Handle errors gracefully:

```csharp
public class ResilientDatabaseConfigurationProvider : ConfigurationProvider
{
    private readonly DatabaseConfigurationSource _source;
    private readonly int _maxRetries = 3;
    private readonly TimeSpan _retryDelay = TimeSpan.FromSeconds(2);

    public override void Load()
    {
        var data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _maxRetries; attempt++)
        {
            try
            {
                LoadFromDatabase(data);
                Data = data;
                return;
            }
            catch (SqlException ex)
            {
                lastException = ex;

                if (attempt < _maxRetries)
                {
                    Console.Error.WriteLine(
                        $"Database config load attempt {attempt} failed. Retrying...");
                    Thread.Sleep(_retryDelay);
                }
            }
        }

        // All retries failed
        if (_source.Optional)
        {
            Console.Error.WriteLine(
                $"Optional database config unavailable after {_maxRetries} attempts");
            Data = data; // Use empty config
        }
        else
        {
            throw new InvalidOperationException(
                $"Failed to load required database configuration after {_maxRetries} attempts",
                lastException);
        }
    }
}
```

## Summary

Custom configuration providers extend .NET's configuration system to load settings from any source. The key points to remember:

1. Implement `IConfigurationSource` as a factory that creates your provider
2. Inherit from `ConfigurationProvider` and override `Load()` to populate the `Data` dictionary
3. Call `OnReload()` when configuration changes to notify consumers
4. Use extension methods for clean registration
5. Pay attention to provider ordering since later providers override earlier ones
6. Use `IOptionsMonitor<T>` when you need hot reload support
7. Handle errors gracefully, especially for remote configuration sources

The patterns shown here work for databases, remote APIs, custom file formats, or any other configuration source. Start with the database provider as a template and adapt it to your needs.
