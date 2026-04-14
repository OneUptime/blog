# Validation Summary: How to Build a Search Indexing Pipeline with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management, bindings)
- Dapr Python SDK (`dapr-client`, `dapr-ext-fastapi`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Elasticsearch / OpenSearch (via `elasticsearch-py` async client)
- FastAPI
- Python, Go, JavaScript/Node.js

## Sources Consulted
- Dapr Python SDK source code — `dapr/python-sdk` on GitHub (`dapr/clients/grpc/client.py` for `publish_event` signature)
- Dapr Go SDK source code — `github.com/dapr/go-sdk` (`service/common/type.go` for `TopicEvent`, `client/pubsub.go` for `PublishEvent`, `client/state.go` for `SaveState`)
- Dapr Go SDK package docs — https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr JavaScript SDK source code — `dapr/js-sdk` on GitHub (`src/implementation/Server/DaprServer.ts`, `src/interfaces/Client/IClientPubSub.ts`)
- Elasticsearch Python client source — `elastic/elasticsearch-py` on GitHub
- Elasticsearch Python client 8.x migration guide — https://www.elastic.co/guide/en/elasticsearch/client/python-api/8.19/migration.html

## Issues Found

1. **Python `publish_event` passed a `dict` directly as `data`** — The Dapr Python SDK `publish_event` method only accepts `str` or `bytes` for the `data` parameter, not `dict`. Passing a dict raises a `ValueError` at runtime. Fixed by wrapping the data in `json.dumps()` and adding `data_content_type="application/json"`. Also switched to keyword arguments for clarity.

2. **Go code imported `TopicEvent` from wrong package** — The code used `daprd "github.com/dapr/go-sdk/service/http"` and referenced `daprd.TopicEvent`, but `TopicEvent` is defined in `github.com/dapr/go-sdk/service/common`, not `service/http`. This would fail to compile. Fixed the import to `"github.com/dapr/go-sdk/service/common"` and the type reference to `*common.TopicEvent`.

3. **Go code had unused `"log"` import** — The `"log"` package was imported but never used, which is a compile error in Go. Removed the unused import.

4. **Elasticsearch `ignore=[404]` parameter removed in 8.x** — The `ignore` parameter was removed from individual API methods in `elasticsearch-py` 8.0. The code `es.delete(index=..., id=..., ignore=[404])` would raise a `TypeError`. Fixed to use the 8.x pattern: `es.options(ignore_status=[404]).delete(index=..., id=...)`.

## Review Notes
- The Go extraction service references a `getString` helper function and a `publishDeleteEvent` function that are not defined in the snippet. This is acceptable for a blog post (implied utility functions), but readers may need to implement these themselves.
- The JavaScript enricher service references a `categorize` function that is not defined. Same note applies.
- The JavaScript `server.pubsub.subscribe()` call returns a Promise and should ideally be awaited, but since it is called at the top level during setup, this is a minor style issue rather than a bug.
- The JavaScript subscribe callback actually receives `(data, headers)` but only `(data)` is declared. This is functionally fine in JavaScript but differs from the full SDK type signature.
