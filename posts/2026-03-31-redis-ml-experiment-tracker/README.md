# How to Build an ML Experiment Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Experiment Tracking, MLOps, Monitoring

Description: Build a lightweight ML experiment tracker using Redis to log hyperparameters, metrics per epoch, and artifacts without running a full MLflow or Weights and Biases server.

---

MLflow and Weights and Biases are excellent experiment trackers but add infrastructure complexity. For teams that want a lightweight alternative, Redis provides the primitives: Hashes for run metadata, Lists for per-epoch metric series, and Sorted Sets for leaderboard queries.

## Experiment and Run Structure

```text
experiment:{exp_id}          -> Hash (name, description, created_at)
run:{run_id}                 -> Hash (exp_id, params, status, start_time)
run_metrics:{run_id}:{metric} -> List of JSON {step, value, ts}
experiment_runs:{exp_id}     -> Sorted Set (run_id, score=start_time)
leaderboard:{exp_id}:{metric} -> Sorted Set (run_id, score=best_value)
```

## Creating an Experiment

```python
import redis
import uuid
import time
import json

r = redis.Redis(host="redis", port=6379, decode_responses=True)

def create_experiment(name: str, description: str = "") -> str:
    exp_id = f"exp-{uuid.uuid4().hex[:8]}"
    r.hset(f"experiment:{exp_id}", mapping={
        "name": name,
        "description": description,
        "created_at": str(int(time.time()))
    })
    r.sadd("experiments", exp_id)
    return exp_id
```

## Starting a Run

```python
def start_run(experiment_id: str, params: dict) -> str:
    run_id = f"run-{uuid.uuid4().hex[:8]}"
    start_ts = time.time()

    r.hset(f"run:{run_id}", mapping={
        "experiment_id": experiment_id,
        "params": json.dumps(params),
        "status": "running",
        "start_time": str(int(start_ts))
    })

    r.zadd(f"experiment_runs:{experiment_id}", {run_id: start_ts})
    return run_id

run_id = start_run("exp-abc12345", {
    "learning_rate": 0.001,
    "batch_size": 256,
    "epochs": 50,
    "optimizer": "adam",
    "hidden_layers": [512, 256, 128]
})
```

## Logging Metrics per Step

```python
def log_metric(run_id: str, metric_name: str, value: float, step: int):
    key = f"run_metrics:{run_id}:{metric_name}"
    entry = json.dumps({"step": step, "value": value, "ts": time.time()})
    r.rpush(key, entry)
    r.expire(key, 30 * 86400)  # keep 30 days

    # Update leaderboard (for loss: lower is better)
    exp_id = r.hget(f"run:{run_id}", "experiment_id")
    if metric_name in ("val_loss", "loss"):
        r.zadd(f"leaderboard:{exp_id}:{metric_name}", {run_id: value}, lt=True)
    else:
        # For accuracy: higher is better, store negative to use ZRANGE
        r.zadd(f"leaderboard:{exp_id}:{metric_name}", {run_id: -value}, lt=True)

# During training loop
for epoch in range(50):
    # ... train ...
    log_metric(run_id, "train_loss", train_loss, step=epoch)
    log_metric(run_id, "val_loss", val_loss, step=epoch)
    log_metric(run_id, "val_accuracy", val_acc, step=epoch)
```

## Completing a Run

```python
def finish_run(run_id: str, status: str = "completed"):
    r.hset(f"run:{run_id}", mapping={
        "status": status,
        "end_time": str(int(time.time()))
    })
```

## Querying Metric History

```python
def get_metric_history(run_id: str, metric_name: str) -> list:
    raw = r.lrange(f"run_metrics:{run_id}:{metric_name}", 0, -1)
    return [json.loads(x) for x in raw]

history = get_metric_history(run_id, "val_loss")
# [{"step": 0, "value": 0.82, "ts": ...}, {"step": 1, "value": 0.71, ...}, ...]
```

## Best Runs Leaderboard

```python
def get_best_runs(experiment_id: str, metric: str, top_n: int = 5) -> list:
    key = f"leaderboard:{experiment_id}:{metric}"
    # ZRANGE with WITHSCORES returns [(run_id, score), ...]
    entries = r.zrange(key, 0, top_n - 1, withscores=True)

    results = []
    for run_id, score in entries:
        params = json.loads(r.hget(f"run:{run_id}", "params") or "{}")
        results.append({
            "run_id": run_id,
            "score": abs(score),  # undo negation for accuracy
            "params": params
        })
    return results
```

```bash
# Quick leaderboard check
ZRANGE leaderboard:exp-abc12345:val_loss 0 4 WITHSCORES
```

## Summary

A Redis experiment tracker uses Hashes for run metadata and hyperparameters, Lists for per-step metric series, and Sorted Sets for leaderboard queries. Runs log metrics in real time during training with minimal overhead, and leaderboard queries instantly return the best-performing configurations. This covers 80% of MLflow's use cases with no extra infrastructure, making it a practical choice for teams in the early stages of ML experimentation.
