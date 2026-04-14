# Validation Summary: How to Build a Video Processing Pipeline with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management)
- Python (FastAPI, Dapr Python SDK)
- Go (Dapr Go SDK, os/exec for FFmpeg)
- JavaScript/Node.js (Dapr JS SDK, sharp image processing)
- FFmpeg (video transcoding)
- HLS/DASH (video packaging, mentioned)

## Sources Consulted
- Dapr Python SDK source code (`dapr-client` package) — `DaprClient.publish_event()` signature requires `data: Union[bytes, str]`, not dict
- Dapr Go SDK source code (`github.com/dapr/go-sdk`) — `TopicEvent` is defined in `service/common`, not `service/http`; `PublishEvent` accepts `interface{}` (structs are auto-marshaled to JSON)
- Dapr JavaScript SDK source code (`@dapr/dapr` v3+) — `DaprServer`, `DaprClient`, `server.pubsub.subscribe()`, `client.state.save()`, `client.pubsub.publish()` signatures verified
- FFmpeg documentation — `-vf scale=W:H`, `-b:v`, `-c:v libx264`, `-preset fast` flags verified

## Issues Found
1. **Python `publish_event()` passed a dict instead of a serialized string**: The Dapr Python SDK `publish_event()` method requires `data` to be `bytes` or `str`, but the blog passed a raw Python dict. Fixed by wrapping the dict in `json.dumps()` and adding `data_content_type="application/json"`.

2. **Go `TopicEvent` imported from wrong package**: The blog aliased `github.com/dapr/go-sdk/service/http` as `daprd` and referenced `daprd.TopicEvent`. However, `TopicEvent` is defined in `github.com/dapr/go-sdk/service/common`. Fixed by changing the import to `"github.com/dapr/go-sdk/service/common"` and updating all references from `*daprd.TopicEvent` to `*common.TopicEvent`.

3. **Unused Python import**: `BackgroundTasks` was imported from `fastapi` but never used in the code. Removed to avoid confusion.

## Review Notes
- The Python code stores raw video content as base64 in Dapr state. In production this would be impractical for large video files — object storage (S3, Azure Blob, GCS) with Dapr bindings would be more appropriate. Acceptable for a tutorial demonstrating the pipeline pattern.
- The Go code ignores the error from `dapr.NewClient()` (`client, _ := dapr.NewClient()`). Production code should handle this error, but acceptable for tutorial brevity.
- The JavaScript `Buffer.from(thumb)` call on the sharp output is redundant since `toBuffer()` already returns a Buffer, but this is not incorrect.
- The Go code creates a second `dapr.NewClient()` inside `handleTranscodeJob` instead of reusing the one that could be passed in or created at startup. This works but is not optimal for production.
