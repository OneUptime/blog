# How to Test Dapr Configuration Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Testing, Feature Flag, Hot Reload

Description: Learn how to test Dapr Configuration API subscriptions and verify that your service reacts correctly to configuration key changes at runtime.

---

## Dapr Configuration API Overview

The Dapr Configuration API provides a way to read and subscribe to configuration values from external stores (Redis, Kubernetes ConfigMaps). When a value changes, Dapr pushes the update to your service via a subscription. Testing this involves verifying both the initial read and the reaction to updates.

## Service That Uses Configuration

```csharp
// FeatureFlagService.cs
public class FeatureFlagService : IHostedService
{
    private readonly DaprClient _daprClient;
    private readonly IConfiguration _config;
    private readonly ILogger<FeatureFlagService> _logger;
    private Dictionary<string, string> _flags = new();
    private string? _subscriptionId;
    private CancellationTokenSource? _cts;

    public FeatureFlagService(
        DaprClient daprClient,
        IConfiguration config,
        ILogger<FeatureFlagService> logger)
    {
        _daprClient = daprClient;
        _config     = config;
        _logger     = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // Read initial values
        var items = await _daprClient.GetConfiguration(
            "configstore",
            new[] { "feature-new-checkout", "feature-dark-mode" },
            cancellationToken: cancellationToken);

        foreach (var (key, item) in items.Items)
        {
            _flags[key] = item.Value;
        }

        // Subscribe to changes
        _cts = new CancellationTokenSource();
        var subscription = await _daprClient.SubscribeConfiguration(
            "configstore",
            new[] { "feature-new-checkout", "feature-dark-mode" },
            cancellationToken: _cts.Token);

        _subscriptionId = subscription.Id;

        // Process updates in background
        _ = Task.Run(async () =>
        {
            await foreach (var changes in subscription.Source
                .WithCancellation(_cts.Token))
            {
                foreach (var (key, item) in changes)
                {
                    _logger.LogInformation(
                        "Config changed: {Key} = {Value}", key, item.Value);
                    _flags[key] = item.Value;
                }
            }
        });
    }

    public bool IsEnabled(string flagName)
    {
        return _flags.TryGetValue(flagName, out var value)
            && value.Equals("true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        if (_subscriptionId != null)
        {
            await _daprClient.UnsubscribeConfiguration(
                "configstore", _subscriptionId, cancellationToken);
        }
    }
}
```

## Unit Tests

```csharp
// FeatureFlagServiceTests.cs
public class FeatureFlagServiceTests
{
    private readonly Mock<DaprClient> _mockDapr;
    private readonly FeatureFlagService _service;

    public FeatureFlagServiceTests()
    {
        _mockDapr = new Mock<DaprClient>();
        _service  = new FeatureFlagService(
            _mockDapr.Object,
            Mock.Of<IConfiguration>(),
            Mock.Of<ILogger<FeatureFlagService>>());
    }

    [Fact]
    public async Task StartAsync_LoadsInitialFlags()
    {
        _mockDapr
            .Setup(d => d.GetConfiguration(
                "configstore",
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GetConfigurationResponse(
                new Dictionary<string, ConfigurationItem>
                {
                    ["feature-new-checkout"] = new ConfigurationItem("true", "1", null),
                    ["feature-dark-mode"]    = new ConfigurationItem("false", "1", null)
                }));

        _mockDapr
            .Setup(d => d.SubscribeConfiguration(
                It.IsAny<string>(),
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SubscribeConfigurationResponse(
                new EmptyConfigurationSource("sub-1")));

        await _service.StartAsync(default);

        Assert.True(_service.IsEnabled("feature-new-checkout"));
        Assert.False(_service.IsEnabled("feature-dark-mode"));
    }

    private class EmptyConfigurationSource : ConfigurationSource
    {
        private readonly string _id;
        public EmptyConfigurationSource(string id) => _id = id;
        public override string Id => _id;
        public override async IAsyncEnumerator<IDictionary<string, ConfigurationItem>>
            GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            await Task.CompletedTask;
            yield break;
        }
    }
}
```

## Integration Test: Verify Config Update Response

```bash
# Update a config value in Redis (Dapr config store)
redis-cli set feature-new-checkout "false"
```

```csharp
[Fact]
[Trait("Category", "Integration")]
public async Task ConfigChange_UpdatesFeatureFlag()
{
    // Initially enabled
    Assert.True(_service.IsEnabled("feature-new-checkout"));

    // Simulate a change via Redis CLI or Dapr HTTP API
    await _redisDb.StringSetAsync(
        "feature-new-checkout", "false");

    // Wait for subscription update
    await Task.Delay(1000);

    Assert.False(_service.IsEnabled("feature-new-checkout"));
}
```

## Summary

Testing Dapr Configuration changes involves two phases: verifying that `GetConfiguration` loads initial values correctly (unit test with mocks), and verifying that your subscription handler reacts to runtime changes (integration test with real Redis). Mock the full configuration response including version strings, and use brief delays in integration tests to allow subscription callbacks to fire after value updates.
