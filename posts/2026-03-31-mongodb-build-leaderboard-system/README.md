# How to Build a Leaderboard System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Leaderboard, Aggregation, Schema Design, Gaming

Description: Learn how to design and build a real-time leaderboard system with MongoDB using atomic score updates, rank queries, and time-windowed rankings.

---

## Schema Design

A leaderboard system needs to support fast score updates, rank lookups, and time-windowed views (all-time, weekly, daily). Store scores in a dedicated collection with compound indexes for efficient sorting and filtering.

```javascript
// Score document
{
  _id: ObjectId(),
  userId: ObjectId("..."),
  username: "alice",          // denormalized for fast retrieval
  gameId: "game-001",         // leaderboard namespace
  score: 12500,
  level: 8,
  achievedAt: ISODate("2026-03-31"),
  period: "2026-W14"          // ISO week for weekly boards
}
```

## Creating Indexes

```javascript
async function setupLeaderboard(db) {
  const scores = db.collection('scores');

  // Compound index for leaderboard queries: by game, sorted by score
  await scores.createIndex({ gameId: 1, score: -1 });

  // Per-period leaderboard
  await scores.createIndex({ gameId: 1, period: 1, score: -1 });

  // One best score per user per game per period
  await scores.createIndex(
    { userId: 1, gameId: 1, period: 1 },
    { unique: true }
  );
}
```

## Submitting a Score (Upsert Best Score)

Keep only the best score per user per period:

```javascript
async function submitScore(db, { userId, username, gameId, score }) {
  const now = new Date();
  const period = getISOWeek(now); // "2026-W14"

  // Pipeline update (MongoDB 4.2+) keeps level and achievedAt
  // consistent with the actual best score
  await db.collection('scores').updateOne(
    { userId, gameId, period },
    [
      {
        $set: {
          userId,
          gameId,
          period,
          username,
          createdAt: { $ifNull: ['$createdAt', now] },
          score: { $max: [{ $ifNull: ['$score', 0] }, score] },
          achievedAt: {
            $cond: [
              { $gt: [score, { $ifNull: ['$score', 0] }] },
              now,
              { $ifNull: ['$achievedAt', now] }
            ]
          },
          level: {
            $floor: {
              $divide: [{ $max: [{ $ifNull: ['$score', 0] }, score] }, 1000]
            }
          }
        }
      }
    ],
    { upsert: true }
  );
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
```

## Getting the Top N Players

```javascript
async function getTopPlayers(db, { gameId, period = null, limit = 10 }) {
  const filter = period ? { gameId, period } : { gameId };
  return db.collection('scores')
    .find(filter)
    .sort({ score: -1 })
    .limit(limit)
    .project({ userId: 1, username: 1, score: 1, level: 1, achievedAt: 1 })
    .toArray();
}
```

## Getting a Player's Rank

```javascript
async function getPlayerRank(db, { userId, gameId, period = null }) {
  const filter = period ? { gameId, period } : { gameId };

  // Get the player's score first
  const playerScore = await db.collection('scores').findOne(
    { ...filter, userId },
    { projection: { score: 1 } }
  );
  if (!playerScore) return null;

  // Count players with higher scores (rank = position 1-indexed)
  const rank = await db.collection('scores').countDocuments({
    ...filter,
    score: { $gt: playerScore.score },
  });

  return { rank: rank + 1, score: playerScore.score };
}
```

## Getting Players Around a User (Rank Context)

```javascript
async function getSurroundingPlayers(db, { userId, gameId, period, range = 2 }) {
  const { rank } = await getPlayerRank(db, { userId, gameId, period });
  const filter = period ? { gameId, period } : { gameId };

  return db.collection('scores')
    .find(filter)
    .sort({ score: -1 })
    .skip(Math.max(0, rank - range - 1))
    .limit(range * 2 + 1)
    .toArray();
}
```

## Aggregating All-Time Bests from Period Records

```javascript
async function getAllTimeLeaderboard(db, { gameId, limit = 10 }) {
  return db.collection('scores').aggregate([
    { $match: { gameId } },
    { $group: { _id: '$userId', bestScore: { $max: '$score' }, username: { $first: '$username' } } },
    { $sort: { bestScore: -1 } },
    { $limit: limit },
  ]).toArray();
}
```

## Summary

Build a MongoDB leaderboard using `$max` upserts to record only the best score per user, compound indexes on `gameId + score` for fast top-N queries, and `countDocuments` with a score filter for efficient rank calculation. Use period fields for time-windowed leaderboards and aggregate across periods for all-time rankings.
