# How to Implement Leader Election with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Leader Election, Distributed Systems, High Availability, Coordination

Description: A comprehensive guide to implementing leader election patterns with Redis for single-leader architectures, including heartbeat mechanisms, failover handling, and production-ready patterns.

---

Leader election is a fundamental pattern in distributed systems where multiple instances coordinate to elect a single leader responsible for specific tasks. Redis provides efficient primitives for implementing leader election with automatic failover when the leader becomes unavailable.

## Why Leader Election?

Leader election is needed when:

- Only one instance should run scheduled jobs
- Coordinated writes to external systems
- Single point of coordination for distributed workflows
- Master-worker architectures

## Basic Leader Election

```python
import redis
import uuid
import time
import threading
from typing import Optional, Callable
from dataclasses import dataclass

@dataclass
class LeaderInfo:
    node_id: str
    elected_at: float
    expires_at: float

class LeaderElection:
    """Leader election using Redis with automatic renewal."""

    def __init__(self, redis_url='redis://localhost:6379',
                 election_name: str = 'leader',
                 ttl: int = 10,
                 node_id: str = None):
        """
        Initialize leader election.

        Args:
            election_name: Unique name for the election
            ttl: Leader lease time-to-live in seconds
            node_id: Unique identifier for this node
        """
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.election_name = election_name
        self.ttl = ttl
        self.node_id = node_id or str(uuid.uuid4())
        self.key = f"leader:{election_name}"
        self._is_leader = False
        self._renewal_thread = None
        self._stop_event = threading.Event()
        self._on_elected_callback = None
        self._on_demoted_callback = None

    def try_become_leader(self) -> bool:
        """Attempt to become the leader."""
        # Try to set ourselves as leader (only if not already set)
        result = self.redis.set(
            self.key,
            self.node_id,
            nx=True,
            ex=self.ttl
        )

        if result:
            self._is_leader = True
            return True

        # Check if we're already the leader
        current_leader = self.redis.get(self.key)
        if current_leader == self.node_id:
            self._is_leader = True
            # Extend our leadership
            self.redis.expire(self.key, self.ttl)
            return True

        self._is_leader = False
        return False

    def renew_leadership(self) -> bool:
        """Renew leader lease if we're the leader."""
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            redis.call('expire', KEYS[1], ARGV[2])
            return 1
        end
        return 0
        """

        result = self.redis.eval(lua_script, 1, self.key, self.node_id, self.ttl)
        self._is_leader = bool(result)
        return self._is_leader

    def resign(self) -> bool:
        """Resign from leadership."""
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        end
        return 0
        """

        self._stop_event.set()
        result = self.redis.eval(lua_script, 1, self.key, self.node_id)
        self._is_leader = False
        return bool(result)

    def get_leader(self) -> Optional[str]:
        """Get the current leader's node ID."""
        return self.redis.get(self.key)

    def is_leader(self) -> bool:
        """Check if this node is the current leader."""
        return self._is_leader and self.get_leader() == self.node_id

    def on_elected(self, callback: Callable[[], None]):
        """Set callback for when this node becomes leader."""
        self._on_elected_callback = callback

    def on_demoted(self, callback: Callable[[], None]):
        """Set callback for when this node loses leadership."""
        self._on_demoted_callback = callback

    def start(self):
        """Start the leader election loop."""
        self._stop_event.clear()
        self._renewal_thread = threading.Thread(
            target=self._election_loop,
            daemon=True
        )
        self._renewal_thread.start()

    def stop(self):
        """Stop the leader election."""
        self._stop_event.set()
        if self._renewal_thread:
            self._renewal_thread.join(timeout=5)
        self.resign()

    def _election_loop(self):
        """Main election loop."""
        was_leader = False

        while not self._stop_event.is_set():
            try:
                if self._is_leader:
                    # Try to renew
                    is_still_leader = self.renew_leadership()

                    if not is_still_leader and was_leader:
                        # Lost leadership
                        was_leader = False
                        if self._on_demoted_callback:
                            try:
                                self._on_demoted_callback()
                            except Exception as e:
                                print(f"Error in demoted callback: {e}")
                else:
                    # Try to become leader
                    became_leader = self.try_become_leader()

                    if became_leader and not was_leader:
                        # Became leader
                        was_leader = True
                        if self._on_elected_callback:
                            try:
                                self._on_elected_callback()
                            except Exception as e:
                                print(f"Error in elected callback: {e}")

            except redis.RedisError as e:
                print(f"Redis error in election loop: {e}")
                self._is_leader = False

            # Sleep for renewal interval (1/3 of TTL)
            self._stop_event.wait(self.ttl / 3)


class LeaderElectionWithFencing:
    """Leader election with fencing tokens for safe operations."""

    def __init__(self, redis_url='redis://localhost:6379',
                 election_name: str = 'leader'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.election_name = election_name
        self.leader_key = f"leader:{election_name}"
        self.fence_key = f"leader:{election_name}:fence"
        self.node_id = str(uuid.uuid4())
        self.fence_token = 0

    def try_become_leader(self, ttl: int = 10) -> Optional[int]:
        """
        Try to become leader and get fencing token.

        Returns:
            Fencing token if became leader, None otherwise
        """
        lua_script = """
        local current = redis.call('get', KEYS[1])
        if current == false or current == ARGV[1] then
            local fence = redis.call('incr', KEYS[2])
            redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2])
            return fence
        end
        return nil
        """

        result = self.redis.eval(
            lua_script, 2,
            self.leader_key, self.fence_key,
            self.node_id, ttl
        )

        if result:
            self.fence_token = int(result)
            return self.fence_token

        return None

    def execute_as_leader(self, operation: Callable[[int], any],
                          ttl: int = 10):
        """
        Execute operation only if we're the leader.

        The operation receives the fencing token which should be
        used to validate operations against external systems.
        """
        fence = self.try_become_leader(ttl)
        if fence is None:
            raise NotLeaderError("Not the leader")

        return operation(fence)


class NotLeaderError(Exception):
    """Exception raised when operation requires leadership."""
    pass


# Usage example
if __name__ == "__main__":
    election = LeaderElection(
        election_name='scheduler',
        ttl=10
    )

    def on_become_leader():
        print(f"Node {election.node_id} became leader!")
        # Start leader-only tasks

    def on_lose_leadership():
        print(f"Node {election.node_id} lost leadership!")
        # Stop leader-only tasks

    election.on_elected(on_become_leader)
    election.on_demoted(on_lose_leadership)

    election.start()

    try:
        while True:
            print(f"Is leader: {election.is_leader()}, "
                  f"Current leader: {election.get_leader()}")
            time.sleep(5)
    except KeyboardInterrupt:
        election.stop()
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class LeaderElection extends EventEmitter {
    constructor(options = {}) {
        super();
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.electionName = options.electionName || 'leader';
        this.ttl = options.ttl || 10;
        this.nodeId = options.nodeId || uuidv4();
        this.key = `leader:${this.electionName}`;
        this._isLeader = false;
        this._running = false;

        this.renewScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            redis.call('expire', KEYS[1], ARGV[2])
            return 1
        end
        return 0
        `;

        this.resignScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        end
        return 0
        `;
    }

    async tryBecomeLeader() {
        const result = await this.redis.set(
            this.key, this.nodeId, 'NX', 'EX', this.ttl
        );

        if (result === 'OK') {
            this._isLeader = true;
            return true;
        }

        const currentLeader = await this.redis.get(this.key);
        if (currentLeader === this.nodeId) {
            this._isLeader = true;
            await this.redis.expire(this.key, this.ttl);
            return true;
        }

        this._isLeader = false;
        return false;
    }

    async renewLeadership() {
        const result = await this.redis.eval(
            this.renewScript, 1, this.key, this.nodeId, this.ttl
        );
        this._isLeader = result === 1;
        return this._isLeader;
    }

    async resign() {
        this._running = false;
        await this.redis.eval(this.resignScript, 1, this.key, this.nodeId);
        this._isLeader = false;
    }

    async getLeader() {
        return await this.redis.get(this.key);
    }

    isLeader() {
        return this._isLeader;
    }

    async start() {
        this._running = true;
        let wasLeader = false;

        const loop = async () => {
            if (!this._running) return;

            try {
                if (this._isLeader) {
                    const stillLeader = await this.renewLeadership();
                    if (!stillLeader && wasLeader) {
                        wasLeader = false;
                        this.emit('demoted');
                    }
                } else {
                    const becameLeader = await this.tryBecomeLeader();
                    if (becameLeader && !wasLeader) {
                        wasLeader = true;
                        this.emit('elected');
                    }
                }
            } catch (e) {
                console.error('Election loop error:', e);
                this._isLeader = false;
            }

            if (this._running) {
                setTimeout(loop, (this.ttl / 3) * 1000);
            }
        };

        loop();
    }

    async stop() {
        this._running = false;
        await this.resign();
    }

    async close() {
        await this.stop();
        await this.redis.quit();
    }
}

// Usage
async function main() {
    const election = new LeaderElection({
        electionName: 'scheduler',
        ttl: 10
    });

    election.on('elected', () => {
        console.log(`Node ${election.nodeId} became leader!`);
    });

    election.on('demoted', () => {
        console.log(`Node ${election.nodeId} lost leadership!`);
    });

    await election.start();

    setInterval(async () => {
        console.log(`Is leader: ${election.isLeader()}, ` +
                   `Current leader: ${await election.getLeader()}`);
    }, 5000);
}

main().catch(console.error);
```

## Best Practices

1. **Use appropriate TTL**: Balance between fast failover and network tolerance
2. **Implement callbacks**: React to leadership changes
3. **Use fencing tokens**: Prevent split-brain scenarios
4. **Handle Redis failures**: Gracefully degrade when Redis is unavailable
5. **Monitor leadership**: Track leader changes and election frequency

## Conclusion

Redis provides simple yet effective primitives for leader election. By combining SET NX with expiration and atomic Lua scripts for renewal, you can build reliable leader election that handles failover automatically. The key is proper TTL configuration and handling edge cases around leadership transitions.
