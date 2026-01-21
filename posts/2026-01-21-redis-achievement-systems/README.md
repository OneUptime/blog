# How to Build Achievement Systems with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Achievements, Badges, Progress Tracking, Gamification, Bitmaps, Sets

Description: A comprehensive guide to building achievement and badge systems with Redis, covering progress tracking, unlock conditions, real-time notifications, and scalable storage patterns.

---

Achievement systems are a core part of modern games and applications. They drive engagement, reward players for accomplishments, and provide goals to work toward. Redis is an excellent choice for achievement systems due to its fast reads/writes, bit manipulation for tracking, and pub/sub for real-time notifications. This guide covers building robust achievement systems at scale.

## Understanding Achievement Systems

Achievement systems typically include:

- **Achievement definitions** - What achievements exist and their unlock conditions
- **Player progress** - How far a player is toward each achievement
- **Unlocked achievements** - Which achievements a player has earned
- **Notifications** - Real-time alerts when achievements are unlocked
- **Leaderboards** - Rankings based on achievement points

## Achievement Data Model

### Defining Achievements

```python
import redis
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class AchievementType(Enum):
    COUNTER = "counter"       # Count-based (kill 100 enemies)
    MILESTONE = "milestone"   # One-time events (complete tutorial)
    COLLECTION = "collection" # Collect all items in a set
    STREAK = "streak"         # Consecutive actions (7-day login)
    TIERED = "tiered"         # Multiple levels (bronze/silver/gold)

@dataclass
class Achievement:
    achievement_id: str
    name: str
    description: str
    icon_url: str
    achievement_type: AchievementType
    target_value: int
    points: int
    category: str
    hidden: bool = False
    prerequisites: List[str] = None  # Achievement IDs required first
    metadata: Dict = None

class AchievementRegistry:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.achievements_key = "achievements:registry"
        self.categories_key = "achievements:categories"

    def register_achievement(self, achievement: Achievement) -> bool:
        """Register a new achievement in the system."""
        achievement_data = {
            "achievement_id": achievement.achievement_id,
            "name": achievement.name,
            "description": achievement.description,
            "icon_url": achievement.icon_url,
            "type": achievement.achievement_type.value,
            "target_value": achievement.target_value,
            "points": achievement.points,
            "category": achievement.category,
            "hidden": achievement.hidden,
            "prerequisites": json.dumps(achievement.prerequisites or []),
            "metadata": json.dumps(achievement.metadata or {})
        }

        pipe = self.redis.pipeline()

        # Store achievement definition
        pipe.hset(
            f"achievement:{achievement.achievement_id}",
            mapping=achievement_data
        )

        # Add to registry set
        pipe.sadd(self.achievements_key, achievement.achievement_id)

        # Add to category set
        pipe.sadd(f"achievements:category:{achievement.category}", achievement.achievement_id)
        pipe.sadd(self.categories_key, achievement.category)

        pipe.execute()
        return True

    def get_achievement(self, achievement_id: str) -> Optional[Dict]:
        """Get achievement definition."""
        data = self.redis.hgetall(f"achievement:{achievement_id}")
        if not data:
            return None

        return {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

    def get_all_achievements(self, category: Optional[str] = None) -> List[Dict]:
        """Get all achievements, optionally filtered by category."""
        if category:
            achievement_ids = self.redis.smembers(f"achievements:category:{category}")
        else:
            achievement_ids = self.redis.smembers(self.achievements_key)

        achievements = []
        for aid in achievement_ids:
            aid = aid.decode() if isinstance(aid, bytes) else aid
            achievement = self.get_achievement(aid)
            if achievement:
                achievements.append(achievement)

        return achievements

    def get_categories(self) -> List[str]:
        """Get all achievement categories."""
        categories = self.redis.smembers(self.categories_key)
        return [c.decode() if isinstance(c, bytes) else c for c in categories]
```

## Progress Tracking

### Counter-Based Progress

```python
class ProgressTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.registry = AchievementRegistry(redis_client)

    def increment_progress(
        self,
        player_id: str,
        achievement_id: str,
        amount: int = 1
    ) -> Dict:
        """Increment progress toward an achievement."""
        progress_key = f"player:{player_id}:progress:{achievement_id}"
        unlocked_key = f"player:{player_id}:achievements"

        # Check if already unlocked
        if self.redis.sismember(unlocked_key, achievement_id):
            return {"already_unlocked": True}

        # Get achievement definition
        achievement = self.registry.get_achievement(achievement_id)
        if not achievement:
            return {"error": "Achievement not found"}

        # Increment progress
        new_progress = self.redis.incrby(progress_key, amount)

        target = int(achievement.get("target_value", 1))

        result = {
            "achievement_id": achievement_id,
            "progress": new_progress,
            "target": target,
            "percentage": min(100, (new_progress / target) * 100)
        }

        # Check if achievement should be unlocked
        if new_progress >= target:
            self._unlock_achievement(player_id, achievement_id, achievement)
            result["unlocked"] = True
            result["points_earned"] = int(achievement.get("points", 0))

        return result

    def set_progress(
        self,
        player_id: str,
        achievement_id: str,
        value: int
    ) -> Dict:
        """Set absolute progress value."""
        progress_key = f"player:{player_id}:progress:{achievement_id}"
        unlocked_key = f"player:{player_id}:achievements"

        if self.redis.sismember(unlocked_key, achievement_id):
            return {"already_unlocked": True}

        achievement = self.registry.get_achievement(achievement_id)
        if not achievement:
            return {"error": "Achievement not found"}

        self.redis.set(progress_key, value)
        target = int(achievement.get("target_value", 1))

        result = {
            "achievement_id": achievement_id,
            "progress": value,
            "target": target
        }

        if value >= target:
            self._unlock_achievement(player_id, achievement_id, achievement)
            result["unlocked"] = True

        return result

    def get_progress(self, player_id: str, achievement_id: str) -> Dict:
        """Get current progress for an achievement."""
        progress_key = f"player:{player_id}:progress:{achievement_id}"
        unlocked_key = f"player:{player_id}:achievements"

        achievement = self.registry.get_achievement(achievement_id)
        if not achievement:
            return None

        is_unlocked = self.redis.sismember(unlocked_key, achievement_id)
        current_progress = int(self.redis.get(progress_key) or 0)
        target = int(achievement.get("target_value", 1))

        return {
            "achievement_id": achievement_id,
            "name": achievement.get("name"),
            "progress": current_progress,
            "target": target,
            "percentage": min(100, (current_progress / target) * 100),
            "unlocked": is_unlocked,
            "unlocked_at": self._get_unlock_time(player_id, achievement_id) if is_unlocked else None
        }

    def _unlock_achievement(
        self,
        player_id: str,
        achievement_id: str,
        achievement: Dict
    ):
        """Unlock an achievement for a player."""
        unlocked_key = f"player:{player_id}:achievements"
        unlock_times_key = f"player:{player_id}:achievement_times"
        points_key = f"player:{player_id}:achievement_points"

        unlock_time = time.time()
        points = int(achievement.get("points", 0))

        pipe = self.redis.pipeline()

        # Add to unlocked set
        pipe.sadd(unlocked_key, achievement_id)

        # Record unlock time
        pipe.hset(unlock_times_key, achievement_id, unlock_time)

        # Add points
        pipe.incrby(points_key, points)

        # Record in recent achievements (for activity feeds)
        recent_key = f"player:{player_id}:recent_achievements"
        unlock_record = json.dumps({
            "achievement_id": achievement_id,
            "name": achievement.get("name"),
            "points": points,
            "unlocked_at": unlock_time
        })
        pipe.lpush(recent_key, unlock_record)
        pipe.ltrim(recent_key, 0, 49)  # Keep last 50

        pipe.execute()

        # Send notification
        self._notify_unlock(player_id, achievement_id, achievement)

        # Check for meta-achievements
        self._check_meta_achievements(player_id)

    def _notify_unlock(
        self,
        player_id: str,
        achievement_id: str,
        achievement: Dict
    ):
        """Send real-time notification for achievement unlock."""
        notification = {
            "type": "achievement_unlocked",
            "player_id": player_id,
            "achievement_id": achievement_id,
            "name": achievement.get("name"),
            "description": achievement.get("description"),
            "icon_url": achievement.get("icon_url"),
            "points": achievement.get("points"),
            "timestamp": time.time()
        }

        self.redis.publish(
            f"player:{player_id}:notifications",
            json.dumps(notification)
        )

    def _get_unlock_time(self, player_id: str, achievement_id: str) -> Optional[float]:
        """Get when an achievement was unlocked."""
        unlock_time = self.redis.hget(
            f"player:{player_id}:achievement_times",
            achievement_id
        )
        return float(unlock_time) if unlock_time else None

    def _check_meta_achievements(self, player_id: str):
        """Check for meta-achievements (achievements for getting achievements)."""
        unlocked_count = self.redis.scard(f"player:{player_id}:achievements")

        # Check milestone achievements
        milestones = [10, 25, 50, 100, 250, 500]
        for milestone in milestones:
            if unlocked_count >= milestone:
                meta_id = f"collector_{milestone}"
                if not self.redis.sismember(f"player:{player_id}:achievements", meta_id):
                    achievement = self.registry.get_achievement(meta_id)
                    if achievement:
                        self._unlock_achievement(player_id, meta_id, achievement)
```

## Bitmap-Based Tracking

For collection-type achievements, bitmaps are memory-efficient:

```python
class CollectionTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def mark_collected(
        self,
        player_id: str,
        collection_id: str,
        item_index: int
    ) -> Dict:
        """Mark an item as collected in a collection."""
        bitmap_key = f"player:{player_id}:collection:{collection_id}"

        # Set the bit for this item
        was_set = self.redis.setbit(bitmap_key, item_index, 1)

        # Count total collected
        collected_count = self.redis.bitcount(bitmap_key)

        return {
            "collection_id": collection_id,
            "item_index": item_index,
            "new_item": was_set == 0,  # Was 0 before, now 1
            "collected_count": collected_count
        }

    def get_collection_status(
        self,
        player_id: str,
        collection_id: str,
        total_items: int
    ) -> Dict:
        """Get collection completion status."""
        bitmap_key = f"player:{player_id}:collection:{collection_id}"

        collected_count = self.redis.bitcount(bitmap_key)

        # Get which items are collected
        collected_items = []
        for i in range(total_items):
            if self.redis.getbit(bitmap_key, i):
                collected_items.append(i)

        return {
            "collection_id": collection_id,
            "collected_count": collected_count,
            "total_items": total_items,
            "percentage": (collected_count / total_items) * 100,
            "is_complete": collected_count >= total_items,
            "collected_items": collected_items
        }

    def check_collection_complete(
        self,
        player_id: str,
        collection_id: str,
        total_items: int,
        achievement_id: str
    ) -> bool:
        """Check if collection is complete and unlock achievement."""
        status = self.get_collection_status(player_id, collection_id, total_items)

        if status["is_complete"]:
            # Trigger achievement unlock
            tracker = ProgressTracker(self.redis)
            tracker.set_progress(player_id, achievement_id, total_items)
            return True

        return False
```

## Streak Tracking

Track consecutive actions for streak achievements:

```python
class StreakTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def record_daily_action(
        self,
        player_id: str,
        action_type: str
    ) -> Dict:
        """Record a daily action and update streak."""
        streak_key = f"player:{player_id}:streak:{action_type}"
        last_action_key = f"player:{player_id}:streak:{action_type}:last"

        # Get today's date as days since epoch
        today = int(time.time() // 86400)

        # Get last action date
        last_action = self.redis.get(last_action_key)
        last_action_day = int(last_action) if last_action else 0

        pipe = self.redis.pipeline()

        if last_action_day == today:
            # Already recorded today
            current_streak = int(self.redis.get(streak_key) or 0)
            return {
                "action_type": action_type,
                "current_streak": current_streak,
                "already_recorded": True
            }
        elif last_action_day == today - 1:
            # Consecutive day - increment streak
            pipe.incr(streak_key)
            pipe.set(last_action_key, today)
            results = pipe.execute()
            new_streak = results[0]
        else:
            # Streak broken - reset to 1
            pipe.set(streak_key, 1)
            pipe.set(last_action_key, today)
            pipe.execute()
            new_streak = 1

        # Update best streak
        best_streak_key = f"player:{player_id}:streak:{action_type}:best"
        best_streak = int(self.redis.get(best_streak_key) or 0)

        if new_streak > best_streak:
            self.redis.set(best_streak_key, new_streak)
            best_streak = new_streak

        result = {
            "action_type": action_type,
            "current_streak": new_streak,
            "best_streak": best_streak,
            "already_recorded": False
        }

        # Check streak achievements
        self._check_streak_achievements(player_id, action_type, new_streak)

        return result

    def _check_streak_achievements(
        self,
        player_id: str,
        action_type: str,
        current_streak: int
    ):
        """Check for streak-based achievements."""
        # Define streak milestones
        streak_achievements = {
            7: f"streak_{action_type}_7",
            14: f"streak_{action_type}_14",
            30: f"streak_{action_type}_30",
            60: f"streak_{action_type}_60",
            100: f"streak_{action_type}_100",
            365: f"streak_{action_type}_365"
        }

        tracker = ProgressTracker(self.redis)
        for threshold, achievement_id in streak_achievements.items():
            if current_streak >= threshold:
                tracker.set_progress(player_id, achievement_id, threshold)

    def get_streak_status(
        self,
        player_id: str,
        action_type: str
    ) -> Dict:
        """Get current streak status."""
        streak_key = f"player:{player_id}:streak:{action_type}"
        last_action_key = f"player:{player_id}:streak:{action_type}:last"
        best_streak_key = f"player:{player_id}:streak:{action_type}:best"

        today = int(time.time() // 86400)
        last_action = self.redis.get(last_action_key)
        last_action_day = int(last_action) if last_action else 0

        current_streak = int(self.redis.get(streak_key) or 0)
        best_streak = int(self.redis.get(best_streak_key) or 0)

        # Check if streak is still active
        streak_active = last_action_day >= today - 1
        recorded_today = last_action_day == today

        return {
            "action_type": action_type,
            "current_streak": current_streak if streak_active else 0,
            "best_streak": best_streak,
            "streak_active": streak_active,
            "recorded_today": recorded_today,
            "days_until_expiry": 1 if (last_action_day == today) else 0
        }
```

## Tiered Achievements

Support multiple tiers for a single achievement:

```python
class TieredAchievementTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def define_tiered_achievement(
        self,
        base_id: str,
        name: str,
        description_template: str,
        tiers: List[Dict]
    ):
        """Define a tiered achievement with multiple levels."""
        # Store tier definitions
        tier_key = f"achievement:tiered:{base_id}"

        tier_data = {
            "base_id": base_id,
            "name": name,
            "description_template": description_template,
            "tiers": json.dumps(tiers)
        }

        self.redis.hset(tier_key, mapping=tier_data)

        # Register each tier as an individual achievement
        registry = AchievementRegistry(self.redis)
        for tier in tiers:
            achievement = Achievement(
                achievement_id=f"{base_id}_{tier['level']}",
                name=f"{name} - {tier['name']}",
                description=description_template.format(target=tier['target']),
                icon_url=tier.get("icon_url", ""),
                achievement_type=AchievementType.TIERED,
                target_value=tier['target'],
                points=tier['points'],
                category=tier.get("category", "general"),
                metadata={"base_id": base_id, "tier_level": tier['level']}
            )
            registry.register_achievement(achievement)

    def update_tiered_progress(
        self,
        player_id: str,
        base_id: str,
        new_value: int
    ) -> List[Dict]:
        """Update progress and potentially unlock multiple tiers."""
        tier_key = f"achievement:tiered:{base_id}"
        tier_data = self.redis.hgetall(tier_key)

        if not tier_data:
            return []

        tiers = json.loads(tier_data[b"tiers"])
        tracker = ProgressTracker(self.redis)
        unlocked_tiers = []

        for tier in tiers:
            tier_achievement_id = f"{base_id}_{tier['level']}"

            # Check if already unlocked
            if self.redis.sismember(
                f"player:{player_id}:achievements",
                tier_achievement_id
            ):
                continue

            # Update progress
            if new_value >= tier['target']:
                result = tracker.set_progress(
                    player_id,
                    tier_achievement_id,
                    new_value
                )
                if result.get("unlocked"):
                    unlocked_tiers.append({
                        "tier": tier['level'],
                        "name": tier['name'],
                        "points": tier['points']
                    })

        return unlocked_tiers

    def get_tiered_status(
        self,
        player_id: str,
        base_id: str
    ) -> Dict:
        """Get status of all tiers for a tiered achievement."""
        tier_key = f"achievement:tiered:{base_id}"
        tier_data = self.redis.hgetall(tier_key)

        if not tier_data:
            return None

        tiers = json.loads(tier_data[b"tiers"])
        progress_key = f"player:{player_id}:progress:{base_id}"
        current_progress = int(self.redis.get(progress_key) or 0)

        tier_statuses = []
        current_tier = None
        next_tier = None

        for tier in tiers:
            tier_id = f"{base_id}_{tier['level']}"
            is_unlocked = self.redis.sismember(
                f"player:{player_id}:achievements",
                tier_id
            )

            tier_status = {
                "level": tier['level'],
                "name": tier['name'],
                "target": tier['target'],
                "points": tier['points'],
                "unlocked": is_unlocked
            }
            tier_statuses.append(tier_status)

            if is_unlocked:
                current_tier = tier
            elif next_tier is None and not is_unlocked:
                next_tier = tier

        return {
            "base_id": base_id,
            "name": tier_data.get(b"name", b"").decode(),
            "current_progress": current_progress,
            "current_tier": current_tier,
            "next_tier": next_tier,
            "all_tiers": tier_statuses
        }
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');

class AchievementSystem {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
    }

    // Register an achievement
    async registerAchievement(achievement) {
        const key = `achievement:${achievement.id}`;

        await this.redis.hset(key, {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            type: achievement.type,
            target: achievement.target.toString(),
            points: achievement.points.toString(),
            category: achievement.category,
            hidden: achievement.hidden ? 'true' : 'false',
            iconUrl: achievement.iconUrl || ''
        });

        await this.redis.sadd('achievements:all', achievement.id);
        await this.redis.sadd(`achievements:category:${achievement.category}`, achievement.id);

        return true;
    }

    // Increment progress
    async incrementProgress(playerId, achievementId, amount = 1) {
        const progressKey = `player:${playerId}:progress:${achievementId}`;
        const unlockedKey = `player:${playerId}:achievements`;

        // Check if already unlocked
        const isUnlocked = await this.redis.sismember(unlockedKey, achievementId);
        if (isUnlocked) {
            return { alreadyUnlocked: true };
        }

        // Get achievement info
        const achievement = await this.redis.hgetall(`achievement:${achievementId}`);
        if (!achievement.id) {
            return { error: 'Achievement not found' };
        }

        // Increment
        const newProgress = await this.redis.incrby(progressKey, amount);
        const target = parseInt(achievement.target);

        const result = {
            achievementId,
            progress: newProgress,
            target,
            percentage: Math.min(100, (newProgress / target) * 100)
        };

        // Check for unlock
        if (newProgress >= target) {
            await this.unlockAchievement(playerId, achievementId, achievement);
            result.unlocked = true;
            result.pointsEarned = parseInt(achievement.points);
        }

        return result;
    }

    // Unlock achievement
    async unlockAchievement(playerId, achievementId, achievement) {
        const pipeline = this.redis.pipeline();
        const unlockTime = Date.now();

        // Add to unlocked set
        pipeline.sadd(`player:${playerId}:achievements`, achievementId);

        // Record unlock time
        pipeline.hset(`player:${playerId}:achievement_times`, achievementId, unlockTime);

        // Add points
        pipeline.incrby(`player:${playerId}:achievement_points`, parseInt(achievement.points));

        // Add to recent achievements
        const recentRecord = JSON.stringify({
            achievementId,
            name: achievement.name,
            points: achievement.points,
            unlockedAt: unlockTime
        });
        pipeline.lpush(`player:${playerId}:recent_achievements`, recentRecord);
        pipeline.ltrim(`player:${playerId}:recent_achievements`, 0, 49);

        await pipeline.exec();

        // Send notification
        await this.pubClient.publish(
            `player:${playerId}:notifications`,
            JSON.stringify({
                type: 'achievement_unlocked',
                achievementId,
                name: achievement.name,
                description: achievement.description,
                points: achievement.points,
                iconUrl: achievement.iconUrl,
                timestamp: unlockTime
            })
        );
    }

    // Get player's achievement status
    async getPlayerAchievements(playerId) {
        const [unlockedIds, totalPoints] = await Promise.all([
            this.redis.smembers(`player:${playerId}:achievements`),
            this.redis.get(`player:${playerId}:achievement_points`)
        ]);

        // Get all achievements
        const allAchievementIds = await this.redis.smembers('achievements:all');

        const achievements = await Promise.all(
            allAchievementIds.map(async (id) => {
                const achievement = await this.redis.hgetall(`achievement:${id}`);
                const progress = await this.redis.get(`player:${playerId}:progress:${id}`);
                const isUnlocked = unlockedIds.includes(id);
                const unlockTime = isUnlocked
                    ? await this.redis.hget(`player:${playerId}:achievement_times`, id)
                    : null;

                return {
                    ...achievement,
                    progress: parseInt(progress || 0),
                    unlocked: isUnlocked,
                    unlockedAt: unlockTime ? parseInt(unlockTime) : null
                };
            })
        );

        return {
            playerId,
            totalPoints: parseInt(totalPoints || 0),
            unlockedCount: unlockedIds.length,
            totalCount: allAchievementIds.length,
            achievements
        };
    }

    // Track collection items
    async collectItem(playerId, collectionId, itemIndex) {
        const bitmapKey = `player:${playerId}:collection:${collectionId}`;

        const wasSet = await this.redis.setbit(bitmapKey, itemIndex, 1);
        const collectedCount = await this.redis.bitcount(bitmapKey);

        return {
            collectionId,
            itemIndex,
            newItem: wasSet === 0,
            collectedCount
        };
    }

    // Track daily streaks
    async recordDailyStreak(playerId, streakType) {
        const streakKey = `player:${playerId}:streak:${streakType}`;
        const lastKey = `player:${playerId}:streak:${streakType}:last`;
        const bestKey = `player:${playerId}:streak:${streakType}:best`;

        const today = Math.floor(Date.now() / 86400000);
        const lastDay = parseInt(await this.redis.get(lastKey) || 0);

        let newStreak;

        if (lastDay === today) {
            // Already recorded
            const currentStreak = parseInt(await this.redis.get(streakKey) || 0);
            return {
                streakType,
                currentStreak,
                alreadyRecorded: true
            };
        } else if (lastDay === today - 1) {
            // Consecutive - increment
            newStreak = await this.redis.incr(streakKey);
        } else {
            // Broken - reset
            newStreak = 1;
            await this.redis.set(streakKey, 1);
        }

        await this.redis.set(lastKey, today);

        // Update best
        const bestStreak = parseInt(await this.redis.get(bestKey) || 0);
        if (newStreak > bestStreak) {
            await this.redis.set(bestKey, newStreak);
        }

        return {
            streakType,
            currentStreak: newStreak,
            bestStreak: Math.max(newStreak, bestStreak),
            alreadyRecorded: false
        };
    }
}

// Usage
const achievements = new AchievementSystem({ host: 'localhost', port: 6379 });

// Register achievements
await achievements.registerAchievement({
    id: 'first_kill',
    name: 'First Blood',
    description: 'Defeat your first enemy',
    type: 'counter',
    target: 1,
    points: 10,
    category: 'combat'
});

// Track progress
const result = await achievements.incrementProgress('player123', 'first_kill');
console.log(result);
```

## Achievement Leaderboards

Rank players by achievement points:

```python
class AchievementLeaderboard:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.leaderboard_key = "leaderboard:achievement_points"

    def update_player_score(self, player_id: str):
        """Update player's position on the leaderboard."""
        points = int(self.redis.get(f"player:{player_id}:achievement_points") or 0)
        unlocked_count = self.redis.scard(f"player:{player_id}:achievements")

        # Score combines points and completion count
        # Points are primary, completion breaks ties
        score = points + (unlocked_count / 10000)

        self.redis.zadd(self.leaderboard_key, {player_id: score})

    def get_leaderboard(
        self,
        start: int = 0,
        count: int = 100
    ) -> List[Dict]:
        """Get top players by achievement points."""
        entries = self.redis.zrevrange(
            self.leaderboard_key,
            start,
            start + count - 1,
            withscores=True
        )

        leaderboard = []
        for rank, (player_id, score) in enumerate(entries, start=start + 1):
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            points = int(score)
            unlocked = self.redis.scard(f"player:{player_id}:achievements")

            leaderboard.append({
                "rank": rank,
                "player_id": player_id,
                "points": points,
                "unlocked_count": unlocked
            })

        return leaderboard

    def get_player_rank(self, player_id: str) -> Dict:
        """Get a specific player's rank."""
        rank = self.redis.zrevrank(self.leaderboard_key, player_id)
        score = self.redis.zscore(self.leaderboard_key, player_id)

        if rank is None:
            return {"player_id": player_id, "rank": None}

        return {
            "player_id": player_id,
            "rank": rank + 1,
            "points": int(score) if score else 0
        }
```

## Best Practices

1. **Use atomic operations** - Redis transactions or Lua scripts prevent race conditions when updating progress.

2. **Implement idempotency** - Ensure the same action doesn't grant duplicate progress.

3. **Cache achievement definitions** - These rarely change; cache them in your application.

4. **Use TTLs for temporary data** - Streak tracking and temporary progress should have appropriate expiration.

5. **Batch progress updates** - If multiple achievements can progress from one action, batch the updates.

6. **Consider hidden achievements** - Don't expose hidden achievement names until unlocked.

7. **Monitor memory usage** - Bitmaps are efficient but can still grow; monitor collection sizes.

## Conclusion

Redis provides an excellent foundation for building achievement systems. Its data structures map naturally to achievement concepts - sets for unlocked achievements, strings/counters for progress, bitmaps for collections, and sorted sets for leaderboards. The combination of speed and pub/sub makes real-time achievement notifications seamless.

The key is choosing the right data structure for each achievement type and implementing proper validation to prevent cheating or duplicate unlocks.

For more gaming patterns with Redis, check out our guides on [Game State Management](/blog/redis-game-state-management) and [Real-Time Leaderboards](/blog/redis-sorted-sets-leaderboards).
