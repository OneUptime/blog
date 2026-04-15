# Validation Summary: How to Implement Anti-Corruption Layer with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Service Invocation API
- Dapr Pub/Sub API
- Go (Golang)
- Anti-Corruption Layer (ACL) design pattern

## Sources Consulted
- Dapr Go SDK client package API (`github.com/dapr/go-sdk/client`) — `InvokeMethod`, `InvokeMethodWithContent`, `PublishEvent`, `DataContent` struct
- Dapr Go SDK service/http package API (`github.com/dapr/go-sdk/service/http`) — `NewService`, `AddServiceInvocationHandler`
- Dapr Go SDK service/common package API (`github.com/dapr/go-sdk/service/common`) — `InvocationEvent`, `Content`, `TopicEvent`
- Cross-referenced with other validated Dapr Go SDK blog posts in this repository (dapr-go-client, dapr-go-service-invocation, dapr-go-http-service, dapr-go-pubsub)

## Issues Found

### Issue 1: Incorrect `AddServiceInvocationHandler` handler signature (Critical)
**What was wrong:** The "Registering as a Dapr Service" section used a fabricated handler signature `func(ctx nethttp.Context)` with standard HTTP patterns (`ctx.PathValue("id")`, `ctx.ResponseWriter().WriteHeader(500)`, `json.NewEncoder(ctx.ResponseWriter())`). This is not the Dapr Go SDK API — `nethttp.Context` does not exist in the SDK.

**What was changed:** Replaced with the correct Dapr SDK handler signature: `func(ctx context.Context, in *common.InvocationEvent) (*common.Content, error)`. The customer ID is now extracted from `in.QueryString` using `url.ParseQuery`, and the response is returned as a `*common.Content` struct with ContentType and Data fields. The path was also changed from `/customers/{id}` to `/customers` since Dapr service invocation handlers do not support path parameter templates.

**Why:** The Dapr Go SDK `AddServiceInvocationHandler` requires handlers with the signature `func(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error)`. The original code would not compile.

### Issue 2: Incorrect and incomplete imports (Moderate)
**What was wrong:** The import block included `"net/http"` (unused) and was missing `"fmt"`, `"strings"`, `"net/url"`, `"github.com/dapr/go-sdk/service/common"`, and `daprd "github.com/dapr/go-sdk/service/http"` — all of which are used in subsequent code snippets.

**What was changed:** Removed `"net/http"`, added `"fmt"`, `"strings"`, `"net/url"`, `"github.com/dapr/go-sdk/service/common"`, and `daprd "github.com/dapr/go-sdk/service/http"`.

**Why:** The import block serves as the reference import section for the entire article. It should include packages actually used in the code and not include unused packages.

## Review Notes
- The `dapr.NewClient()`, `InvokeMethod`, `InvokeMethodWithContent`, `PublishEvent`, and `DataContent` APIs are all used correctly.
- The `common.TopicEvent` handler signature `(bool, error)` and use of `e.RawData` are correct.
- The translation logic (name splitting, phone normalization) is straightforward Go and syntactically correct.
- Error handling is minimal throughout (e.g., `json.Unmarshal` return values are ignored), which is acceptable for a blog tutorial but readers should be cautioned to add proper error handling in production code.
- The `s.Start()` return value is not checked in `main()` — minor but common in blog examples.
