# How to Use Redis Sets and Sorted Sets in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Set

Description: Learn how to use Redis sets and sorted sets in Go with go-redis for unique collections, intersection, union, and score-based leaderboards.

---

Redis sets store unique, unordered members. Sorted sets add a floating-point score to each member, enabling ranked queries. Both are commonly used for membership tracking, tagging, leaderboards, and range queries.

## Sets - Basic Operations

```go
package main

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    // Add members
    rdb.SAdd(ctx, "users:online", "alice", "bob", "charlie")
    rdb.SAdd(ctx, "users:premium", "alice", "david")

    // Check membership
    isMember, _ := rdb.SIsMember(ctx, "users:online", "alice").Result()
    fmt.Println(isMember) // true

    // Count members
    count, _ := rdb.SCard(ctx, "users:online").Result()
    fmt.Println(count) // 3

    // List all members
    members, _ := rdb.SMembers(ctx, "users:online").Result()
    fmt.Println(members) // [alice bob charlie] (order not guaranteed)
}
```

## Set Operations

```go
// Intersection (members in both sets)
inter, _ := rdb.SInter(ctx, "users:online", "users:premium").Result()
fmt.Println(inter) // [alice]

// Union (members in either set)
union, _ := rdb.SUnion(ctx, "users:online", "users:premium").Result()
fmt.Println(union) // [alice bob charlie david]

// Difference (in first set but not second)
diff, _ := rdb.SDiff(ctx, "users:online", "users:premium").Result()
fmt.Println(diff) // [bob charlie]
```

## Remove and Pop

```go
rdb.SRem(ctx, "users:online", "bob")

// Remove and return a random member
member, _ := rdb.SPop(ctx, "users:online").Result()
fmt.Println(member)

// Get random members without removing
randoms, _ := rdb.SRandMemberN(ctx, "users:online", 2).Result()
```

## Sorted Sets - Basic Operations

```go
// Add members with scores
rdb.ZAdd(ctx, "leaderboard",
    redis.Z{Score: 1500, Member: "alice"},
    redis.Z{Score: 2300, Member: "bob"},
    redis.Z{Score: 900, Member: "charlie"},
)

// Get rank (0-indexed, lowest score first)
rank, _ := rdb.ZRank(ctx, "leaderboard", "alice").Result()
fmt.Println(rank) // 1 (charlie=0, alice=1, bob=2)

// Get rank with highest score first
revRank, _ := rdb.ZRevRank(ctx, "leaderboard", "bob").Result()
fmt.Println(revRank) // 0 (bob has highest score)

// Get score
score, _ := rdb.ZScore(ctx, "leaderboard", "alice").Result()
fmt.Println(score) // 1500
```

## Range Queries

```go
// Get top 3 by highest score
top3, _ := rdb.ZRevRangeWithScores(ctx, "leaderboard", 0, 2).Result()
for _, z := range top3 {
    fmt.Printf("%s: %.0f\n", z.Member, z.Score)
}

// Get members with scores between 1000 and 2000
inRange, _ := rdb.ZRangeByScore(ctx, "leaderboard", &redis.ZRangeBy{
    Min: "1000",
    Max: "2000",
}).Result()
fmt.Println(inRange) // [alice]
```

## Increment Score

```go
newScore, _ := rdb.ZIncrBy(ctx, "leaderboard", 100, "alice").Result()
fmt.Println(newScore) // 1600
```

## Remove Members

```go
// Remove by member name
rdb.ZRem(ctx, "leaderboard", "charlie")

// Remove by rank range (lowest 2 scores)
rdb.ZRemRangeByRank(ctx, "leaderboard", 0, 1)

// Remove by score range
rdb.ZRemRangeByScore(ctx, "leaderboard", "-inf", "1000")
```

## Summary

Redis sets in Go handle unique collections with fast membership checks and set operations like intersection, union, and difference. Sorted sets extend this with score-based ranking, enabling leaderboards, priority queues, and range queries. go-redis maps these directly with `SAdd`/`SMembers` for sets and `ZAdd`/`ZRevRangeWithScores` for sorted sets.
