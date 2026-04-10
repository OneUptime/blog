# How to Train Teams on Redis Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Training, Operation

Description: Learn how to build a Redis operations training program for engineers covering hands-on labs, incident simulations, and skill progression from beginner to expert.

---

Building Redis operational expertise across your team reduces bus factor and enables faster incident response. This guide outlines a practical training program structure with hands-on exercises.

## Skill Level Progression

```text
Level 1 - Basic (all engineers):
  - What Redis is and when to use it
  - Basic CLI commands (GET, SET, TTL, INFO)
  - Understanding data types
  - Reading monitoring dashboards

Level 2 - Intermediate (backend engineers):
  - Persistence configuration (RDB vs AOF)
  - Eviction policies
  - Sentinel and basic HA concepts
  - Slowlog analysis

Level 3 - Advanced (DevOps/SRE):
  - Cluster configuration and resharding
  - Capacity planning
  - Performance tuning
  - Incident response and recovery
```

## Level 1 Lab: Basic Operations

```bash
# Lab 1: Explore Redis with redis-cli
# Estimated time: 30 minutes

# Connect to a sandbox Redis
redis-cli -h training-redis.internal

# Exercise 1: Basic key operations
SET user:1:name "Alice"
GET user:1:name
TTL user:1:name        # -1 = no expiry
EXPIRE user:1:name 60  # set 60s TTL
TTL user:1:name

# Exercise 2: Data types
HSET user:1 name "Alice" email "alice@example.com" age 30
HGETALL user:1

LPUSH queue:tasks "task1" "task2" "task3"
LRANGE queue:tasks 0 -1
LLEN queue:tasks

# Exercise 3: Read the INFO output
INFO server
INFO memory
INFO stats
```

## Level 2 Lab: Persistence and Eviction

```bash
# Lab 2: Understand persistence
# Estimated time: 45 minutes

# Exercise 1: Compare RDB vs AOF
CONFIG GET save
CONFIG GET appendonly

# Trigger RDB save and observe
BGSAVE
INFO persistence

# Exercise 2: Eviction policies
CONFIG SET maxmemory 100mb
CONFIG SET maxmemory-policy allkeys-lru

# Fill memory and observe evictions
for i in $(seq 1 100000); do
  redis-cli SET "test:key:$i" "$(head -c 1024 /dev/urandom | base64)" EX 3600
done

redis-cli INFO stats | grep evicted_keys

# Exercise 3: Slowlog
CONFIG SET slowlog-log-slower-than 0  # log everything
# Run some commands
KEYS *  # intentionally slow
CONFIG SET slowlog-log-slower-than 10000  # reset to default (10ms)
SLOWLOG GET 10
```

## Level 3 Lab: Incident Simulation

```bash
# Lab 3: Simulate and recover from memory emergency
# Estimated time: 60 minutes

# Scenario: Redis is at 95% memory, writes failing

# Step 1: Diagnose
redis-cli INFO memory | grep used_memory_human
redis-cli INFO stats | grep evicted_keys

# Step 2: Identify large keys
redis-cli --bigkeys

# Step 3: Apply emergency fix
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Step 4: Verify recovery
redis-cli INFO stats | grep evicted_keys
redis-cli SET test-write "ok"  # should succeed now
redis-cli GET test-write
```

## Training Schedule Template

```text
Week 1: Redis Fundamentals
  Day 1: Data types and CLI basics (Level 1 Lab)
  Day 2: Persistence deep-dive (Level 2 Lab)
  Day 3: ACL and security

Week 2: Operations
  Day 1: Monitoring and alerting setup
  Day 2: Backup and restore procedures
  Day 3: Incident simulation (Level 3 Lab)

Week 3: Advanced Topics
  Day 1: Sentinel HA setup
  Day 2: Cluster overview
  Day 3: Performance tuning workshop
```

## Knowledge Check Questions

```text
1. What happens when maxmemory-policy is "noeviction" and memory is full?
2. What is the difference between RDB and AOF persistence?
3. How does Redis Sentinel detect a primary failure?
4. Why should you avoid KEYS * in production?
5. What does mem_fragmentation_ratio > 2.0 indicate?
```

## Summary

An effective Redis training program progresses from CLI fundamentals through persistence configuration to incident simulation, using hands-on labs in a sandbox environment. Structure it by skill level, measure progress with practical exercises rather than quizzes, and run incident simulations regularly to build the muscle memory your team needs during real outages.
