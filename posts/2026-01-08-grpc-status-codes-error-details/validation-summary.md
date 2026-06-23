# Validation Summary: How to Return Rich Error Details with gRPC Status Codes

## Status
validated

## Post Type
Tutorial / Guide (implementation-focused, with Go and Python code)

## Technologies Covered
- gRPC (canonical status codes and the rich error model)
- Google's `google.rpc.Status` and `google/rpc/error_details.proto` (ErrorInfo, RetryInfo, DebugInfo, QuotaFailure, PreconditionFailure, BadRequest, RequestInfo, ResourceInfo, Help, LocalizedMessage)
- Go: `google.golang.org/grpc/status`, `google.golang.org/grpc/codes`, `google.golang.org/genproto/googleapis/rpc/errdetails`, `durationpb`, `protoadapt`
- Python: `grpcio`, `grpcio-status` (`grpc_status.rpc_status`), `googleapis-common-protos` (`google.rpc.error_details_pb2`, `status_pb2`), `google.protobuf.any_pb2`

## Sources Consulted
- gRPC status codes reference — https://grpc.io/docs/guides/status-codes/ and https://grpc.github.io/grpc/core/md_doc_statuscodes.html
- gRPC error handling guide — https://grpc.io/docs/guides/error/
- Go `status` package (`WithDetails(details ...protoadapt.MessageV1)`) — https://pkg.go.dev/google.golang.org/grpc/status
- Official gRPC Python errors example (server uses `any_pb2.Any().Pack(...)` + `context.abort_with_status(rpc_status.to_status(...))`) — https://github.com/grpc/grpc/tree/master/examples/python/errors
- `grpc_status/rpc_status.py` source (`to_status` returns a `_Status` namedtuple implementing `grpc.Status`) — https://github.com/grpc/grpc/blob/master/src/python/grpcio_status/grpc_status/rpc_status.py
- grpc-io discussion on converting an int code to `grpc.StatusCode` (enum values are `(int, str)` tuples) — https://groups.google.com/g/grpc-io/c/EdIXjMEaOyw

## Issues Found
The status-code table and Mermaid diagrams (values 0–16) are correct and match the canonical gRPC codes. The error-detail type list and the overall Go/Python flow are accurate. The following technical errors were found and fixed:

1. **Go `errors` package — missing `fmt` import.** `RateLimitError` calls `fmt.Sprintf` but `fmt` was not in the import block (`undefined: fmt`). Added `"fmt"`.

2. **Go `CompleteError` — won't compile.** It used `details ...interface{}` and spread a `[]interface{}` into `st.WithDetails(...)`, whose signature is `WithDetails(details ...protoadapt.MessageV1)`. A `[]interface{}` cannot be passed as `...protoadapt.MessageV1`. Changed the parameter and the two slices to `protoadapt.MessageV1` and added the `google.golang.org/protobuf/protoadapt` import.

3. **Go service package — missing `fmt` import and unused `time` import.** The `DeleteUser`/`TransferFunds` methods use `fmt.Sprintf` (was not imported), while `time` was imported but never referenced in the snippet (Go treats unused imports as a compile error). Added `"fmt"`, removed `"time"`.

4. **Go client package — unused `codes` and `time` imports.** Neither `codes.` nor `time.` is referenced in the snippet, so both caused compile errors. Removed them.

5. **Go interceptors package — missing `fmt`, `os`, and `strings` imports.** The interceptor uses `fmt.Sprintf`, `strings.Split`, and `os.Getenv`, none of which were imported. Added all three.

6. **Python — missing `datetime` import.** `create_rate_limit_error` calls `datetime.timedelta(...)` but `datetime` was never imported (`NameError`). Added `import datetime`.

7. **Python — `grpc.Status` has no `.exception()` method.** The three `create_*_error` helpers ended with `return rpc_status.to_status(status).exception()`. `rpc_status.to_status` returns a `_Status` namedtuple implementing the abstract `grpc.Status` (which only exposes `code`, `details`, `trailing_metadata`); calling `.exception()` raises `AttributeError`. Changed them to `return rpc_status.to_status(status)` and updated the return annotations to `-> grpc.Status`, matching the idiomatic usage `context.abort_with_status(rpc_status.to_status(...))` already shown in the servicer.

8. **Python — malformed `Any` detail.** In `UserServicer.CreateUser`, the detail was built as `any_pb2.Any(value=bad_request.SerializeToString())`, which sets the `value` bytes but leaves `type_url` empty, so the client's `detail.Is(...)`/`detail.Unpack(...)` cannot recognize it. Replaced with `detail = any_pb2.Any(); detail.Pack(bad_request)`, consistent with the rest of the post and the official gRPC example.

9. **Python — `grpc.StatusCode(status.code)` raises `ValueError`.** `status.code` from `rpc_status.from_call` is a plain int, but `grpc.StatusCode` enum members are keyed by `(int, str)` tuples, so constructing the enum from an int fails. Replaced with a lookup over the enum members (`next((c for c in grpc.StatusCode if c.value[0] == status.code), None)`) and a safe fallback to the numeric code.

## Review Notes
- The Go client uses `grpc.Dial(...)`, which is deprecated since grpc-go v1.63 in favor of `grpc.NewClient(...)`. It still compiles and works, so it was left as-is, but readers on recent grpc-go versions may see a deprecation notice; `grpc.NewClient` is the current recommended constructor.
- The Python `from typing import Dict, List, Optional` imports `List`/`Optional`, which are unused. This is only a lint warning (not a runtime/compile error) and was left untouched.
- Several illustrative helpers and fields (`isAuthenticated`, `hasPermission`, `generateID`, `RateLimiter`, `pb.Empty`, `user.Status`/`user.Balance`/`user.ActiveOrders`, `_generate_id`, `_is_valid_email`) are intentionally undefined stand-ins for app-specific code and are fine in the context of illustrative snippets.
- The status-code numbering, the error-detail proto types, and the `WithDetails`/`status.New`/`status.FromError`/`st.Details()` Go APIs are all current and correct.
