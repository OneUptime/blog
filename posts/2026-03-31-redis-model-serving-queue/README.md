# How to Build a Model Serving Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Queue

Description: Build a reliable model serving queue with Redis to handle burst inference requests, prevent GPU overload, and deliver results asynchronously.

---

ML inference is expensive. A single GPU can handle only a limited number of concurrent requests before latency spikes. Rather than accepting and immediately executing every request, a Redis-backed queue lets you absorb bursts, batch requests, and process them at a controlled rate.

## Architecture

The system has three components: a producer (web server) that enqueues inference requests, a worker (model server) that dequeues and runs inference, and a result store where completed predictions are written back.

## Setting Up Redis

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
pip install redis fastapi uvicorn torch transformers
```

## The Request Schema

```python
import uuid
import json
import time
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

QUEUE_KEY = "model:inference:queue"
RESULT_PREFIX = "model:result:"
QUEUE_TTL = 300       # 5 minutes for results
MAX_QUEUE_SIZE = 1000
```

## Producer - Enqueuing Requests

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class InferenceRequest(BaseModel):
    text: str
    model: str = "gpt2"

@app.post("/predict")
async def predict(req: InferenceRequest):
    if r.llen(QUEUE_KEY) >= MAX_QUEUE_SIZE:
        raise HTTPException(status_code=503, detail="Queue full, try again later")

    request_id = str(uuid.uuid4())
    payload = {
        "id": request_id,
        "text": req.text,
        "model": req.model,
        "enqueued_at": time.time()
    }
    r.rpush(QUEUE_KEY, json.dumps(payload))
    return {"request_id": request_id}

@app.get("/result/{request_id}")
async def get_result(request_id: str):
    result = r.get(f"{RESULT_PREFIX}{request_id}")
    if not result:
        return {"status": "pending"}
    return {"status": "done", "result": json.loads(result)}
```

## Worker - Processing the Queue

```python
import torch
from transformers import pipeline

def load_model(model_name: str):
    return pipeline("text-generation", model=model_name, device="cuda:0" if torch.cuda.is_available() else "cpu")

def run_worker(model_name: str = "gpt2"):
    model = load_model(model_name)
    print(f"Worker ready, model={model_name}")

    while True:
        # BLPOP blocks until a job is available (timeout=30s)
        item = r.blpop(QUEUE_KEY, timeout=30)
        if not item:
            continue

        _, raw = item
        job = json.loads(raw)
        request_id = job["id"]

        try:
            output = model(job["text"], max_new_tokens=50, do_sample=False)
            result = {"text": output[0]["generated_text"], "status": "ok"}
        except Exception as e:
            result = {"error": str(e), "status": "error"}

        r.setex(f"{RESULT_PREFIX}{request_id}", QUEUE_TTL, json.dumps(result))
        print(f"Processed {request_id} in {time.time() - job['enqueued_at']:.2f}s")

if __name__ == "__main__":
    run_worker()
```

## Batching for Throughput

If your model supports batched inference, pull multiple jobs at once:

```python
def run_batch_worker(batch_size: int = 8):
    model = load_model("gpt2")

    while True:
        pipe = r.pipeline()
        for _ in range(batch_size):
            pipe.lpop(QUEUE_KEY)
        items = pipe.execute()
        jobs = [json.loads(i) for i in items if i]

        if not jobs:
            time.sleep(0.1)
            continue

        texts = [j["text"] for j in jobs]
        outputs = model(texts, max_new_tokens=50, do_sample=False)

        save_pipe = r.pipeline()
        for job, output in zip(jobs, outputs):
            result = json.dumps({"text": output[0]["generated_text"], "status": "ok"})
            save_pipe.setex(f"{RESULT_PREFIX}{job['id']}", QUEUE_TTL, result)
        save_pipe.execute()
```

## Monitoring Queue Depth

```bash
redis-cli llen model:inference:queue
```

Or from Python:

```python
queue_depth = r.llen(QUEUE_KEY)
print(f"Pending requests: {queue_depth}")
```

## Summary

A Redis list-based model serving queue decouples request acceptance from inference execution, protecting your GPU from overload. Workers use `BLPOP` for efficient blocking reads, results are stored with TTLs so clients can poll asynchronously, and batching maximizes GPU utilization. This pattern scales horizontally - add more workers as demand grows.
