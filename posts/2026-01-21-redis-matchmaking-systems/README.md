# How to Build Matchmaking Systems with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Matchmaking, Sorted Sets, Real-Time, Multiplayer, Game Development

Description: A comprehensive guide to building scalable matchmaking systems with Redis, covering player queues, skill-based matching, lobby management, and real-time game pairing.

---

Matchmaking is the backbone of multiplayer gaming. A well-designed matchmaking system pairs players quickly, fairly, and efficiently. Redis excels at this task due to its in-memory performance, sorted sets for skill-based ordering, and pub/sub for real-time notifications. This guide covers building production-ready matchmaking systems with Redis.

## Understanding Matchmaking Requirements

Before diving into implementation, let's understand what makes a good matchmaking system:

1. **Low latency** - Players expect matches within seconds
2. **Fair matching** - Similar skill levels create enjoyable games
3. **Scalability** - Handle thousands of concurrent players
4. **Flexibility** - Support different game modes and regions
5. **Reliability** - Handle disconnections and timeouts gracefully

## Basic Architecture Overview

```
+------------+     +----------------+     +-------------+
|   Player   | --> |  Matchmaking   | --> |    Redis    |
|   Client   |     |    Service     |     |   Cluster   |
+------------+     +----------------+     +-------------+
                          |
                          v
                   +-------------+
                   | Game Server |
                   +-------------+
```

## Setting Up the Redis Data Structures

We'll use several Redis data structures for matchmaking:

- **Sorted Sets** - Player queues ordered by skill rating or wait time
- **Hashes** - Player metadata and preferences
- **Sets** - Active lobbies and matched groups
- **Pub/Sub** - Real-time match notifications

### Player Queue with Sorted Sets

```python
import redis
import time
import json
from typing import Optional, List, Dict
from dataclasses import dataclass

@dataclass
class Player:
    player_id: str
    skill_rating: int
    region: str
    game_mode: str
    queue_time: float

class MatchmakingQueue:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.queue_prefix = "matchmaking:queue"
        self.player_prefix = "matchmaking:player"
        self.lobby_prefix = "matchmaking:lobby"

    def add_player_to_queue(self, player: Player) -> bool:
        """Add a player to the matchmaking queue."""
        queue_key = f"{self.queue_prefix}:{player.region}:{player.game_mode}"
        player_key = f"{self.player_prefix}:{player.player_id}"

        # Store player metadata
        player_data = {
            "player_id": player.player_id,
            "skill_rating": player.skill_rating,
            "region": player.region,
            "game_mode": player.game_mode,
            "queue_time": player.queue_time
        }

        # Use pipeline for atomic operation
        pipe = self.redis.pipeline()

        # Store player info in hash
        pipe.hset(player_key, mapping=player_data)
        pipe.expire(player_key, 300)  # 5 minute TTL

        # Add to sorted set with skill rating as score
        pipe.zadd(queue_key, {player.player_id: player.skill_rating})

        pipe.execute()
        return True

    def remove_player_from_queue(self, player_id: str, region: str, game_mode: str) -> bool:
        """Remove a player from the matchmaking queue."""
        queue_key = f"{self.queue_prefix}:{region}:{game_mode}"
        player_key = f"{self.player_prefix}:{player_id}"

        pipe = self.redis.pipeline()
        pipe.zrem(queue_key, player_id)
        pipe.delete(player_key)
        pipe.execute()
        return True

    def get_queue_size(self, region: str, game_mode: str) -> int:
        """Get the current queue size."""
        queue_key = f"{self.queue_prefix}:{region}:{game_mode}"
        return self.redis.zcard(queue_key)
```

## Skill-Based Matching Algorithm

The core of matchmaking is finding players with similar skill levels:

```python
class SkillBasedMatcher:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.queue_prefix = "matchmaking:queue"
        self.player_prefix = "matchmaking:player"

        # Matching parameters
        self.initial_skill_range = 50
        self.max_skill_range = 500
        self.skill_range_expansion_rate = 25  # Per second
        self.players_per_match = 10  # 5v5 game

    def find_match(self, region: str, game_mode: str) -> Optional[List[str]]:
        """Find players for a match within skill range."""
        queue_key = f"{self.queue_prefix}:{region}:{game_mode}"

        # Get all players in queue
        players_with_scores = self.redis.zrange(
            queue_key, 0, -1, withscores=True
        )

        if len(players_with_scores) < self.players_per_match:
            return None

        # Try to find a valid match
        for anchor_id, anchor_skill in players_with_scores:
            anchor_id = anchor_id.decode() if isinstance(anchor_id, bytes) else anchor_id

            # Get anchor player's queue time for skill range expansion
            player_data = self.redis.hgetall(f"{self.player_prefix}:{anchor_id}")
            if not player_data:
                continue

            queue_time = float(player_data.get(b"queue_time", time.time()))
            wait_seconds = time.time() - queue_time

            # Calculate expanded skill range based on wait time
            skill_range = min(
                self.initial_skill_range + (wait_seconds * self.skill_range_expansion_rate),
                self.max_skill_range
            )

            # Find players within skill range
            min_skill = anchor_skill - skill_range
            max_skill = anchor_skill + skill_range

            candidates = self.redis.zrangebyscore(
                queue_key, min_skill, max_skill
            )

            if len(candidates) >= self.players_per_match:
                # Select players for the match
                selected = [
                    c.decode() if isinstance(c, bytes) else c
                    for c in candidates[:self.players_per_match]
                ]
                return selected

        return None

    def create_balanced_teams(self, player_ids: List[str]) -> Dict[str, List[str]]:
        """Create balanced teams from matched players."""
        # Get all player skill ratings
        players_with_skills = []
        for player_id in player_ids:
            player_data = self.redis.hgetall(f"{self.player_prefix}:{player_id}")
            if player_data:
                skill = int(player_data.get(b"skill_rating", 1000))
                players_with_skills.append((player_id, skill))

        # Sort by skill
        players_with_skills.sort(key=lambda x: x[1], reverse=True)

        # Alternate assignment for balance (snake draft)
        team_a = []
        team_b = []

        for i, (player_id, skill) in enumerate(players_with_skills):
            if i % 4 in [0, 3]:  # 0, 3, 4, 7, 8...
                team_a.append(player_id)
            else:  # 1, 2, 5, 6, 9...
                team_b.append(player_id)

        return {"team_a": team_a, "team_b": team_b}
```

## Lobby Management

Once players are matched, we need to manage game lobbies:

```python
import uuid

class LobbyManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.lobby_prefix = "matchmaking:lobby"
        self.player_lobby_prefix = "matchmaking:player_lobby"
        self.active_lobbies_key = "matchmaking:active_lobbies"

    def create_lobby(
        self,
        player_ids: List[str],
        teams: Dict[str, List[str]],
        game_mode: str,
        region: str
    ) -> str:
        """Create a new game lobby."""
        lobby_id = str(uuid.uuid4())
        lobby_key = f"{self.lobby_prefix}:{lobby_id}"

        lobby_data = {
            "lobby_id": lobby_id,
            "game_mode": game_mode,
            "region": region,
            "status": "waiting",  # waiting, ready, in_game, completed
            "created_at": time.time(),
            "team_a": json.dumps(teams["team_a"]),
            "team_b": json.dumps(teams["team_b"]),
            "ready_players": json.dumps([])
        }

        pipe = self.redis.pipeline()

        # Store lobby data
        pipe.hset(lobby_key, mapping=lobby_data)
        pipe.expire(lobby_key, 600)  # 10 minute TTL

        # Add to active lobbies set
        pipe.sadd(self.active_lobbies_key, lobby_id)

        # Map each player to the lobby
        for player_id in player_ids:
            pipe.set(
                f"{self.player_lobby_prefix}:{player_id}",
                lobby_id,
                ex=600
            )

        pipe.execute()

        # Notify players about the match
        self.notify_players(player_ids, lobby_id, lobby_data)

        return lobby_id

    def notify_players(
        self,
        player_ids: List[str],
        lobby_id: str,
        lobby_data: dict
    ):
        """Notify players about their match via pub/sub."""
        notification = {
            "type": "match_found",
            "lobby_id": lobby_id,
            "game_mode": lobby_data["game_mode"],
            "region": lobby_data["region"]
        }

        for player_id in player_ids:
            channel = f"player:notifications:{player_id}"
            self.redis.publish(channel, json.dumps(notification))

    def player_ready(self, player_id: str, lobby_id: str) -> Dict:
        """Mark a player as ready in the lobby."""
        lobby_key = f"{self.lobby_prefix}:{lobby_id}"

        # Get current ready players
        ready_json = self.redis.hget(lobby_key, "ready_players")
        ready_players = json.loads(ready_json) if ready_json else []

        if player_id not in ready_players:
            ready_players.append(player_id)

        # Update ready players
        self.redis.hset(lobby_key, "ready_players", json.dumps(ready_players))

        # Get all players
        team_a = json.loads(self.redis.hget(lobby_key, "team_a"))
        team_b = json.loads(self.redis.hget(lobby_key, "team_b"))
        all_players = team_a + team_b

        # Check if all players are ready
        all_ready = len(ready_players) == len(all_players)

        if all_ready:
            self.redis.hset(lobby_key, "status", "ready")
            self.start_game(lobby_id)

        return {
            "ready_count": len(ready_players),
            "total_players": len(all_players),
            "all_ready": all_ready
        }

    def start_game(self, lobby_id: str):
        """Start the game and allocate a game server."""
        lobby_key = f"{self.lobby_prefix}:{lobby_id}"

        self.redis.hset(lobby_key, "status", "in_game")

        # Get lobby data for game server
        lobby_data = self.redis.hgetall(lobby_key)

        # Publish game start notification
        team_a = json.loads(lobby_data[b"team_a"])
        team_b = json.loads(lobby_data[b"team_b"])
        all_players = team_a + team_b

        game_notification = {
            "type": "game_starting",
            "lobby_id": lobby_id,
            "server_ip": "192.168.1.100",  # Would come from server allocation
            "server_port": 7777
        }

        for player_id in all_players:
            channel = f"player:notifications:{player_id}"
            self.redis.publish(channel, json.dumps(game_notification))
```

## The Complete Matchmaking Service

Now let's put it all together with a background matchmaking worker:

```python
import threading
from typing import Set

class MatchmakingService:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.queue = MatchmakingQueue(redis_client)
        self.matcher = SkillBasedMatcher(redis_client)
        self.lobby_manager = LobbyManager(redis_client)
        self.running = False
        self.regions = ["na", "eu", "asia", "oceania"]
        self.game_modes = ["ranked", "casual", "competitive"]

    def start(self):
        """Start the matchmaking service."""
        self.running = True
        self.worker_thread = threading.Thread(target=self._matchmaking_loop)
        self.worker_thread.start()
        print("Matchmaking service started")

    def stop(self):
        """Stop the matchmaking service."""
        self.running = False
        self.worker_thread.join()
        print("Matchmaking service stopped")

    def _matchmaking_loop(self):
        """Main matchmaking loop."""
        while self.running:
            for region in self.regions:
                for game_mode in self.game_modes:
                    self._process_queue(region, game_mode)

            # Small delay to prevent CPU spinning
            time.sleep(0.1)

    def _process_queue(self, region: str, game_mode: str):
        """Process a specific queue for matches."""
        queue_size = self.queue.get_queue_size(region, game_mode)

        if queue_size < self.matcher.players_per_match:
            return

        # Try to find a match
        matched_players = self.matcher.find_match(region, game_mode)

        if matched_players:
            # Create balanced teams
            teams = self.matcher.create_balanced_teams(matched_players)

            # Create the lobby
            lobby_id = self.lobby_manager.create_lobby(
                matched_players, teams, game_mode, region
            )

            # Remove matched players from queue
            for player_id in matched_players:
                self.queue.remove_player_from_queue(player_id, region, game_mode)

            print(f"Match created: {lobby_id} with {len(matched_players)} players")

    def queue_player(
        self,
        player_id: str,
        skill_rating: int,
        region: str,
        game_mode: str
    ) -> Dict:
        """Add a player to the matchmaking queue."""
        player = Player(
            player_id=player_id,
            skill_rating=skill_rating,
            region=region,
            game_mode=game_mode,
            queue_time=time.time()
        )

        self.queue.add_player_to_queue(player)

        return {
            "status": "queued",
            "estimated_wait": self._estimate_wait_time(region, game_mode),
            "queue_position": self.queue.get_queue_size(region, game_mode)
        }

    def cancel_queue(self, player_id: str, region: str, game_mode: str) -> bool:
        """Remove a player from the queue."""
        return self.queue.remove_player_from_queue(player_id, region, game_mode)

    def _estimate_wait_time(self, region: str, game_mode: str) -> int:
        """Estimate wait time based on queue size."""
        queue_size = self.queue.get_queue_size(region, game_mode)

        # Simple estimation: more players = faster matches
        if queue_size >= self.matcher.players_per_match * 2:
            return 5  # seconds
        elif queue_size >= self.matcher.players_per_match:
            return 15
        else:
            return 60
```

## Node.js Implementation

Here's the same matchmaking system in Node.js:

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class MatchmakingService {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);

        this.queuePrefix = 'matchmaking:queue';
        this.playerPrefix = 'matchmaking:player';
        this.lobbyPrefix = 'matchmaking:lobby';

        // Configuration
        this.playersPerMatch = 10;
        this.initialSkillRange = 50;
        this.maxSkillRange = 500;
        this.skillRangeExpansionRate = 25;

        this.running = false;
    }

    async addPlayerToQueue(playerData) {
        const { playerId, skillRating, region, gameMode } = playerData;
        const queueKey = `${this.queuePrefix}:${region}:${gameMode}`;
        const playerKey = `${this.playerPrefix}:${playerId}`;

        const playerInfo = {
            playerId,
            skillRating: skillRating.toString(),
            region,
            gameMode,
            queueTime: Date.now().toString()
        };

        const pipeline = this.redis.pipeline();

        // Store player metadata
        pipeline.hset(playerKey, playerInfo);
        pipeline.expire(playerKey, 300);

        // Add to sorted set with skill as score
        pipeline.zadd(queueKey, skillRating, playerId);

        await pipeline.exec();

        return {
            status: 'queued',
            queueSize: await this.redis.zcard(queueKey)
        };
    }

    async findMatch(region, gameMode) {
        const queueKey = `${this.queuePrefix}:${region}:${gameMode}`;

        // Get all players with scores
        const playersWithScores = await this.redis.zrange(
            queueKey, 0, -1, 'WITHSCORES'
        );

        if (playersWithScores.length < this.playersPerMatch * 2) {
            return null;
        }

        // Parse into player objects
        const players = [];
        for (let i = 0; i < playersWithScores.length; i += 2) {
            players.push({
                playerId: playersWithScores[i],
                skill: parseFloat(playersWithScores[i + 1])
            });
        }

        // Find valid match using anchor player method
        for (const anchor of players) {
            const playerData = await this.redis.hgetall(
                `${this.playerPrefix}:${anchor.playerId}`
            );

            if (!playerData.queueTime) continue;

            const waitTime = (Date.now() - parseInt(playerData.queueTime)) / 1000;
            const skillRange = Math.min(
                this.initialSkillRange + (waitTime * this.skillRangeExpansionRate),
                this.maxSkillRange
            );

            const candidates = players.filter(p =>
                Math.abs(p.skill - anchor.skill) <= skillRange
            );

            if (candidates.length >= this.playersPerMatch) {
                return candidates.slice(0, this.playersPerMatch).map(p => p.playerId);
            }
        }

        return null;
    }

    createBalancedTeams(playerIds, playerSkills) {
        // Sort by skill descending
        const sorted = playerIds
            .map((id, i) => ({ id, skill: playerSkills[i] }))
            .sort((a, b) => b.skill - a.skill);

        // Snake draft for balance
        const teamA = [];
        const teamB = [];

        sorted.forEach((player, i) => {
            if (i % 4 === 0 || i % 4 === 3) {
                teamA.push(player.id);
            } else {
                teamB.push(player.id);
            }
        });

        return { teamA, teamB };
    }

    async createLobby(playerIds, teams, gameMode, region) {
        const lobbyId = uuidv4();
        const lobbyKey = `${this.lobbyPrefix}:${lobbyId}`;

        const lobbyData = {
            lobbyId,
            gameMode,
            region,
            status: 'waiting',
            createdAt: Date.now().toString(),
            teamA: JSON.stringify(teams.teamA),
            teamB: JSON.stringify(teams.teamB),
            readyPlayers: JSON.stringify([])
        };

        const pipeline = this.redis.pipeline();

        pipeline.hset(lobbyKey, lobbyData);
        pipeline.expire(lobbyKey, 600);

        // Map players to lobby
        for (const playerId of playerIds) {
            pipeline.setex(
                `${this.playerPrefix}:lobby:${playerId}`,
                600,
                lobbyId
            );
        }

        await pipeline.exec();

        // Notify players
        await this.notifyPlayers(playerIds, lobbyId, lobbyData);

        return lobbyId;
    }

    async notifyPlayers(playerIds, lobbyId, lobbyData) {
        const notification = {
            type: 'match_found',
            lobbyId,
            gameMode: lobbyData.gameMode,
            region: lobbyData.region
        };

        for (const playerId of playerIds) {
            await this.pubClient.publish(
                `player:notifications:${playerId}`,
                JSON.stringify(notification)
            );
        }
    }

    async processQueues() {
        const regions = ['na', 'eu', 'asia', 'oceania'];
        const gameModes = ['ranked', 'casual', 'competitive'];

        for (const region of regions) {
            for (const gameMode of gameModes) {
                const matchedPlayers = await this.findMatch(region, gameMode);

                if (matchedPlayers) {
                    // Get skill ratings for team balancing
                    const skills = await Promise.all(
                        matchedPlayers.map(async (id) => {
                            const data = await this.redis.hget(
                                `${this.playerPrefix}:${id}`,
                                'skillRating'
                            );
                            return parseInt(data) || 1000;
                        })
                    );

                    const teams = this.createBalancedTeams(matchedPlayers, skills);
                    const lobbyId = await this.createLobby(
                        matchedPlayers, teams, gameMode, region
                    );

                    // Remove from queue
                    const queueKey = `${this.queuePrefix}:${region}:${gameMode}`;
                    await this.redis.zrem(queueKey, ...matchedPlayers);

                    console.log(`Match created: ${lobbyId}`);
                }
            }
        }
    }

    start() {
        this.running = true;
        this.loop();
        console.log('Matchmaking service started');
    }

    async loop() {
        while (this.running) {
            await this.processQueues();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    stop() {
        this.running = false;
        console.log('Matchmaking service stopped');
    }
}

// Usage
const matchmaking = new MatchmakingService({ host: 'localhost', port: 6379 });

// Add a player to queue
await matchmaking.addPlayerToQueue({
    playerId: 'player123',
    skillRating: 1500,
    region: 'na',
    gameMode: 'ranked'
});

// Start the matchmaking service
matchmaking.start();
```

## Advanced Features

### 1. Party Matchmaking

Support for players queuing together:

```python
class PartyMatchmaking:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.party_prefix = "matchmaking:party"

    def create_party(self, leader_id: str, member_ids: List[str]) -> str:
        """Create a party for group queuing."""
        party_id = str(uuid.uuid4())
        party_key = f"{self.party_prefix}:{party_id}"

        all_members = [leader_id] + member_ids

        # Calculate average skill rating for the party
        total_skill = 0
        for member_id in all_members:
            player_data = self.redis.hgetall(f"player:{member_id}")
            skill = int(player_data.get(b"skill_rating", 1000))
            total_skill += skill

        avg_skill = total_skill // len(all_members)

        party_data = {
            "party_id": party_id,
            "leader_id": leader_id,
            "members": json.dumps(all_members),
            "avg_skill": avg_skill,
            "size": len(all_members)
        }

        self.redis.hset(party_key, mapping=party_data)
        self.redis.expire(party_key, 3600)  # 1 hour TTL

        return party_id

    def queue_party(
        self,
        party_id: str,
        region: str,
        game_mode: str
    ) -> bool:
        """Add a party to the matchmaking queue."""
        party_key = f"{self.party_prefix}:{party_id}"
        party_data = self.redis.hgetall(party_key)

        if not party_data:
            return False

        # Add party to sorted set with average skill
        queue_key = f"matchmaking:party_queue:{region}:{game_mode}"
        avg_skill = int(party_data[b"avg_skill"])

        self.redis.zadd(queue_key, {party_id: avg_skill})

        return True
```

### 2. Priority Queue for Returning Players

Give priority to players who had a failed match or disconnection:

```python
def add_player_with_priority(
    self,
    player: Player,
    priority_boost: int = 0
) -> bool:
    """Add player with optional priority boost."""
    queue_key = f"{self.queue_prefix}:{player.region}:{player.game_mode}"

    # Adjust score to include priority (negative for higher priority)
    adjusted_score = player.skill_rating - (priority_boost * 1000)

    # Use a separate priority queue for boosted players
    priority_key = f"{self.queue_prefix}:priority:{player.region}:{player.game_mode}"

    if priority_boost > 0:
        self.redis.zadd(priority_key, {player.player_id: adjusted_score})
        self.redis.expire(priority_key, 60)  # Priority expires quickly

    self.redis.zadd(queue_key, {player.player_id: player.skill_rating})

    return True
```

### 3. Real-Time Queue Status Updates

Keep players informed about their queue status:

```python
import asyncio

class QueueStatusUpdater:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def send_queue_updates(self, player_id: str, region: str, game_mode: str):
        """Send periodic queue status updates to a player."""
        queue_key = f"matchmaking:queue:{region}:{game_mode}"
        channel = f"player:queue_status:{player_id}"

        while True:
            # Get player's position in queue
            rank = self.redis.zrank(queue_key, player_id)

            if rank is None:
                # Player no longer in queue (matched or cancelled)
                break

            queue_size = self.redis.zcard(queue_key)

            status = {
                "type": "queue_status",
                "position": rank + 1,
                "total_in_queue": queue_size,
                "estimated_wait": self.estimate_wait(rank, queue_size)
            }

            self.redis.publish(channel, json.dumps(status))

            await asyncio.sleep(2)  # Update every 2 seconds

    def estimate_wait(self, position: int, queue_size: int) -> int:
        """Estimate wait time based on queue position."""
        if queue_size >= 20:
            return 5 + (position // 10) * 5
        elif queue_size >= 10:
            return 15 + (position // 5) * 10
        else:
            return 30 + position * 10
```

## Handling Edge Cases

### Timeout Handling

```python
def cleanup_stale_players(self, max_wait_time: int = 300):
    """Remove players who have been waiting too long."""
    current_time = time.time()

    for region in self.regions:
        for game_mode in self.game_modes:
            queue_key = f"{self.queue_prefix}:{region}:{game_mode}"

            # Get all players
            players = self.redis.zrange(queue_key, 0, -1)

            for player_id in players:
                player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
                player_data = self.redis.hgetall(f"{self.player_prefix}:{player_id}")

                if player_data:
                    queue_time = float(player_data.get(b"queue_time", current_time))
                    wait_time = current_time - queue_time

                    if wait_time > max_wait_time:
                        # Notify player and remove from queue
                        notification = {
                            "type": "queue_timeout",
                            "reason": "Maximum wait time exceeded"
                        }
                        self.redis.publish(
                            f"player:notifications:{player_id}",
                            json.dumps(notification)
                        )
                        self.redis.zrem(queue_key, player_id)
```

### Reconnection Handling

```python
def handle_player_reconnect(self, player_id: str) -> Optional[str]:
    """Handle a player reconnecting - check if they have an active lobby."""
    lobby_id = self.redis.get(f"{self.player_lobby_prefix}:{player_id}")

    if lobby_id:
        lobby_id = lobby_id.decode() if isinstance(lobby_id, bytes) else lobby_id
        lobby_data = self.redis.hgetall(f"{self.lobby_prefix}:{lobby_id}")

        if lobby_data and lobby_data.get(b"status") != b"completed":
            # Player has an active lobby - rejoin them
            return lobby_id

    return None
```

## Monitoring and Metrics

Track matchmaking performance with Redis:

```python
class MatchmakingMetrics:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.metrics_prefix = "matchmaking:metrics"

    def record_match_created(self, region: str, game_mode: str, wait_times: List[float]):
        """Record metrics when a match is created."""
        timestamp = int(time.time())
        minute_bucket = timestamp - (timestamp % 60)

        pipe = self.redis.pipeline()

        # Increment match count
        pipe.incr(f"{self.metrics_prefix}:matches:{region}:{game_mode}:{minute_bucket}")

        # Record average wait time
        avg_wait = sum(wait_times) / len(wait_times)
        pipe.lpush(f"{self.metrics_prefix}:wait_times:{region}:{game_mode}", avg_wait)
        pipe.ltrim(f"{self.metrics_prefix}:wait_times:{region}:{game_mode}", 0, 999)

        pipe.execute()

    def get_queue_stats(self, region: str, game_mode: str) -> Dict:
        """Get current queue statistics."""
        queue_key = f"matchmaking:queue:{region}:{game_mode}"

        return {
            "queue_size": self.redis.zcard(queue_key),
            "avg_wait_time": self._calculate_avg_wait_time(region, game_mode),
            "matches_last_hour": self._get_matches_last_hour(region, game_mode)
        }

    def _calculate_avg_wait_time(self, region: str, game_mode: str) -> float:
        """Calculate average wait time from recent matches."""
        wait_times = self.redis.lrange(
            f"{self.metrics_prefix}:wait_times:{region}:{game_mode}",
            0, 99
        )

        if not wait_times:
            return 0

        times = [float(t) for t in wait_times]
        return sum(times) / len(times)

    def _get_matches_last_hour(self, region: str, game_mode: str) -> int:
        """Get number of matches created in the last hour."""
        current_time = int(time.time())
        total = 0

        for i in range(60):
            minute_bucket = current_time - (current_time % 60) - (i * 60)
            count = self.redis.get(
                f"{self.metrics_prefix}:matches:{region}:{game_mode}:{minute_bucket}"
            )
            if count:
                total += int(count)

        return total
```

## Best Practices

1. **Use Redis Cluster** for high-volume matchmaking systems to handle the load across multiple nodes.

2. **Implement graceful degradation** - if the matchmaking service is overwhelmed, expand skill ranges faster or reduce match quality requirements temporarily.

3. **Monitor queue health** - alert on unusually long queue times or empty queues in popular regions.

4. **Test with realistic loads** - simulate thousands of concurrent players to find bottlenecks.

5. **Use TTLs everywhere** - prevent stale data from accumulating if cleanup processes fail.

6. **Consider geographic distribution** - use Redis replication or separate instances per region for lower latency.

## Conclusion

Redis provides an excellent foundation for building matchmaking systems. Its sorted sets enable efficient skill-based matching, pub/sub delivers real-time notifications, and its in-memory performance ensures low-latency queue operations. By combining these features with thoughtful algorithm design, you can build matchmaking systems that keep players engaged and matches fair.

The key is balancing match quality with queue times - players want fair matches but won't wait forever. Implement expanding skill ranges, priority queues for players with long waits, and comprehensive monitoring to achieve this balance.

For more on Redis data structures and patterns, check out our other guides on [Redis Sorted Sets](/blog/redis-sorted-sets-leaderboards) and [Real-Time Notifications](/blog/redis-realtime-notifications).
