# How to Use Redis in Lua (Outside of Redis Scripting)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, redis-lua, Scripting, Automation

Description: Learn how to connect to Redis from a standalone Lua script using the redis-lua library, covering commands, pipelining, and error handling.

---

Most Redis-and-Lua content focuses on Lua scripts running inside Redis via `EVAL`. This guide covers the other direction: using Redis as an external data store from a standalone Lua program using the `redis-lua` client library.

## Setup

Install `redis-lua` via LuaRocks:

```bash
luarocks install redis-lua
```

Requires Lua 5.1+ and a running Redis server.

## Connecting and Basic Commands

```lua
local redis = require("redis")

local client = redis.connect("127.0.0.1", 6379)

-- SET and GET
client:set("user:1:name", "Alice")
local name = client:get("user:1:name")
print("Name: " .. (name or "nil"))

-- INCR
client:set("visits", 0)
local count = client:incr("visits")
print("Visits: " .. count)

-- Key expiry
client:setex("session:abc", 3600, "user:42")

-- Check existence
if client:exists("session:abc") then
    print("Session active")
end

-- DEL
client:del("visits")
```

## Hash Operations

```lua
client:hmset("profile:1", {
    city  = "Tokyo",
    age   = "27",
    email = "alice@example.com"
})

local city = client:hget("profile:1", "city")
print("City: " .. city)

local profile = client:hgetall("profile:1")
for k, v in pairs(profile) do
    print(k .. ": " .. v)
end
```

## List as a Queue

```lua
-- Enqueue
client:rpush("jobs", "task:1")
client:rpush("jobs", "task:2")
client:rpush("jobs", "task:3")

-- Process
local job = client:lpop("jobs")
while job do
    print("Processing: " .. job)
    job = client:lpop("jobs")
end
```

## Sorted Set (Leaderboard)

```lua
client:zadd("scores", 100, "alice")
client:zadd("scores", 75,  "bob")
client:zadd("scores", 90,  "carol")

-- Top 3
local top = client:zrevrange("scores", 0, 2, { withscores = true })
for _, entry in ipairs(top) do
    print(entry[1] .. ": " .. entry[2])
end
```

## Pipeline Mode

```lua
-- Batch commands
local pipeline = client:pipeline(function(p)
    for i = 1, 100 do
        p:set("item:" .. i, i)
    end
end)

print("Inserted " .. #pipeline .. " items")
```

## Error Handling

```lua
local ok, err = pcall(function()
    local value = client:get("some_key")
    if not value then
        print("Key not found")
    end
end)

if not ok then
    print("Redis error: " .. tostring(err))
end
```

## Pub/Sub

```lua
-- Subscriber (blocking loop)
local subscriber = redis.connect("127.0.0.1", 6379)
for msg, abort in subscriber:pubsub({ subscribe = { "alerts" } }) do
    if msg.kind == "message" then
        print("Channel: " .. msg.channel .. " Message: " .. msg.payload)
        if msg.payload == "quit" then
            abort()  -- stop listening
        end
    end
end

-- Publisher (separate connection)
client:publish("alerts", "Deploy started")
```

## Summary

`redis-lua` lets you use Redis as a data store from standalone Lua scripts, automation tools, or game server logic written in Lua. It covers all standard Redis command types. Use `pipeline()` for bulk operations, `pcall()` for error handling, and separate connections for Pub/Sub subscribers.
