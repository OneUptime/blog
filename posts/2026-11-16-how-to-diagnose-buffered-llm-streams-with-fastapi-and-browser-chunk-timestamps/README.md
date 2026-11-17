# How to Diagnose Buffered LLM Streams with FastAPI and Browser Chunk Timestamps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, FastAPI, Python, Observability

Description: Locate LLM stream buffering by comparing producer events, browser reads, and rendered output timestamps.

When a streaming response arrives all at once, the model may have generated it incrementally. Buffering can happen in application code, a reverse proxy, a browser consumer, or the rendering layer. Diagnose those boundaries before changing model settings.

The most useful first test removes the model entirely. Send numbered records at a known interval through the same FastAPI route and deployment path. If these records arrive in a burst, you have a reproducible transport or consumption problem.

## Create a predictable producer

Save this example as `app.py`, install `fastapi` and `uvicorn`, and run `uvicorn app:app`. It emits JSON Lines, not server-sent events:

```python
import asyncio
import json
import time
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/stream-probe")
async def stream_probe():
    async def records():
        started = time.perf_counter()
        for sequence in range(8):
            record = {
                "sequence": sequence,
                "producer_elapsed_ms": round(
                    (time.perf_counter() - started) * 1000, 2
                ),
            }
            print(record, flush=True)
            yield (json.dumps(record) + "\n").encode()
            await asyncio.sleep(0.3)

    return StreamingResponse(
        records(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

[FastAPI's StreamingResponse documentation](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse) accepts an asynchronous or ordinary generator. Yielding gives the framework another body segment; it does not guarantee a separate network packet or browser read.

The monotonic timestamp measures producer progress inside one process. It is deliberately relative. Subtracting a server monotonic clock from a browser monotonic clock produces meaningless network latency.

## Observe browser reads separately from records

Open a same-origin page and run this function in its developer console. It preserves partial lines and UTF-8 sequences across reads:

```javascript
async function inspectStream() {
  const started = performance.now();
  const response = await fetch("/stream-probe");
  if (!response.ok || !response.body) throw new Error("Stream unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let readNumber = 0;

  function parseLines(text, receivedMs) {
    pending += text;
    const lines = pending.split("\n");
    pending = lines.pop();
    for (const line of lines) {
      if (line) console.log("record", JSON.parse(line), receivedMs);
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      const receivedMs = performance.now() - started;
      if (done) {
        parseLines(decoder.decode(), receivedMs);
        break;
      }
      console.log("read", ++readNumber, value.byteLength, receivedMs);
      parseLines(decoder.decode(value, { stream: true }), receivedMs);
    }
    if (pending.trim()) throw new Error("Incomplete final JSON line");
  } finally {
    reader.releaseLock();
  }
}
inspectStream();
```

The [MDN readable-stream guide](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) documents the reader loop. A read can contain several records or only part of one. Counting reads as model tokens or assuming one JSON object per read breaks under ordinary network behavior.

## Compare the boundaries

Start with a direct local request:

```bash
curl --no-buffer http://127.0.0.1:8000/stream-probe
```

Then request the deployed endpoint through its normal proxy. Keep a small table containing sequence number, producer elapsed time, browser read time, and application render time. An occasional combined read is normal; eight evenly produced records received near completion is stronger buffering evidence.

If producer logs also bunch together, inspect code before `yield`: synchronous HTTP calls, CPU work, response concatenation, or waiting for a full model response. If producer timing is regular but direct clients receive a burst, inspect middleware and the ASGI serving path. If direct access works and the public route fails, investigate the intermediary.

For NGINX, [proxy buffering documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering) describes `proxy_buffering off` and the `X-Accel-Buffering` response header. The header can be ignored by configuration, and it is not a universal instruction to every CDN. Check the actual proxy handling this route.

If browser reads are timely but visible text appears late, inspect state batching, animation queues, and code that calls `response.text()` before updating the interface. That call waits for the complete body. Also check compression middleware with the probe enabled and disabled; avoid assuming all compressors have identical flushing behavior.

## Reintroduce the model carefully

Add timestamps when the SDK emits a displayable delta, immediately before forwarding it, and when the browser parses the corresponding application record. Preserve a request ID and sequence number through the path. A role or lifecycle event is not a visible token.

If the upstream format is SSE, use an SSE parser; the JSON Lines parser above is only for this probe. SSE event boundaries can also cross transport reads. Keep framing concerns separate from model event semantics.

Repeat the test with slow clients and concurrent requests. Verify cancellation and bounded buffering so a slow browser does not cause an unbounded queue. Remove verbose per-record logs afterward, retaining a few milestones and maximum-gap measurements. Those signals preserve the diagnosis without turning every production stream into thousands of log entries.
