# How to Use Redis CLI Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Command Line, Debugging, Administration, Scripting

Description: A comprehensive guide to using the Redis CLI effectively, covering essential commands, debugging techniques, scripting, and advanced tips for Redis administration.

---

The Redis CLI (redis-cli) is a powerful command-line interface for interacting with Redis. Mastering it is essential for debugging, administration, and scripting. This guide covers everything from basic usage to advanced techniques.

## Basic Connection

### Connecting to Redis

```bash
# Connect to local Redis
redis-cli

# Connect to remote Redis
redis-cli -h hostname -p 6379

# Connect with password
redis-cli -h hostname -p 6379 -a password

# Connect to specific database
redis-cli -n 5

# Connect with TLS
redis-cli --tls --cacert /path/to/ca.crt

# Connect to Redis Cluster
redis-cli -c -h node1 -p 6379

# Full connection string
redis-cli -u redis://user:password@hostname:6379/0
```

### Interactive Mode

```bash
redis-cli
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> SET hello world
OK
127.0.0.1:6379> GET hello
"world"
```

### Command Line Mode

```bash
# Execute single command
redis-cli SET key value
redis-cli GET key

# Execute multiple commands
redis-cli SET a 1 && redis-cli SET b 2 && redis-cli MGET a b
```

## Essential Commands

### Key Operations

```bash
# Set and get
SET user:1:name "Alice"
GET user:1:name

# Set with expiration
SET session:abc123 "data" EX 3600  # Expires in 1 hour
SETEX session:xyz "data" 3600       # Same as above

# Set only if not exists
SET lock:resource "owner" NX EX 30  # NX = only if not exists

# Get and set
GETSET counter 0  # Returns old value, sets new

# Delete
DEL key1 key2 key3

# Check existence
EXISTS key1 key2  # Returns count of existing keys

# Get type
TYPE user:1:name

# Rename
RENAME oldkey newkey
RENAMENX oldkey newkey  # Only if newkey doesn't exist

# Get TTL
TTL key      # Seconds remaining (-1 = no expiry, -2 = doesn't exist)
PTTL key     # Milliseconds remaining

# Set expiration
EXPIRE key 60      # 60 seconds
EXPIREAT key 1893456000  # Unix timestamp
PERSIST key        # Remove expiration
```

### String Operations

```bash
# Increment/decrement
INCR counter
INCRBY counter 10
INCRBYFLOAT price 0.50
DECR counter
DECRBY counter 5

# Append
APPEND log "line 1\n"
APPEND log "line 2\n"

# String length
STRLEN key

# Get substring
GETRANGE key 0 10  # Characters 0-10

# Set substring
SETRANGE key 6 "Redis"
```

### Hash Operations

```bash
# Set fields
HSET user:1 name "Alice" age 30 city "SF"

# Get fields
HGET user:1 name
HMGET user:1 name age city
HGETALL user:1

# Increment field
HINCRBY user:1 age 1

# Check field existence
HEXISTS user:1 email

# Get all field names
HKEYS user:1

# Get all values
HVALS user:1

# Get field count
HLEN user:1

# Delete fields
HDEL user:1 email phone
```

### List Operations

```bash
# Push elements
LPUSH queue "task1" "task2"  # Left (head)
RPUSH queue "task3"          # Right (tail)

# Pop elements
LPOP queue
RPOP queue
BLPOP queue 30   # Blocking pop with 30s timeout

# Get elements
LRANGE queue 0 -1   # All elements
LRANGE queue 0 9    # First 10 elements
LINDEX queue 0      # Element at index 0

# List length
LLEN queue

# Remove elements
LREM queue 0 "value"  # Remove all occurrences
LTRIM queue 0 99      # Keep only first 100 elements

# Insert
LINSERT queue BEFORE "pivot" "new_value"
```

### Set Operations

```bash
# Add members
SADD tags "redis" "database" "cache"

# Check membership
SISMEMBER tags "redis"

# Get all members
SMEMBERS tags

# Set size
SCARD tags

# Remove members
SREM tags "cache"

# Pop random member
SPOP tags

# Set operations
SINTER set1 set2         # Intersection
SUNION set1 set2         # Union
SDIFF set1 set2          # Difference
SINTERSTORE dest set1 set2  # Store intersection
```

### Sorted Set Operations

```bash
# Add members with scores
ZADD leaderboard 100 "alice" 85 "bob" 92 "charlie"

# Get rank (0-indexed)
ZRANK leaderboard "alice"     # Ascending
ZREVRANK leaderboard "alice"  # Descending

# Get score
ZSCORE leaderboard "alice"

# Range queries
ZRANGE leaderboard 0 9 WITHSCORES        # Top 10 (ascending)
ZREVRANGE leaderboard 0 9 WITHSCORES     # Top 10 (descending)
ZRANGEBYSCORE leaderboard 80 100         # Score 80-100

# Increment score
ZINCRBY leaderboard 10 "alice"

# Count in range
ZCOUNT leaderboard 80 100

# Remove members
ZREM leaderboard "bob"
ZREMRANGEBYRANK leaderboard 0 -11  # Remove all but top 10
ZREMRANGEBYSCORE leaderboard -inf 50  # Remove scores < 50
```

## Debugging Commands

### MONITOR

Watch all commands in real-time:

```bash
redis-cli MONITOR
# Output:
# 1616161616.123456 [0 127.0.0.1:54321] "SET" "key" "value"
# 1616161616.234567 [0 127.0.0.1:54321] "GET" "key"
```

Filter MONITOR output:

```bash
redis-cli MONITOR | grep -E "GET|SET"
redis-cli MONITOR | grep "user:"
```

### SLOWLOG

Track slow commands:

```bash
# Configure slow log (microseconds)
CONFIG SET slowlog-log-slower-than 10000  # 10ms
CONFIG SET slowlog-max-len 128

# Get slow log
SLOWLOG GET 10    # Last 10 entries
SLOWLOG LEN       # Total entries
SLOWLOG RESET     # Clear log

# Example output:
# 1) 1) (integer) 14               # Entry ID
#    2) (integer) 1616161616       # Timestamp
#    3) (integer) 15234            # Duration (microseconds)
#    4) 1) "KEYS"                  # Command
#       2) "*"
```

### DEBUG Commands

```bash
# Object encoding
DEBUG OBJECT mykey

# Memory usage
MEMORY USAGE mykey

# Memory doctor
MEMORY DOCTOR

# Sleep (for testing)
DEBUG SLEEP 0.5

# Crash server (don't use in production!)
# DEBUG SEGFAULT
```

### INFO Command

```bash
# All info
INFO

# Specific sections
INFO server        # Server info
INFO clients       # Client connections
INFO memory        # Memory usage
INFO stats         # General statistics
INFO replication   # Replication info
INFO cpu           # CPU stats
INFO cluster       # Cluster info
INFO keyspace      # Database info

# Useful one-liners
redis-cli INFO | grep used_memory_human
redis-cli INFO | grep connected_clients
redis-cli INFO | grep instantaneous_ops_per_sec
```

### CLIENT Commands

```bash
# List connected clients
CLIENT LIST

# Get current client info
CLIENT INFO

# Get client name
CLIENT GETNAME

# Set client name
CLIENT SETNAME "my-app"

# Kill a client
CLIENT KILL ID 123
CLIENT KILL ADDR 127.0.0.1:54321

# Pause clients
CLIENT PAUSE 5000  # Pause for 5 seconds
```

## Key Inspection

### SCAN (Safe Key Iteration)

```bash
# Basic scan
SCAN 0 COUNT 100

# With pattern
SCAN 0 MATCH "user:*" COUNT 100

# With type filter
SCAN 0 TYPE hash COUNT 100

# Full scan example
cursor="0"
while true; do
  result=$(redis-cli SCAN $cursor MATCH "session:*" COUNT 100)
  cursor=$(echo "$result" | head -1)
  keys=$(echo "$result" | tail -n +2)
  echo "$keys"
  if [ "$cursor" = "0" ]; then
    break
  fi
done
```

### Finding Big Keys

```bash
# Built-in bigkeys scan
redis-cli --bigkeys

# Sample output:
# [00.00%] Biggest string found so far 'large-key' with 1048576 bytes
# [00.00%] Biggest hash   found so far 'user:1' with 150 fields

# With more samples
redis-cli --bigkeys -i 0.1  # 0.1 second delay between scans
```

### Memory Analysis

```bash
# Memory stats
INFO memory

# Key memory usage
MEMORY USAGE key

# Memory doctor
MEMORY DOCTOR

# Get stats for specific key types
redis-cli --memkeys
```

## Scripting with redis-cli

### Piping Commands

```bash
# Pipe commands from file
cat commands.txt | redis-cli

# Generate commands and pipe
for i in {1..1000}; do
  echo "SET key:$i value:$i"
done | redis-cli

# Pipe with password
cat commands.txt | redis-cli -a password
```

### Inline Scripting

```bash
# Use EVAL for Lua scripts
redis-cli EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# Script with multiple keys
redis-cli EVAL "
  local sum = 0
  for i, key in ipairs(KEYS) do
    sum = sum + tonumber(redis.call('GET', key) or 0)
  end
  return sum
" 3 counter1 counter2 counter3
```

### Batch Operations

```bash
# Mass insertion with PIPE mode
cat << 'EOF' | redis-cli --pipe
SET key1 value1
SET key2 value2
SET key3 value3
HSET user:1 name Alice age 30
LPUSH queue task1 task2 task3
EOF

# Generate and import
seq 1 10000 | while read i; do
  echo "SET key:$i $i"
done | redis-cli --pipe
```

### Export/Import

```bash
# Dump a key
redis-cli DUMP mykey | xxd

# Export keys to file
redis-cli --scan --pattern "user:*" | while read key; do
  echo "$key"
  redis-cli DUMP "$key" | xxd -p | tr -d '\n'
  echo
done > backup.txt

# Export as redis commands
redis-cli --scan --pattern "user:*" | while read key; do
  type=$(redis-cli TYPE "$key")
  case $type in
    string)
      value=$(redis-cli GET "$key")
      echo "SET \"$key\" \"$value\""
      ;;
    hash)
      redis-cli HGETALL "$key" | paste - - | while read f v; do
        echo "HSET \"$key\" \"$f\" \"$v\""
      done
      ;;
  esac
done > export.redis
```

## Administrative Commands

### Configuration

```bash
# Get all config
CONFIG GET *

# Get specific config
CONFIG GET maxmemory
CONFIG GET "slow*"

# Set config (runtime)
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru

# Rewrite config file
CONFIG REWRITE
```

### Persistence

```bash
# Trigger background save
BGSAVE

# Check save status
LASTSAVE

# Trigger AOF rewrite
BGREWRITEAOF

# Get persistence info
INFO persistence
```

### Replication

```bash
# Make this server a replica
REPLICAOF hostname 6379

# Stop replication
REPLICAOF NO ONE

# Get replication info
INFO replication

# Wait for replicas
WAIT 2 5000  # Wait for 2 replicas, 5 second timeout
```

### Cluster Commands

```bash
# Cluster info
CLUSTER INFO
CLUSTER NODES

# Get key's slot
CLUSTER KEYSLOT mykey

# Get slot's node
CLUSTER SLOTS

# Add node
CLUSTER MEET hostname port

# Migrate slot
CLUSTER SETSLOT slot IMPORTING node-id
CLUSTER SETSLOT slot MIGRATING node-id
```

## Useful One-Liners

```bash
# Count keys matching pattern
redis-cli --scan --pattern "session:*" | wc -l

# Delete keys matching pattern
redis-cli --scan --pattern "temp:*" | xargs redis-cli DEL

# Get all key types
redis-cli --scan | while read key; do
  echo "$key: $(redis-cli TYPE $key)"
done

# Find keys without TTL
redis-cli --scan | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" = "-1" ]; then
    echo "$key"
  fi
done

# Get memory usage for pattern
redis-cli --scan --pattern "cache:*" | while read key; do
  mem=$(redis-cli MEMORY USAGE "$key")
  echo "$key: $mem bytes"
done | sort -t: -k2 -n -r | head -20

# Monitor keyspace notifications
redis-cli PSUBSCRIBE "__key*__:*"

# Real-time ops/sec
watch -n 1 'redis-cli INFO stats | grep instantaneous_ops_per_sec'

# Connection test with latency
redis-cli --latency

# Continuous latency monitoring
redis-cli --latency-history

# Intrinsic latency test
redis-cli --intrinsic-latency 10
```

## Tips and Tricks

### Command History

```bash
# History is saved to ~/.rediscli_history
# Navigate with arrow keys

# Clear history
> ~/.rediscli_history
```

### Output Formatting

```bash
# Raw output (no quoting)
redis-cli --raw GET key

# CSV output
redis-cli --csv LRANGE list 0 -1

# JSON output (with jq)
redis-cli HGETALL user:1 | paste - - | jq -R -s 'split("\n") | map(select(length > 0) | split("\t") | {(.[0]): .[1]}) | add'
```

### Interactive Mode Shortcuts

```bash
# Tab completion for commands
127.0.0.1:6379> GET <TAB>

# Help for commands
127.0.0.1:6379> HELP SET
127.0.0.1:6379> HELP @string  # Help for string commands

# Repeat last command
127.0.0.1:6379> r
```

## Conclusion

The Redis CLI is an essential tool for Redis development and administration. Key takeaways:

- Use **SCAN** instead of KEYS for safe iteration
- Use **MONITOR** for debugging but sparingly in production
- Use **SLOWLOG** to identify performance issues
- Master **piping and scripting** for batch operations
- Know the **INFO** sections for monitoring

## Related Resources

- [Redis CLI Documentation](https://redis.io/docs/ui/cli/)
- [Redis Commands Reference](https://redis.io/commands/)
- [Redis Administration](https://redis.io/docs/management/)
