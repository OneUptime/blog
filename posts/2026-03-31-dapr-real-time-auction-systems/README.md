# How to Build Real-Time Auction Systems with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Auction, Actor, Real-Time, State Management

Description: Learn how to implement a real-time auction platform using Dapr Actors for bid management and pub/sub for live bid broadcasting.

---

Auction systems require strict consistency when accepting bids - only the highest bid must win, and concurrent bids must be serialized correctly. Dapr Actors are ideal for this: each auction runs as an actor, processing bids sequentially without distributed locks.

## Auction Actor Design

Each auction item is a Dapr Actor that owns all bid state:

```csharp
public interface IAuctionActor : IActor
{
    Task<BidResult> PlaceBid(Bid bid);
    Task<AuctionState> GetState();
    Task<bool> CloseAuction();
}

[Actor(TypeName = "AuctionActor")]
public class AuctionActor : Actor, IAuctionActor, IRemindable
{
    private readonly DaprClient _dapr;

    public AuctionActor(ActorHost host, DaprClient dapr) : base(host)
    {
        _dapr = dapr;
    }

    public async Task<BidResult> PlaceBid(Bid bid)
    {
        var state = await StateManager.GetOrAddStateAsync("auction",
            new AuctionState { Status = "open", CurrentBid = 0 });

        if (state.Status != "open")
            return new BidResult { Accepted = false, Reason = "Auction closed" };

        if (bid.Amount <= state.CurrentBid)
            return new BidResult { Accepted = false, Reason = "Bid too low" };

        if (bid.Amount < state.MinimumIncrement + state.CurrentBid)
            return new BidResult { Accepted = false, Reason = "Increment too small" };

        // Record winning bid
        var previous = state.LeadingBidder;
        state.CurrentBid = bid.Amount;
        state.LeadingBidder = bid.BidderId;
        state.BidCount++;
        state.LastBidAt = DateTime.UtcNow;

        await StateManager.SetStateAsync("auction", state);

        // Broadcast new leading bid
        await _dapr.PublishEventAsync("pubsub", "bid-updates", new BidUpdate
        {
            AuctionId = Id.GetId(),
            NewBid = bid.Amount,
            BidderId = bid.BidderId,
            PreviousBidder = previous,
            BidCount = state.BidCount
        });

        return new BidResult { Accepted = true, CurrentLeading = bid.Amount };
    }
}
```

## Bid Submission API

```javascript
const DAPR_PORT = process.env.DAPR_HTTP_PORT || '3500';

app.post('/auctions/:auctionId/bid', async (req, res) => {
  const { auctionId } = req.params;
  const { bidderId, amount } = req.body;

  try {
    const response = await fetch(
      `http://localhost:${DAPR_PORT}/v1.0/actors/AuctionActor/${auctionId}/method/PlaceBid`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderId, amount })
      }
    );
    const result = await response.json();

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Live Bid Broadcast via WebSocket

```javascript
const WebSocket = require('ws');
const { DaprServer } = require('@dapr/dapr');

const auctionRooms = new Map(); // auctionId -> Set<WebSocket>
const wss = new WebSocket.Server({ port: 8080 });
const daprServer = new DaprServer({ serverPort: 3001 });

wss.on('connection', (ws, req) => {
  const auctionId = req.url.split('/')[2];
  if (!auctionRooms.has(auctionId)) auctionRooms.set(auctionId, new Set());
  auctionRooms.get(auctionId).add(ws);
  ws.on('close', () => auctionRooms.get(auctionId)?.delete(ws));
});

daprServer.pubsub.subscribe('pubsub', 'bid-updates', async (data) => {
  const room = auctionRooms.get(data.auctionId);
  if (room) {
    const msg = JSON.stringify({ type: 'new-bid', ...data });
    room.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
  }
});

await daprServer.start();
```

## Auction Timer with Actor Reminders

Close the auction automatically when it expires:

```csharp
protected override async Task OnActivateAsync()
{
    var state = await StateManager.GetOrAddStateAsync("auction", new AuctionState());
    var timeRemaining = state.EndTime - DateTime.UtcNow;

    if (timeRemaining > TimeSpan.Zero)
    {
        await RegisterReminderAsync("close-auction", null, timeRemaining, Timeout.InfiniteTimeSpan);
    }
}

public async Task ReceiveReminderAsync(string reminderName, byte[] state,
    TimeSpan dueTime, TimeSpan period)
{
    await CloseAuction();
}
```

## Notify Outbid Bidders

When a new bid comes in, notify the previous leader:

```csharp
if (previous != null && previous != bid.BidderId)
{
    await _dapr.PublishEventAsync("pubsub", "outbid-notifications", new
    {
        BidderId = previous,
        AuctionId = Id.GetId(),
        NewLeadingBid = bid.Amount
    });
}
```

## Summary

Dapr Actors provide the perfect foundation for real-time auctions by serializing bid processing per auction item, eliminating the need for distributed locks. The actor validates bids against the current state, publishes accepted bids to a pub/sub topic, and uses actor reminders to auto-close auctions at their scheduled end time. WebSocket connections broadcast live bid updates to all watchers in real time.
