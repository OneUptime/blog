# How to Implement Game State Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Game State, Real-Time, Turn-Based, Multiplayer, Session Management, Game Development

Description: A comprehensive guide to managing game state with Redis for both turn-based and real-time multiplayer games, covering state synchronization, persistence, and conflict resolution.

---

Game state management is one of the most challenging aspects of multiplayer game development. Whether you're building a turn-based strategy game or a fast-paced real-time action game, Redis provides the performance and data structures needed to handle game state efficiently. This guide covers implementing robust game state management for various game types.

## Understanding Game State

Game state encompasses everything about the current situation in a game:

- **Player positions and attributes** - Health, inventory, location
- **World state** - Map objects, NPCs, environmental conditions
- **Match state** - Score, time remaining, current turn
- **Action history** - Moves, events, for replay and validation

Different game types have different state requirements:

| Game Type | Update Frequency | Consistency | Latency Tolerance |
|-----------|------------------|-------------|-------------------|
| Turn-based | Low (seconds) | Strong | High (1-5s) |
| Real-time | High (60Hz) | Eventual | Very Low (<50ms) |
| Hybrid | Medium | Strong/Eventual | Medium (100-500ms) |

## Data Structure Design

### Basic Game State Schema

```python
import redis
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class GamePhase(Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    FINISHED = "finished"

@dataclass
class PlayerState:
    player_id: str
    position_x: float
    position_y: float
    health: int
    max_health: int
    score: int
    is_alive: bool
    team: str
    last_action_time: float

@dataclass
class GameState:
    game_id: str
    phase: GamePhase
    current_turn: int
    turn_player_id: Optional[str]
    players: Dict[str, PlayerState]
    world_objects: Dict[str, Any]
    started_at: float
    last_update: float
    winner: Optional[str]
```

### Redis Key Structure

```python
class GameStateKeys:
    """Redis key patterns for game state management."""

    @staticmethod
    def game_info(game_id: str) -> str:
        return f"game:{game_id}:info"

    @staticmethod
    def game_players(game_id: str) -> str:
        return f"game:{game_id}:players"

    @staticmethod
    def player_state(game_id: str, player_id: str) -> str:
        return f"game:{game_id}:player:{player_id}"

    @staticmethod
    def world_state(game_id: str) -> str:
        return f"game:{game_id}:world"

    @staticmethod
    def action_history(game_id: str) -> str:
        return f"game:{game_id}:actions"

    @staticmethod
    def player_active_game(player_id: str) -> str:
        return f"player:{player_id}:active_game"
```

## Turn-Based Game State Management

Turn-based games require strong consistency and clear turn order:

```python
class TurnBasedGameManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = GameStateKeys()

    def create_game(
        self,
        game_id: str,
        player_ids: List[str],
        game_config: Dict
    ) -> Dict:
        """Create a new turn-based game."""
        # Initialize player states
        players = {}
        for i, player_id in enumerate(player_ids):
            players[player_id] = asdict(PlayerState(
                player_id=player_id,
                position_x=game_config.get("spawn_points", [[0, 0]])[i % len(game_config.get("spawn_points", [[0, 0]]))][0],
                position_y=game_config.get("spawn_points", [[0, 0]])[i % len(game_config.get("spawn_points", [[0, 0]]))][1],
                health=game_config.get("starting_health", 100),
                max_health=game_config.get("starting_health", 100),
                score=0,
                is_alive=True,
                team=f"team_{i % 2}",
                last_action_time=time.time()
            ))

        game_info = {
            "game_id": game_id,
            "phase": GamePhase.WAITING.value,
            "current_turn": 0,
            "turn_player_id": player_ids[0],
            "turn_order": json.dumps(player_ids),
            "turn_time_limit": game_config.get("turn_time_limit", 60),
            "started_at": time.time(),
            "last_update": time.time(),
            "winner": ""
        }

        pipe = self.redis.pipeline()

        # Store game info
        pipe.hset(self.keys.game_info(game_id), mapping=game_info)

        # Store player states
        for player_id, state in players.items():
            pipe.hset(
                self.keys.player_state(game_id, player_id),
                mapping={k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) for k, v in state.items()}
            )
            # Map player to game
            pipe.set(self.keys.player_active_game(player_id), game_id)

        # Add players to game's player set
        pipe.sadd(self.keys.game_players(game_id), *player_ids)

        # Set TTL for all keys (2 hours)
        pipe.expire(self.keys.game_info(game_id), 7200)
        pipe.expire(self.keys.game_players(game_id), 7200)

        pipe.execute()

        return {"game_id": game_id, "players": players}

    def start_game(self, game_id: str) -> bool:
        """Start the game - transition from waiting to in_progress."""
        game_info_key = self.keys.game_info(game_id)

        # Use WATCH for optimistic locking
        with self.redis.pipeline() as pipe:
            try:
                pipe.watch(game_info_key)

                current_phase = self.redis.hget(game_info_key, "phase")
                if current_phase != b"waiting":
                    pipe.unwatch()
                    return False

                pipe.multi()
                pipe.hset(game_info_key, mapping={
                    "phase": GamePhase.IN_PROGRESS.value,
                    "started_at": time.time(),
                    "last_update": time.time()
                })
                pipe.execute()
                return True

            except redis.WatchError:
                return False

    def process_turn(
        self,
        game_id: str,
        player_id: str,
        action: Dict
    ) -> Dict:
        """Process a player's turn action."""
        game_info_key = self.keys.game_info(game_id)
        player_state_key = self.keys.player_state(game_id, player_id)
        actions_key = self.keys.action_history(game_id)

        # Verify it's this player's turn
        current_turn_player = self.redis.hget(game_info_key, "turn_player_id")
        if current_turn_player and current_turn_player.decode() != player_id:
            return {"error": "Not your turn", "success": False}

        # Get current player state
        player_state = self.redis.hgetall(player_state_key)
        if not player_state:
            return {"error": "Player not found", "success": False}

        # Process the action
        result = self._execute_action(game_id, player_id, action, player_state)

        if result["success"]:
            # Record action in history
            action_record = {
                "turn": self.redis.hget(game_info_key, "current_turn"),
                "player_id": player_id,
                "action": action,
                "timestamp": time.time(),
                "result": result
            }
            self.redis.lpush(actions_key, json.dumps(action_record))

            # Advance to next turn
            self._advance_turn(game_id)

        return result

    def _execute_action(
        self,
        game_id: str,
        player_id: str,
        action: Dict,
        player_state: Dict
    ) -> Dict:
        """Execute a game action and update state."""
        action_type = action.get("type")

        if action_type == "move":
            return self._handle_move(game_id, player_id, action, player_state)
        elif action_type == "attack":
            return self._handle_attack(game_id, player_id, action, player_state)
        elif action_type == "use_item":
            return self._handle_use_item(game_id, player_id, action, player_state)
        else:
            return {"error": f"Unknown action type: {action_type}", "success": False}

    def _handle_move(
        self,
        game_id: str,
        player_id: str,
        action: Dict,
        player_state: Dict
    ) -> Dict:
        """Handle player movement."""
        new_x = action.get("x", 0)
        new_y = action.get("y", 0)

        # Validate movement (e.g., check bounds, obstacles)
        if not self._is_valid_position(game_id, new_x, new_y):
            return {"error": "Invalid position", "success": False}

        # Update player position
        player_state_key = self.keys.player_state(game_id, player_id)
        self.redis.hset(player_state_key, mapping={
            "position_x": str(new_x),
            "position_y": str(new_y),
            "last_action_time": str(time.time())
        })

        return {
            "success": True,
            "new_position": {"x": new_x, "y": new_y}
        }

    def _handle_attack(
        self,
        game_id: str,
        player_id: str,
        action: Dict,
        player_state: Dict
    ) -> Dict:
        """Handle attack action."""
        target_id = action.get("target_id")
        target_state_key = self.keys.player_state(game_id, target_id)

        target_state = self.redis.hgetall(target_state_key)
        if not target_state:
            return {"error": "Target not found", "success": False}

        # Calculate damage
        damage = action.get("damage", 10)
        current_health = int(target_state.get(b"health", 0))
        new_health = max(0, current_health - damage)

        # Update target health
        updates = {"health": str(new_health), "last_action_time": str(time.time())}
        if new_health <= 0:
            updates["is_alive"] = "False"

        self.redis.hset(target_state_key, mapping=updates)

        # Update attacker's score if target eliminated
        if new_health <= 0:
            attacker_state_key = self.keys.player_state(game_id, player_id)
            self.redis.hincrby(attacker_state_key, "score", 100)

            # Check for game over
            self._check_game_over(game_id)

        return {
            "success": True,
            "damage_dealt": damage,
            "target_health": new_health,
            "target_eliminated": new_health <= 0
        }

    def _advance_turn(self, game_id: str):
        """Advance to the next player's turn."""
        game_info_key = self.keys.game_info(game_id)

        turn_order = json.loads(self.redis.hget(game_info_key, "turn_order"))
        current_turn = int(self.redis.hget(game_info_key, "current_turn"))

        # Find next alive player
        next_turn = current_turn + 1
        next_index = next_turn % len(turn_order)

        # Skip eliminated players
        checked = 0
        while checked < len(turn_order):
            next_player_id = turn_order[next_index]
            player_state = self.redis.hgetall(
                self.keys.player_state(game_id, next_player_id)
            )

            if player_state.get(b"is_alive", b"True") == b"True":
                break

            next_index = (next_index + 1) % len(turn_order)
            next_turn += 1
            checked += 1

        # Update turn info
        self.redis.hset(game_info_key, mapping={
            "current_turn": next_turn,
            "turn_player_id": turn_order[next_index],
            "last_update": time.time()
        })

        # Notify players about turn change
        self._notify_turn_change(game_id, turn_order[next_index])

    def _notify_turn_change(self, game_id: str, next_player_id: str):
        """Publish turn change notification."""
        notification = {
            "type": "turn_change",
            "game_id": game_id,
            "next_player": next_player_id,
            "timestamp": time.time()
        }
        self.redis.publish(f"game:{game_id}:events", json.dumps(notification))

    def _check_game_over(self, game_id: str):
        """Check if the game has ended."""
        players = self.redis.smembers(self.keys.game_players(game_id))

        alive_players = []
        for player_id in players:
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            state = self.redis.hgetall(self.keys.player_state(game_id, player_id))
            if state.get(b"is_alive") == b"True":
                alive_players.append(player_id)

        if len(alive_players) <= 1:
            winner = alive_players[0] if alive_players else None
            self._end_game(game_id, winner)

    def _end_game(self, game_id: str, winner: Optional[str]):
        """End the game and record results."""
        game_info_key = self.keys.game_info(game_id)

        self.redis.hset(game_info_key, mapping={
            "phase": GamePhase.FINISHED.value,
            "winner": winner or "",
            "ended_at": time.time(),
            "last_update": time.time()
        })

        # Notify all players
        notification = {
            "type": "game_over",
            "game_id": game_id,
            "winner": winner,
            "timestamp": time.time()
        }
        self.redis.publish(f"game:{game_id}:events", json.dumps(notification))

    def _is_valid_position(self, game_id: str, x: float, y: float) -> bool:
        """Validate if a position is valid."""
        # Check world bounds
        if x < 0 or y < 0 or x > 1000 or y > 1000:
            return False
        return True

    def get_game_state(self, game_id: str) -> Dict:
        """Get the complete game state."""
        game_info = self.redis.hgetall(self.keys.game_info(game_id))
        if not game_info:
            return None

        # Get all player states
        players = {}
        player_ids = self.redis.smembers(self.keys.game_players(game_id))
        for player_id in player_ids:
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            state = self.redis.hgetall(self.keys.player_state(game_id, player_id))
            players[player_id] = {
                k.decode(): v.decode() for k, v in state.items()
            }

        return {
            "game_info": {k.decode(): v.decode() for k, v in game_info.items()},
            "players": players
        }
```

## Real-Time Game State Management

Real-time games require high-frequency updates and eventual consistency:

```python
import asyncio
from typing import Callable

class RealTimeGameManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = GameStateKeys()
        self.tick_rate = 60  # Updates per second
        self.interpolation_delay = 100  # ms

    def create_game(self, game_id: str, player_ids: List[str]) -> Dict:
        """Create a real-time game session."""
        game_info = {
            "game_id": game_id,
            "phase": GamePhase.WAITING.value,
            "tick": 0,
            "started_at": 0,
            "last_update": time.time()
        }

        pipe = self.redis.pipeline()
        pipe.hset(self.keys.game_info(game_id), mapping=game_info)
        pipe.sadd(self.keys.game_players(game_id), *player_ids)
        pipe.expire(self.keys.game_info(game_id), 3600)
        pipe.execute()

        return {"game_id": game_id}

    def update_player_position(
        self,
        game_id: str,
        player_id: str,
        x: float,
        y: float,
        velocity_x: float = 0,
        velocity_y: float = 0,
        client_tick: int = 0
    ) -> Dict:
        """Update player position with velocity for interpolation."""
        player_key = self.keys.player_state(game_id, player_id)

        state_update = {
            "position_x": str(x),
            "position_y": str(y),
            "velocity_x": str(velocity_x),
            "velocity_y": str(velocity_y),
            "last_update_tick": str(client_tick),
            "last_update_time": str(time.time())
        }

        # Use Lua script for atomic update with validation
        lua_script = """
        local key = KEYS[1]
        local x = tonumber(ARGV[1])
        local y = tonumber(ARGV[2])

        -- Validate bounds
        if x < 0 or x > 10000 or y < 0 or y > 10000 then
            return 0
        end

        -- Update state
        redis.call('HSET', key, 'position_x', ARGV[1])
        redis.call('HSET', key, 'position_y', ARGV[2])
        redis.call('HSET', key, 'velocity_x', ARGV[3])
        redis.call('HSET', key, 'velocity_y', ARGV[4])
        redis.call('HSET', key, 'last_update_tick', ARGV[5])
        redis.call('HSET', key, 'last_update_time', ARGV[6])

        return 1
        """

        result = self.redis.eval(
            lua_script,
            1,
            player_key,
            x, y, velocity_x, velocity_y, client_tick, time.time()
        )

        # Publish position update for other clients
        if result:
            update = {
                "type": "position_update",
                "player_id": player_id,
                "x": x,
                "y": y,
                "vx": velocity_x,
                "vy": velocity_y,
                "tick": client_tick
            }
            self.redis.publish(f"game:{game_id}:state", json.dumps(update))

        return {"success": bool(result)}

    def batch_update_state(
        self,
        game_id: str,
        updates: List[Dict]
    ) -> Dict:
        """Batch update multiple player states for efficiency."""
        pipe = self.redis.pipeline()

        for update in updates:
            player_id = update["player_id"]
            player_key = self.keys.player_state(game_id, player_id)

            # Flatten the update for Redis hash
            flat_update = {}
            for key, value in update.items():
                if key != "player_id":
                    flat_update[key] = str(value) if not isinstance(value, str) else value

            if flat_update:
                pipe.hset(player_key, mapping=flat_update)

        pipe.execute()

        # Publish batch update
        notification = {
            "type": "batch_update",
            "updates": updates,
            "timestamp": time.time()
        }
        self.redis.publish(f"game:{game_id}:state", json.dumps(notification))

        return {"success": True, "updated_count": len(updates)}

    def get_state_snapshot(self, game_id: str) -> Dict:
        """Get a snapshot of all player states for initial sync."""
        player_ids = self.redis.smembers(self.keys.game_players(game_id))

        if not player_ids:
            return {"players": {}}

        pipe = self.redis.pipeline()
        for player_id in player_ids:
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            pipe.hgetall(self.keys.player_state(game_id, player_id))

        results = pipe.execute()

        players = {}
        for player_id, state in zip(player_ids, results):
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            if state:
                players[player_id] = {
                    k.decode(): v.decode() for k, v in state.items()
                }

        return {"players": players, "timestamp": time.time()}

    def subscribe_to_updates(
        self,
        game_id: str,
        callback: Callable[[Dict], None]
    ):
        """Subscribe to game state updates."""
        pubsub = self.redis.pubsub()
        pubsub.subscribe(f"game:{game_id}:state")

        for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                callback(data)
```

## Delta State Updates

For bandwidth efficiency, send only state changes:

```python
class DeltaStateManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.snapshot_interval = 60  # Full snapshot every 60 ticks

    def compute_delta(
        self,
        game_id: str,
        player_id: str,
        new_state: Dict
    ) -> Dict:
        """Compute delta between current and new state."""
        player_key = f"game:{game_id}:player:{player_id}"
        current_state = self.redis.hgetall(player_key)

        delta = {}
        for key, new_value in new_state.items():
            current_value = current_state.get(key.encode())
            if current_value is None or current_value.decode() != str(new_value):
                delta[key] = new_value

        return delta

    def apply_delta(
        self,
        game_id: str,
        player_id: str,
        delta: Dict
    ) -> bool:
        """Apply a delta update to player state."""
        if not delta:
            return True

        player_key = f"game:{game_id}:player:{player_id}"

        # Convert all values to strings for Redis
        string_delta = {k: str(v) for k, v in delta.items()}
        self.redis.hset(player_key, mapping=string_delta)

        return True

    def store_and_broadcast_delta(
        self,
        game_id: str,
        player_id: str,
        delta: Dict,
        tick: int
    ):
        """Store delta and broadcast to other players."""
        if not delta:
            return

        # Apply to state
        self.apply_delta(game_id, player_id, delta)

        # Store in delta history for late joiners
        delta_record = {
            "player_id": player_id,
            "tick": tick,
            "delta": delta,
            "timestamp": time.time()
        }

        delta_key = f"game:{game_id}:deltas"
        pipe = self.redis.pipeline()
        pipe.lpush(delta_key, json.dumps(delta_record))
        pipe.ltrim(delta_key, 0, 999)  # Keep last 1000 deltas
        pipe.execute()

        # Broadcast delta
        self.redis.publish(
            f"game:{game_id}:deltas",
            json.dumps(delta_record)
        )

    def get_deltas_since(self, game_id: str, since_tick: int) -> List[Dict]:
        """Get all deltas since a specific tick."""
        delta_key = f"game:{game_id}:deltas"
        all_deltas = self.redis.lrange(delta_key, 0, -1)

        relevant_deltas = []
        for delta_json in all_deltas:
            delta = json.loads(delta_json)
            if delta["tick"] > since_tick:
                relevant_deltas.append(delta)

        return sorted(relevant_deltas, key=lambda d: d["tick"])
```

## Node.js Implementation

Here's the real-time game state manager in Node.js:

```javascript
const Redis = require('ioredis');

class GameStateManager {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
    }

    // Create a new game
    async createGame(gameId, playerIds, config = {}) {
        const gameInfo = {
            gameId,
            phase: 'waiting',
            tick: '0',
            maxPlayers: config.maxPlayers || 10,
            createdAt: Date.now().toString(),
            lastUpdate: Date.now().toString()
        };

        const pipeline = this.redis.pipeline();

        pipeline.hset(`game:${gameId}:info`, gameInfo);
        pipeline.expire(`game:${gameId}:info`, 3600);

        // Initialize player states
        for (const playerId of playerIds) {
            const playerState = {
                playerId,
                positionX: '0',
                positionY: '0',
                velocityX: '0',
                velocityY: '0',
                health: '100',
                score: '0',
                isAlive: 'true',
                lastUpdate: Date.now().toString()
            };

            pipeline.hset(`game:${gameId}:player:${playerId}`, playerState);
            pipeline.sadd(`game:${gameId}:players`, playerId);
        }

        await pipeline.exec();

        return { gameId, playerIds };
    }

    // Update player position with validation
    async updatePlayerPosition(gameId, playerId, position) {
        const { x, y, vx = 0, vy = 0, tick } = position;

        // Lua script for atomic update with server-side validation
        const luaScript = `
            local playerKey = KEYS[1]
            local x = tonumber(ARGV[1])
            local y = tonumber(ARGV[2])
            local vx = tonumber(ARGV[3])
            local vy = tonumber(ARGV[4])
            local tick = ARGV[5]
            local timestamp = ARGV[6]

            -- Validate position bounds
            if x < 0 or x > 10000 or y < 0 or y > 10000 then
                return cjson.encode({success = false, error = "Out of bounds"})
            end

            -- Check if player is alive
            local isAlive = redis.call('HGET', playerKey, 'isAlive')
            if isAlive ~= 'true' then
                return cjson.encode({success = false, error = "Player is dead"})
            end

            -- Speed validation (prevent speedhacking)
            local lastX = tonumber(redis.call('HGET', playerKey, 'positionX') or 0)
            local lastY = tonumber(redis.call('HGET', playerKey, 'positionY') or 0)
            local distance = math.sqrt((x - lastX)^2 + (y - lastY)^2)
            local maxSpeed = 100 -- units per update

            if distance > maxSpeed then
                return cjson.encode({success = false, error = "Speed violation"})
            end

            -- Update state
            redis.call('HMSET', playerKey,
                'positionX', x,
                'positionY', y,
                'velocityX', vx,
                'velocityY', vy,
                'lastTick', tick,
                'lastUpdate', timestamp
            )

            return cjson.encode({success = true, x = x, y = y})
        `;

        const result = await this.redis.eval(
            luaScript,
            1,
            `game:${gameId}:player:${playerId}`,
            x, y, vx, vy, tick, Date.now()
        );

        const parsed = JSON.parse(result);

        if (parsed.success) {
            // Broadcast to other players
            await this.pubClient.publish(`game:${gameId}:state`, JSON.stringify({
                type: 'position',
                playerId,
                x, y, vx, vy, tick,
                timestamp: Date.now()
            }));
        }

        return parsed;
    }

    // Handle damage/combat
    async applyDamage(gameId, attackerId, targetId, damage) {
        const luaScript = `
            local attackerKey = KEYS[1]
            local targetKey = KEYS[2]
            local damage = tonumber(ARGV[1])

            -- Check attacker is alive
            local attackerAlive = redis.call('HGET', attackerKey, 'isAlive')
            if attackerAlive ~= 'true' then
                return cjson.encode({success = false, error = "Attacker is dead"})
            end

            -- Check target is alive
            local targetAlive = redis.call('HGET', targetKey, 'isAlive')
            if targetAlive ~= 'true' then
                return cjson.encode({success = false, error = "Target already dead"})
            end

            -- Apply damage
            local currentHealth = tonumber(redis.call('HGET', targetKey, 'health') or 0)
            local newHealth = math.max(0, currentHealth - damage)

            redis.call('HSET', targetKey, 'health', newHealth)

            local eliminated = false
            if newHealth <= 0 then
                redis.call('HSET', targetKey, 'isAlive', 'false')
                -- Award score to attacker
                redis.call('HINCRBY', attackerKey, 'score', 100)
                eliminated = true
            end

            return cjson.encode({
                success = true,
                damage = damage,
                newHealth = newHealth,
                eliminated = eliminated
            })
        `;

        const result = await this.redis.eval(
            luaScript,
            2,
            `game:${gameId}:player:${attackerId}`,
            `game:${gameId}:player:${targetId}`,
            damage
        );

        const parsed = JSON.parse(result);

        if (parsed.success) {
            await this.pubClient.publish(`game:${gameId}:events`, JSON.stringify({
                type: 'damage',
                attackerId,
                targetId,
                damage: parsed.damage,
                newHealth: parsed.newHealth,
                eliminated: parsed.eliminated,
                timestamp: Date.now()
            }));
        }

        return parsed;
    }

    // Get full game state
    async getGameState(gameId) {
        const playerIds = await this.redis.smembers(`game:${gameId}:players`);

        if (!playerIds.length) {
            return null;
        }

        const pipeline = this.redis.pipeline();
        pipeline.hgetall(`game:${gameId}:info`);

        for (const playerId of playerIds) {
            pipeline.hgetall(`game:${gameId}:player:${playerId}`);
        }

        const results = await pipeline.exec();
        const gameInfo = results[0][1];
        const players = {};

        for (let i = 1; i < results.length; i++) {
            const playerState = results[i][1];
            if (playerState && playerState.playerId) {
                players[playerState.playerId] = playerState;
            }
        }

        return {
            gameInfo,
            players,
            timestamp: Date.now()
        };
    }

    // Subscribe to game updates
    subscribeToGame(gameId, callback) {
        this.subClient.subscribe(`game:${gameId}:state`, `game:${gameId}:events`);

        this.subClient.on('message', (channel, message) => {
            const data = JSON.parse(message);
            callback(channel, data);
        });

        return () => {
            this.subClient.unsubscribe(`game:${gameId}:state`, `game:${gameId}:events`);
        };
    }
}

// Usage example
const gameManager = new GameStateManager({ host: 'localhost', port: 6379 });

// Create a game
const game = await gameManager.createGame('game123', ['player1', 'player2']);

// Update player position
await gameManager.updatePlayerPosition('game123', 'player1', {
    x: 100,
    y: 200,
    vx: 5,
    vy: 0,
    tick: 1
});

// Subscribe to updates
gameManager.subscribeToGame('game123', (channel, data) => {
    console.log(`Received on ${channel}:`, data);
});
```

## Handling State Synchronization

### Server Reconciliation

Handle client prediction and server authority:

```python
class StateReconciliation:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def store_client_input(
        self,
        game_id: str,
        player_id: str,
        input_data: Dict
    ):
        """Store client input for reconciliation."""
        input_key = f"game:{game_id}:player:{player_id}:inputs"

        input_record = {
            "sequence": input_data["sequence"],
            "timestamp": time.time(),
            "inputs": json.dumps(input_data["inputs"])
        }

        pipe = self.redis.pipeline()
        pipe.lpush(input_key, json.dumps(input_record))
        pipe.ltrim(input_key, 0, 59)  # Keep last 60 inputs (1 second at 60Hz)
        pipe.execute()

    def get_authoritative_state(
        self,
        game_id: str,
        player_id: str,
        client_sequence: int
    ) -> Dict:
        """Get authoritative state with input acknowledgment."""
        player_key = f"game:{game_id}:player:{player_id}"

        state = self.redis.hgetall(player_key)
        if not state:
            return None

        return {
            "state": {k.decode(): v.decode() for k, v in state.items()},
            "acknowledged_sequence": client_sequence,
            "server_time": time.time()
        }

    def validate_and_correct(
        self,
        game_id: str,
        player_id: str,
        client_state: Dict,
        server_state: Dict
    ) -> Dict:
        """Validate client state against server and return corrections."""
        corrections = {}
        threshold = 0.5  # Position tolerance

        client_x = float(client_state.get("position_x", 0))
        client_y = float(client_state.get("position_y", 0))
        server_x = float(server_state.get("position_x", 0))
        server_y = float(server_state.get("position_y", 0))

        distance = ((client_x - server_x) ** 2 + (client_y - server_y) ** 2) ** 0.5

        if distance > threshold:
            corrections["position_x"] = server_x
            corrections["position_y"] = server_y
            corrections["needs_correction"] = True
        else:
            corrections["needs_correction"] = False

        return corrections
```

## Game State Persistence

Save game state for crash recovery or game saving:

```python
class GameStatePersistence:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def save_checkpoint(self, game_id: str) -> str:
        """Save a game checkpoint."""
        checkpoint_id = f"{game_id}:{int(time.time())}"
        checkpoint_key = f"checkpoint:{checkpoint_id}"

        # Get all game data
        game_info = self.redis.hgetall(f"game:{game_id}:info")
        players = self.redis.smembers(f"game:{game_id}:players")

        player_states = {}
        for player_id in players:
            player_id = player_id.decode() if isinstance(player_id, bytes) else player_id
            state = self.redis.hgetall(f"game:{game_id}:player:{player_id}")
            player_states[player_id] = {
                k.decode(): v.decode() for k, v in state.items()
            }

        # Get action history
        actions = self.redis.lrange(f"game:{game_id}:actions", 0, -1)

        checkpoint_data = {
            "game_id": game_id,
            "checkpoint_id": checkpoint_id,
            "timestamp": time.time(),
            "game_info": {k.decode(): v.decode() for k, v in game_info.items()},
            "player_states": player_states,
            "action_history": [json.loads(a) for a in actions]
        }

        # Store checkpoint
        self.redis.set(checkpoint_key, json.dumps(checkpoint_data))
        self.redis.expire(checkpoint_key, 86400 * 7)  # 7 days

        # Add to checkpoint list
        self.redis.lpush(f"game:{game_id}:checkpoints", checkpoint_id)
        self.redis.ltrim(f"game:{game_id}:checkpoints", 0, 9)  # Keep last 10

        return checkpoint_id

    def restore_checkpoint(self, checkpoint_id: str) -> Dict:
        """Restore a game from checkpoint."""
        checkpoint_data = self.redis.get(f"checkpoint:{checkpoint_id}")
        if not checkpoint_data:
            return None

        data = json.loads(checkpoint_data)
        game_id = data["game_id"]

        pipe = self.redis.pipeline()

        # Restore game info
        pipe.hset(f"game:{game_id}:info", mapping=data["game_info"])

        # Restore player states
        for player_id, state in data["player_states"].items():
            pipe.hset(f"game:{game_id}:player:{player_id}", mapping=state)
            pipe.sadd(f"game:{game_id}:players", player_id)

        # Restore action history
        for action in reversed(data["action_history"]):
            pipe.lpush(f"game:{game_id}:actions", json.dumps(action))

        pipe.execute()

        return {"game_id": game_id, "restored_from": checkpoint_id}

    def list_checkpoints(self, game_id: str) -> List[Dict]:
        """List available checkpoints for a game."""
        checkpoint_ids = self.redis.lrange(f"game:{game_id}:checkpoints", 0, -1)

        checkpoints = []
        for cp_id in checkpoint_ids:
            cp_id = cp_id.decode() if isinstance(cp_id, bytes) else cp_id
            data = self.redis.get(f"checkpoint:{cp_id}")
            if data:
                parsed = json.loads(data)
                checkpoints.append({
                    "checkpoint_id": cp_id,
                    "timestamp": parsed["timestamp"],
                    "turn": parsed["game_info"].get("current_turn", 0)
                })

        return checkpoints
```

## Best Practices

1. **Use Lua scripts** for atomic operations that require multiple reads/writes to maintain consistency.

2. **Implement server authority** - Never trust client state completely. Validate all actions on the server.

3. **Use pub/sub for real-time updates** but remember messages aren't persisted. For critical events, also store them.

4. **Set appropriate TTLs** - Game state should expire after the game ends or after prolonged inactivity.

5. **Batch updates when possible** - Use pipelines to reduce network round trips.

6. **Monitor state size** - Large game states can impact Redis performance. Consider chunking or compression.

7. **Implement reconnection handling** - Players may disconnect. Store enough state to allow seamless reconnection.

## Conclusion

Redis provides an excellent foundation for game state management, whether you're building turn-based strategy games or fast-paced real-time multiplayer experiences. Its combination of speed, data structures, and pub/sub capabilities makes it ideal for the demanding requirements of game servers.

The key is choosing the right approach for your game type - strong consistency for turn-based games, eventual consistency with reconciliation for real-time games, and always implementing proper validation to prevent cheating.

For more on building game systems with Redis, check out our guides on [Matchmaking Systems](/blog/redis-matchmaking-systems) and [Leaderboards](/blog/redis-sorted-sets-leaderboards).
