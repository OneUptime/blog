# How to Build a Live Auction System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Auction, Real-Time

Description: Build a live auction system with Redis using sorted sets for bid tracking, Pub/Sub for real-time updates, and atomic operations to prevent race conditions.

---

Live auctions require millisecond-accurate bid tracking, instant updates to all connected bidders, and ironclad consistency to ensure no two bidders win the same item. Redis provides all of this with sorted sets, Lua scripts, and Pub/Sub.

## Data Model

Each auction item is stored with its current highest bid using a sorted set where the score is the bid amount:

```bash
# Key: auction:{item_id}:bids
# Score: bid amount
# Member: bidder_id:timestamp
ZADD auction:item-42:bids 250.00 "user-101:1711900000"
```

Auction metadata is stored in a hash:

```bash
HSET auction:item-42 title "Vintage Guitar" reserve 100.00 end_time 1711903600 status active
```

## Placing a Bid with Atomic Safety

Use a Lua script to atomically validate and record a bid:

```python
import redis
import time
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

PLACE_BID_SCRIPT = """
local item_key = KEYS[1]
local bids_key = KEYS[2]
local channel = KEYS[3]
local bid_amount = tonumber(ARGV[1])
local bidder_id = ARGV[2]
local now = tonumber(ARGV[3])

local status = redis.call('HGET', item_key, 'status')
if status ~= 'active' then
    return redis.error_reply('AUCTION_CLOSED')
end

local end_time = tonumber(redis.call('HGET', item_key, 'end_time'))
if now > end_time then
    redis.call('HSET', item_key, 'status', 'closed')
    return redis.error_reply('AUCTION_CLOSED')
end

local top = redis.call('ZRANGE', bids_key, -1, -1, 'WITHSCORES')
if #top > 0 and tonumber(top[2]) >= bid_amount then
    return redis.error_reply('BID_TOO_LOW')
end

local member = bidder_id .. ':' .. now
redis.call('ZADD', bids_key, bid_amount, member)

local update = cjson.encode({
    item_id = string.match(item_key, 'auction:(.+)'),
    bidder = bidder_id,
    amount = bid_amount,
    ts = now
})
redis.call('PUBLISH', channel, update)

return update
"""

place_bid = r.register_script(PLACE_BID_SCRIPT)

def bid(item_id: str, bidder_id: str, amount: float) -> dict:
    item_key = f"auction:{item_id}"
    bids_key = f"auction:{item_id}:bids"
    channel = f"auction:{item_id}:updates"
    now = int(time.time())

    try:
        result = place_bid(
            keys=[item_key, bids_key, channel],
            args=[amount, bidder_id, now]
        )
        return json.loads(result)
    except redis.ResponseError as e:
        raise ValueError(str(e))
```

## Subscribing to Live Updates

Clients subscribe to the auction channel to receive instant bid notifications:

```python
import threading

def listen_for_bids(item_id: str):
    sub = r.pubsub()
    sub.subscribe(f"auction:{item_id}:updates")

    for message in sub.listen():
        if message["type"] == "message":
            update = json.loads(message["data"])
            print(f"New bid: ${update['amount']:.2f} by {update['bidder']}")

thread = threading.Thread(target=listen_for_bids, args=("item-42",), daemon=True)
thread.start()
```

## Querying Bid History

Retrieve the top 5 bids with amounts:

```python
def get_top_bids(item_id: str, count: int = 5) -> list:
    bids = r.zrange(f"auction:{item_id}:bids", 0, count - 1, withscores=True, rev=True)
    return [
        {"bidder": member.split(":")[0], "amount": score}
        for member, score in bids
    ]
```

## Closing the Auction

```python
def close_auction(item_id: str) -> dict | None:
    bids_key = f"auction:{item_id}:bids"
    winner_data = r.zrange(bids_key, -1, -1, withscores=True)

    if not winner_data:
        return None

    member, amount = winner_data[0]
    bidder_id = member.split(":")[0]

    r.hset(f"auction:{item_id}", mapping={
        "status": "closed",
        "winner": bidder_id,
        "final_price": amount
    })

    r.publish(f"auction:{item_id}:updates", json.dumps({
        "event": "closed", "winner": bidder_id, "final_price": amount
    }))

    return {"winner": bidder_id, "final_price": amount}
```

## Summary

A Redis-based live auction system uses sorted sets to store bids by score (amount), Lua scripts for atomic bid validation, and Pub/Sub to push real-time updates to all connected clients. This approach guarantees consistency across concurrent bidders without any external locking mechanisms.
