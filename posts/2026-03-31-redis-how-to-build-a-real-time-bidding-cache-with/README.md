# How to Build a Real-Time Bidding Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time Bidding, Advertising, Cache, Performance, Low Latency

Description: Learn how to use Redis as a high-performance cache for real-time bidding systems, handling millions of ad auction requests per second with sub-millisecond latency.

---

## Overview

Real-time bidding (RTB) ad auctions operate within strict time windows - typically under 100 milliseconds from bid request to response. Redis serves as the critical cache layer for user profiles, campaign budgets, frequency caps, and bid prices, enabling DSPs (Demand-Side Platforms) to respond in time.

## Architecture

```text
Ad Exchange --> Bidding Engine --> Redis Cache (user profile, budget, freq cap)
                              --> Bid Response (< 50ms)
```

## User Profile Caching

Store user segment data as Redis Hashes for fast lookup:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function cacheUserProfile(userId, profile) {
  const key = `user:${userId}:profile`;
  await redis.hset(key, {
    segments: profile.segments.join(','),
    gender: profile.gender,
    ageGroup: profile.ageGroup,
    interests: profile.interests.join(','),
    lastSeen: Date.now()
  });
  await redis.expire(key, 3600); // 1 hour TTL
}

async function getUserProfile(userId) {
  const key = `user:${userId}:profile`;
  const profile = await redis.hgetall(key);

  if (!profile || Object.keys(profile).length === 0) return null;

  return {
    userId,
    segments: profile.segments ? profile.segments.split(',') : [],
    gender: profile.gender,
    ageGroup: profile.ageGroup,
    interests: profile.interests ? profile.interests.split(',') : []
  };
}
```

## Campaign Budget Tracking

Use Redis atomic operations to track and decrement campaign budgets:

```javascript
async function initCampaignBudget(campaignId, dailyBudgetCents) {
  const key = `campaign:${campaignId}:budget`;
  await redis.set(key, dailyBudgetCents);
  // Expire at end of day
  const secondsUntilMidnight = getSecondsUntilMidnight();
  await redis.expire(key, secondsUntilMidnight);
}

async function decrementBudget(campaignId, bidAmountCents) {
  const key = `campaign:${campaignId}:budget`;
  const remaining = await redis.decrby(key, bidAmountCents);
  return remaining >= 0; // Return false if over budget
}

async function checkBudget(campaignId, bidAmountCents) {
  const key = `campaign:${campaignId}:budget`;
  const remaining = await redis.get(key);
  return remaining !== null && parseInt(remaining) >= bidAmountCents;
}

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}
```

## Frequency Capping

Prevent showing the same ad too many times to the same user:

```javascript
async function checkAndIncrementFrequency(userId, campaignId, maxImpressions, windowSeconds) {
  const key = `freq:${campaignId}:${userId}`;

  // Use pipeline to batch check-and-increment
  const result = await redis.pipeline()
    .incr(key)
    .expire(key, windowSeconds)
    .exec();

  const currentCount = result[0][1];
  return currentCount <= maxImpressions; // true if under cap
}

async function getFrequencyCount(userId, campaignId) {
  const key = `freq:${campaignId}:${userId}`;
  const count = await redis.get(key);
  return parseInt(count) || 0;
}
```

## Bid Price Caching with Sorted Sets

Cache bid floors and historical win rates using Sorted Sets:

```javascript
async function cacheBidFloor(publisherId, placementId, floorPriceCPM) {
  const key = `floors:${publisherId}`;
  await redis.zadd(key, floorPriceCPM, placementId);
  await redis.expire(key, 300); // 5-minute cache
}

async function getBidFloor(publisherId, placementId) {
  const key = `floors:${publisherId}`;
  const floor = await redis.zscore(key, placementId);
  return floor ? parseFloat(floor) : 0;
}

// Store win rate per (campaign, publisher) pair
async function updateWinRate(campaignId, publisherId, won) {
  const attemptsKey = `winrate:${campaignId}:${publisherId}:attempts`;
  const winsKey = `winrate:${campaignId}:${publisherId}:wins`;

  await redis.pipeline()
    .incr(attemptsKey)
    .expire(attemptsKey, 86400)
    .exec();

  if (won) {
    await redis.pipeline()
      .incr(winsKey)
      .expire(winsKey, 86400)
      .exec();
  }
}
```

## The Bidding Decision Engine

```javascript
async function decideBid(bidRequest) {
  const { userId, publisherId, placementId, campaignIds } = bidRequest;

  // Fetch user profile once
  const userProfile = await getUserProfile(userId);
  if (!userProfile) return { bid: false };

  // Evaluate all eligible campaigns in parallel
  const evaluations = await Promise.all(
    campaignIds.map(async (campaignId) => {
      const [hasBudget, underFreqCap, floorPrice] = await Promise.all([
        checkBudget(campaignId, 100), // min 1 CPM in cents
        checkAndIncrementFrequency(userId, campaignId, 5, 86400),
        getBidFloor(publisherId, placementId)
      ]);

      if (!hasBudget || !underFreqCap) return null;

      // Calculate bid price (simplified)
      const bidPrice = calculateBidPrice(userProfile, campaignId, floorPrice);
      return { campaignId, bidPrice };
    })
  );

  const eligible = evaluations.filter(Boolean);
  if (eligible.length === 0) return { bid: false };

  // Select highest bid
  const winner = eligible.reduce((best, curr) =>
    curr.bidPrice > best.bidPrice ? curr : best
  );

  return { bid: true, campaignId: winner.campaignId, price: winner.bidPrice };
}

function calculateBidPrice(userProfile, campaignId, floorPrice) {
  // Simplified: return floor + 10 cents
  return floorPrice + 0.10;
}
```

## Caching Targeting Rules

```javascript
async function cacheTargetingRules(campaignId, rules) {
  const key = `campaign:${campaignId}:targeting`;
  await redis.set(key, JSON.stringify(rules), 'EX', 300);
}

async function getTargetingRules(campaignId) {
  const key = `campaign:${campaignId}:targeting`;
  const rules = await redis.get(key);
  return rules ? JSON.parse(rules) : null;
}
```

## Performance Tips

```bash
# Use Redis pipeline to batch all lookups
# Measure latency
redis-cli --latency -h localhost -p 6379

# Monitor command execution time
redis-cli MONITOR

# Check memory usage for cache keys
redis-cli --bigkeys
```

## Summary

Redis enables real-time bidding systems to meet sub-100ms auction deadlines by caching user profiles, tracking campaign budgets atomically, enforcing frequency caps with TTL-based counters, and storing bid floors in Sorted Sets. Using pipelines for parallel lookups and atomic INCR operations ensures both speed and correctness in high-throughput ad auction environments.
