# How to Implement Two-Phase Commit Coordinator with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Two-Phase Commit, Distributed Transaction, Coordination, Backend

Description: Implement a two-phase commit coordinator with Redis hashes and Lua scripts to orchestrate distributed transactions across multiple services with vote and decision phases.

---

Two-phase commit (2PC) coordinates a distributed transaction across multiple participants. Phase 1 (prepare) collects votes; Phase 2 (commit or abort) broadcasts the outcome. Redis provides the coordination store with atomic operations.

## Data Model

Each transaction has a hash that tracks participants and their votes:

```bash
HSET txn:TX-001 status "voting"
HSET txn:TX-001 participants "payments,inventory,notifications"
HSET txn:TX-001 created_at "1711900000"
```

## Phase 1 - Prepare and Collect Votes

The coordinator initiates the transaction and each participant votes:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def start_transaction(txn_id: str, participants: list):
    key = f"txn:{txn_id}"
    r.hset(key, mapping={
        "status": "voting",
        "participants": ",".join(participants),
        "created_at": str(time.time()),
    })
    r.expire(key, 120)  # 2 minute timeout

def cast_vote(txn_id: str, participant: str, vote: str):
    """vote must be 'commit' or 'abort'"""
    key = f"txn:{txn_id}"
    r.hset(key, f"vote:{participant}", vote)
```

## Phase 2 - Decision via Lua Script

Atomically check all votes and set the final decision:

```python
DECIDE_SCRIPT = """
local key = KEYS[1]
local participants_raw = redis.call('HGET', key, 'participants')
local participants = {}
for p in string.gmatch(participants_raw, '[^,]+') do
    table.insert(participants, p)
end

local decision = 'commit'
for _, p in ipairs(participants) do
    local vote = redis.call('HGET', key, 'vote:' .. p)
    if vote ~= 'commit' then
        decision = 'abort'
        break
    end
end

redis.call('HSET', key, 'status', decision)
return decision
"""

decide_fn = r.register_script(DECIDE_SCRIPT)

def decide(txn_id: str) -> str:
    return decide_fn(keys=[f"txn:{txn_id}"])
```

## Completing the Transaction

After the decision, each participant applies or rolls back:

```python
def finalize_transaction(txn_id: str):
    key = f"txn:{txn_id}"
    status = r.hget(key, "status")
    participants = (r.hget(key, "participants") or "").split(",")

    for participant in participants:
        if participant:
            if status == "commit":
                apply_commit(participant, txn_id)
            else:
                apply_rollback(participant, txn_id)

    r.hset(key, "status", "done")
```

## Handling Coordinator Failures

Use a recovery worker that finds stalled transactions:

```python
def recover_stalled_transactions():
    # Scan for transactions stuck in voting state
    for key in r.scan_iter("txn:*"):
        data = r.hgetall(key)
        if data.get("status") == "voting":
            age = time.time() - float(data.get("created_at", time.time()))
            if age > 30:  # Timed out - abort
                r.hset(key, "status", "abort")
```

## Summary

Redis hashes store per-transaction state and participant votes. A Lua script atomically tallies votes and records the commit or abort decision. TTL-based expiry and a recovery worker handle coordinator failures. While 2PC has known limitations with blocking failures, this Redis implementation is practical for low-latency, short-lived distributed transactions.

