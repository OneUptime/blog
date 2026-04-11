# How to Use Redis Sets and Sorted Sets in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Set, Sorted Set, ioredis, Leaderboard

Description: Learn how to use Redis Sets and Sorted Sets in Node.js for unique collections, set operations, leaderboards, and ranked data with ioredis.

---

## Redis Sets

Sets store unique, unordered string members. Operations like union, intersection, and difference make them powerful for membership checks and relationship modeling.

## Basic Set Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function setOps() {
  // Add members
  await redis.sadd('tags:post:1', 'javascript', 'node', 'redis', 'backend');

  // Check membership
  const isMember = await redis.sismember('tags:post:1', 'redis');
  console.log(isMember); // 1 (true)

  // Get all members
  const tags = await redis.smembers('tags:post:1');
  console.log(tags); // ['javascript', 'node', 'redis', 'backend'] (unordered)

  // Count members
  const count = await redis.scard('tags:post:1');
  console.log(count); // 4

  // Remove a member
  await redis.srem('tags:post:1', 'backend');

  // Check multiple members at once
  const [isJs, isRust] = await redis.smismember('tags:post:1', 'javascript', 'rust');
  console.log(isJs, isRust); // 1 0
}

setOps();
```

## Set Operations - Union, Intersection, Difference

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function setMath() {
  await redis.sadd('user:1:skills', 'javascript', 'python', 'redis', 'sql');
  await redis.sadd('user:2:skills', 'javascript', 'go', 'redis', 'docker');
  await redis.sadd('job:backend:required', 'javascript', 'redis', 'sql');

  // Intersection: skills both users share
  const common = await redis.sinter('user:1:skills', 'user:2:skills');
  console.log('Common skills:', common); // ['javascript', 'redis']

  // Union: all skills combined
  const allSkills = await redis.sunion('user:1:skills', 'user:2:skills');
  console.log('All skills:', allSkills);

  // Difference: user 1 skills not in user 2
  const unique1 = await redis.sdiff('user:1:skills', 'user:2:skills');
  console.log('User 1 unique:', unique1); // ['python', 'sql']

  // Store intersection result to another key
  await redis.sinterstore('shared:skills', 'user:1:skills', 'user:2:skills');

  // Check if user 1 is qualified for backend job
  const qualified = await redis.sintercard(
    2, 'user:1:skills', 'job:backend:required', 'LIMIT', 0
  );
  console.log(`User 1 matches ${qualified} required skills`);
}

setMath();
```

## Redis Sorted Sets

Sorted Sets associate each member with a floating-point score, maintaining members in score order.

## Basic Sorted Set Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function sortedSetOps() {
  // Add members with scores
  await redis.zadd('leaderboard', 1500, 'alice', 2300, 'bob', 1800, 'carol');

  // Get rank (0-indexed, lowest score = rank 0)
  const rank = await redis.zrank('leaderboard', 'alice');
  console.log('Alice rank (asc):', rank); // 0

  // Get rank by highest score first
  const revRank = await redis.zrevrank('leaderboard', 'alice');
  console.log('Alice rank (desc):', revRank); // 2

  // Get score
  const score = await redis.zscore('leaderboard', 'bob');
  console.log('Bob score:', score); // 2300

  // Count members
  const count = await redis.zcard('leaderboard');
  console.log('Total players:', count); // 3

  // Increment score
  const newScore = await redis.zincrby('leaderboard', 100, 'alice');
  console.log('Alice new score:', newScore); // 1600
}

sortedSetOps();
```

## Building a Leaderboard

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class Leaderboard {
  constructor(name) {
    this.key = `leaderboard:${name}`;
  }

  async addScore(playerId, score) {
    await redis.zadd(this.key, score, playerId);
  }

  async incrementScore(playerId, by) {
    return redis.zincrby(this.key, by, playerId);
  }

  async getTopN(n = 10) {
    const members = await redis.zrevrange(this.key, 0, n - 1, 'WITHSCORES');
    const result = [];
    for (let i = 0; i < members.length; i += 2) {
      result.push({
        rank: i / 2 + 1,
        player: members[i],
        score: parseFloat(members[i + 1])
      });
    }
    return result;
  }

  async getPlayerRank(playerId) {
    const rank = await redis.zrevrank(this.key, playerId);
    return rank !== null ? rank + 1 : null;
  }

  async getAroundPlayer(playerId, range = 2) {
    const rank = await redis.zrevrank(this.key, playerId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const end = rank + range;
    const members = await redis.zrevrange(this.key, start, end, 'WITHSCORES');

    const result = [];
    for (let i = 0; i < members.length; i += 2) {
      result.push({
        rank: start + i / 2 + 1,
        player: members[i],
        score: parseFloat(members[i + 1])
      });
    }
    return result;
  }

  async getScoreRange(min, max) {
    const members = await redis.zrangebyscore(this.key, min, max, 'WITHSCORES');
    const result = [];
    for (let i = 0; i < members.length; i += 2) {
      result.push({ player: members[i], score: parseFloat(members[i + 1]) });
    }
    return result;
  }
}

const lb = new Leaderboard('weekly');

async function main() {
  await lb.addScore('alice', 1500);
  await lb.addScore('bob', 2300);
  await lb.addScore('carol', 1800);
  await lb.incrementScore('alice', 500);

  const top10 = await lb.getTopN(10);
  console.log('Top 10:');
  top10.forEach(p => console.log(`  #${p.rank} ${p.player}: ${p.score}`));

  const aliceContext = await lb.getAroundPlayer('alice', 1);
  console.log('\nAround Alice:');
  aliceContext.forEach(p => console.log(`  #${p.rank} ${p.player}: ${p.score}`));
}

main();
```

## Sorted Set Range Queries

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function rangeQueries() {
  // Get members in score range
  const midScores = await redis.zrangebyscore('leaderboard', 1600, 2000, 'WITHSCORES');
  console.log('Mid-range scores:', midScores);

  // Get members by rank range
  const top3 = await redis.zrevrange('leaderboard', 0, 2);
  console.log('Top 3:', top3);

  // Count members in score range
  const count = await redis.zcount('leaderboard', 1000, 2000);
  console.log('Players with 1000-2000 score:', count);

  // Remove members by score range (e.g., cleanup old entries)
  await redis.zremrangebyscore('leaderboard', '-inf', 500);

  // Remove members by rank range (keep only top 100)
  await redis.zremrangebyrank('leaderboard', 0, -101);
}

rangeQueries();
```

## Summary

Redis Sets in Node.js with ioredis excel at membership testing and set math operations (union, intersection, difference) useful for tagging, permissions, and recommendations. Sorted Sets add ordering by score, enabling leaderboards, ranked queues, and time-based data with efficient range queries. The `zadd`, `zrevrange`, `zrevrank`, and `zincrby` commands form the core of any leaderboard implementation and ranked data access pattern.
