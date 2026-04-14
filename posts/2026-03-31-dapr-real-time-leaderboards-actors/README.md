# How to Build Real-Time Leaderboards with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Leaderboard, Real-Time, Game

Description: Learn how to build high-performance real-time leaderboards using Dapr Actors for per-player state and pub/sub for ranking broadcasts.

---

Real-time leaderboards must handle thousands of concurrent score updates while maintaining accurate rankings. Dapr Actors are perfect for this - each player is an actor that owns its score state, processing updates sequentially to eliminate race conditions. A leaderboard aggregator actor periodically computes and broadcasts the top rankings.

## Player Actor Design

Each player has an actor that manages their score and game statistics:

```csharp
public interface IPlayerActor : IActor
{
    Task<int> AddScore(int points);
    Task<PlayerStats> GetStats();
    Task ResetScore();
}

[Actor(TypeName = "PlayerActor")]
public class PlayerActor : Actor, IPlayerActor
{
    public PlayerActor(ActorHost host) : base(host) { }

    public async Task<int> AddScore(int points)
    {
        var stats = await StateManager.GetOrAddStateAsync("stats",
            new PlayerStats { Score = 0, Rank = 0 });

        stats.Score += points;
        stats.LastUpdated = DateTime.UtcNow;
        await StateManager.SetStateAsync("stats", stats);

        // Notify leaderboard aggregator
        var proxy = ProxyFactory.CreateActorProxy<ILeaderboardActor>(
            new ActorId("global"), "LeaderboardActor");
        await proxy.UpdateScore(
            new ScoreUpdate { PlayerId = Id.GetId(), Score = stats.Score });

        return stats.Score;
    }

    public async Task<PlayerStats> GetStats()
    {
        return await StateManager.GetOrAddStateAsync("stats", new PlayerStats());
    }
}
```

## Leaderboard Aggregator Actor

A single `LeaderboardActor` maintains the sorted top players:

```csharp
[Actor(TypeName = "LeaderboardActor")]
public class LeaderboardActor : Actor, ILeaderboardActor, IRemindable
{
    private readonly DaprClient _daprClient;
    private const int TopN = 100;

    public LeaderboardActor(ActorHost host, DaprClient daprClient) : base(host)
    {
        _daprClient = daprClient;
    }

    public async Task UpdateScore(ScoreUpdate update)
    {
        var board = await StateManager.GetOrAddStateAsync(
            "leaderboard", new Dictionary<string, int>());

        // Update player's score
        board[update.PlayerId] = update.Score;

        // Keep only top N
        if (board.Count > TopN)
        {
            board = board.OrderByDescending(kv => kv.Value)
                .Take(TopN)
                .ToDictionary(kv => kv.Key, kv => kv.Value);
        }

        await StateManager.SetStateAsync("leaderboard", board);

        // Broadcast updated top 10
        var top10 = board.OrderByDescending(kv => kv.Value).Take(10).ToList();
        await _daprClient.PublishEventAsync("pubsub", "leaderboard-updates", top10);
    }
}
```

## Score Submission API

```javascript
const { DaprClient, ActorProxyBuilder, ActorId } = require('@dapr/dapr');
const client = new DaprClient();
const playerActorBuilder = new ActorProxyBuilder('PlayerActor', client);

// Express endpoint to receive game events
app.post('/game/score', async (req, res) => {
  const { playerId, points } = req.body;

  const actor = playerActorBuilder.build(new ActorId(playerId));
  const newScore = await actor.AddScore(points);

  res.json({ playerId, newScore });
});
```

## WebSocket Leaderboard Broadcast

Subscribe to leaderboard updates and push to connected clients:

```javascript
const WebSocket = require('ws');
const { DaprServer } = require('@dapr/dapr');

const wss = new WebSocket.Server({ port: 8080 });
const connections = new Set();

wss.on('connection', (ws) => connections.add(ws));

const daprServer = new DaprServer({ serverPort: "3001" });

await daprServer.pubsub.subscribe('pubsub', 'leaderboard-updates', async (data) => {
  const message = JSON.stringify({ type: 'leaderboard', rankings: data });
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  });
});

await daprServer.start();
```

## Configure Actor Reminders for Periodic Publishing

Publish the full leaderboard every 5 seconds regardless of score changes:

```csharp
protected override async Task OnActivateAsync()
{
    await RegisterReminderAsync(
        "broadcast-leaderboard",
        null,
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(5)
    );
}

public async Task ReceiveReminderAsync(string reminderName, byte[] state,
    TimeSpan dueTime, TimeSpan period)
{
    var board = await StateManager.GetStateAsync<Dictionary<string, int>>("leaderboard");
    var sorted = board.OrderByDescending(kv => kv.Value).ToList();
    await _daprClient.PublishEventAsync("pubsub", "leaderboard-updates", sorted);
}
```

## Summary

Dapr Actors make real-time leaderboards efficient and race-condition-free by assigning each player their own actor for sequential score processing. A centralized leaderboard actor maintains the sorted top-N rankings and publishes updates via Dapr pub/sub to a WebSocket server that broadcasts to all connected players. Actor reminders ensure periodic full leaderboard refreshes even without new score events.
