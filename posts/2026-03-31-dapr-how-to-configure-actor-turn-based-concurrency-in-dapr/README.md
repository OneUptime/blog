# How to Configure Actor Turn-Based Concurrency in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Concurrency, Virtual Actor, Microservice, Distributed System

Description: Learn how Dapr actors enforce turn-based concurrency, how to configure it, and how to design actor methods to avoid deadlocks and maximize throughput.

---

Dapr's virtual actor model guarantees that only one method executes on an actor instance at a time. This turn-based concurrency eliminates race conditions on actor state without explicit locking in application code - but it also means that slow actor methods, improper re-entrancy, and call chains can lead to bottlenecks or deadlocks. Understanding and correctly configuring turn-based concurrency is essential for building high-throughput actor-based systems.

## What Turn-Based Concurrency Means

When multiple callers invoke methods on the same actor instance simultaneously, Dapr queues those calls and processes them one at a time (one "turn" per method call). The actor is guaranteed:

- Only one method body executes at a time per instance
- State reads and writes within a method are linearizable
- No explicit mutexes or locks needed in application code

```text
Caller A --> |------ Method1 ------| 
Caller B -->                        |------ Method2 ------|
Caller C -->                                               |------ Method3 ----|
                    (sequential, not parallel)
```

This differs from standard object-oriented concurrency where multiple threads can enter different methods simultaneously.

## Enabling Actor Reentrancy

By default, if an actor calls another actor (or itself) and that call comes back to the same actor, it deadlocks because the actor is already "in a turn." Actor reentrancy allows a call chain to re-enter the same actor within the same logical turn.

Configure reentrancy in the actor host settings:

```csharp
// Program.cs
using Dapr.Actors.Runtime;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddActors(options =>
{
    options.ReentrancyConfig = new ActorReentrancyConfig
    {
        Enabled = true,
        MaxStackDepth = 32  // Prevent infinite recursion
    };
    
    options.Actors.RegisterActor<BankAccountActor>();
    options.Actors.RegisterActor<TransferCoordinatorActor>();
});

var app = builder.Build();
app.MapActorsHandlers();
app.Run();
```

## Implementing a Thread-Safe Actor

Because turn-based concurrency serializes method calls, you can safely read and write state without locks:

```csharp
// Actors/BankAccountActor.cs
using Dapr.Actors.Runtime;

public interface IBankAccountActor : IActor
{
    Task<decimal> GetBalanceAsync();
    Task DepositAsync(decimal amount);
    Task<bool> WithdrawAsync(decimal amount);
    Task<bool> TransferAsync(string targetAccountId, decimal amount);
}

[Actor(TypeName = "BankAccount")]
public class BankAccountActor : Actor, IBankAccountActor
{
    private const string BalanceKey = "balance";

    public BankAccountActor(ActorHost host) : base(host) { }

    protected override async Task OnActivateAsync()
    {
        // Initialize balance if this actor is new
        var exists = await StateManager.ContainsStateAsync(BalanceKey);
        if (!exists)
        {
            await StateManager.SetStateAsync(BalanceKey, 0m);
        }
    }

    public async Task<decimal> GetBalanceAsync()
    {
        return await StateManager.GetStateAsync<decimal>(BalanceKey);
    }

    public async Task DepositAsync(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Deposit amount must be positive");
        
        // Safe to read-modify-write - no other call can interleave here
        var balance = await StateManager.GetStateAsync<decimal>(BalanceKey);
        balance += amount;
        await StateManager.SetStateAsync(BalanceKey, balance);
        
        Logger.LogInformation("Deposited {Amount}. New balance: {Balance}", amount, balance);
    }

    public async Task<bool> WithdrawAsync(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Withdrawal amount must be positive");
        
        var balance = await StateManager.GetStateAsync<decimal>(BalanceKey);
        
        if (balance < amount)
        {
            Logger.LogWarning("Insufficient funds. Balance: {Balance}, Requested: {Amount}", balance, amount);
            return false;
        }
        
        balance -= amount;
        await StateManager.SetStateAsync(BalanceKey, balance);
        return true;
    }

    public async Task<bool> TransferAsync(string targetAccountId, decimal amount)
    {
        // Deduct from this account
        var success = await WithdrawAsync(amount);
        if (!success) return false;

        // Credit target account via actor proxy
        // With reentrancy enabled, this won't deadlock
        var targetProxy = ProxyFactory.CreateActorProxy<IBankAccountActor>(
            new ActorId(targetAccountId),
            "BankAccount");

        await targetProxy.DepositAsync(amount);
        return true;
    }
}
```

## Configuring Actor Method Timeouts

Long-running actor methods block the turn queue. Configure method-level timeouts to prevent a slow method from starving other callers:

```yaml
# components/actorconfig.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  features:
  - name: ActorStateTTL
    enabled: true
  metric:
    enabled: true
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

At the host level, set actor method timeout:

```csharp
builder.Services.AddActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(60);
    options.ActorScanInterval = TimeSpan.FromSeconds(30);
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(60);
    options.DrainRebalancedActors = true;
    
    options.ReentrancyConfig = new ActorReentrancyConfig
    {
        Enabled = true,
        MaxStackDepth = 32
    };
    
    options.Actors.RegisterActor<BankAccountActor>();
});
```

## Testing Concurrent Actor Calls

Write tests that verify turn-based behavior:

```csharp
// Tests/BankAccountActorTests.cs
using Dapr.Actors;
using Dapr.Actors.Client;

public class BankAccountActorConcurrencyTests
{
    [Fact]
    public async Task ConcurrentDeposits_ShouldNotLoseUpdates()
    {
        var actorId = new ActorId("test-account-" + Guid.NewGuid().ToString("N")[..8]);
        var proxy = ActorProxy.Create<IBankAccountActor>(actorId, "BankAccount");

        // Seed with initial balance
        await proxy.DepositAsync(100m);

        // Fire 10 concurrent deposits
        var tasks = Enumerable.Range(0, 10)
            .Select(_ => proxy.DepositAsync(10m))
            .ToList();

        await Task.WhenAll(tasks);

        var finalBalance = await proxy.GetBalanceAsync();

        // Turn-based concurrency ensures all deposits are applied
        Assert.Equal(200m, finalBalance); // 100 + 10*10
    }

    [Fact]
    public async Task ConcurrentWithdrawals_ShouldRespectBalance()
    {
        var actorId = new ActorId("test-account-" + Guid.NewGuid().ToString("N")[..8]);
        var proxy = ActorProxy.Create<IBankAccountActor>(actorId, "BankAccount");

        await proxy.DepositAsync(50m);

        // Fire 10 concurrent withdrawals of 10 each (only 5 should succeed)
        var results = await Task.WhenAll(
            Enumerable.Range(0, 10).Select(_ => proxy.WithdrawAsync(10m)));

        var successCount = results.Count(r => r);
        var finalBalance = await proxy.GetBalanceAsync();

        // Exactly 5 should succeed, balance should be 0
        Assert.Equal(5, successCount);
        Assert.Equal(0m, finalBalance);
    }
}
```

## Monitoring Actor Queue Depth

When actors are a bottleneck, the call queue depth grows. Monitor this via Dapr metrics:

```bash
# Prometheus query for actor pending calls (high value = bottleneck)
# dapr_runtime_actor_pending_actor_calls{actor_type="BankAccount"}

# Check via Dapr sidecar metrics endpoint
curl http://localhost:9090/metrics | grep dapr_runtime_actor_pending

# Use Grafana dashboard ID 11150 for Dapr actor metrics
```

Add a health check that warns when the queue is deep:

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("actor-queue", () =>
    {
        // Custom check - query Prometheus metrics
        // Return degraded if pending calls > threshold
        return HealthCheckResult.Healthy("Actor queue nominal");
    });
```

## Summary

Dapr actor turn-based concurrency eliminates the need for explicit synchronization in actor methods by guaranteeing sequential execution per actor instance. Enable reentrancy with a sensible `MaxStackDepth` when actors need to call other actors in the same logical call chain. Configure idle timeouts and drain settings to control how actors behave during rebalancing. Test concurrent behavior explicitly to confirm that all operations are applied correctly and that balance invariants hold under parallel load.
