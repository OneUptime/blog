# Validation Summary: How to Fix 'Out of Range' Errors in gRPC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC status codes
- gRPC-Go status and codes packages
- Go error handling
- Google RPC error details
- gRPC unary server interceptors
- API validation patterns

## Sources Consulted
- gRPC status code documentation: https://grpc.io/docs/guides/status-codes/
- gRPC-Go status package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- gRPC-Go codes package documentation: https://pkg.go.dev/google.golang.org/grpc/codes
- gRPC-Go interceptor API documentation: https://pkg.go.dev/google.golang.org/grpc#UnaryServerInterceptor
- Google RPC errdetails package documentation: https://pkg.go.dev/google.golang.org/genproto/googleapis/rpc/errdetails
- Google API Improvement Proposal 193, Errors: https://google.aip.dev/193
- Google API Improvement Proposal 194, Automatic retry configuration: https://google.aip.dev/194
- google.rpc canonical code definitions: https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto

## Issues Found
- The post described OUT_OF_RANGE too broadly as any well-formed value outside acceptable boundaries. Updated the explanation to match official gRPC guidance: INVALID_ARGUMENT applies to arguments problematic regardless of system state, while OUT_OF_RANGE applies to operations past a valid range, especially where a system state change could make the request valid.
- Several examples classified static invalid inputs as OUT_OF_RANGE. Updated examples such as negative age, page zero in a 1-indexed API, negative offsets, negative indexes, invalid quantities, non-positive prices, invalid discount percentages, and negative file offsets to use INVALID_ARGUMENT.
- The pagination example used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The pagination example could divide by zero if both the request page size and service default page size were unset or non-positive. Added a fallback default page size.
- The numeric validation, file service, client error handler, and middleware snippets had unused imports or missing imports. Removed unused imports and added the missing `context`, `strconv`, and example protobuf import in the client snippet.
- The error flow diagram labeled static low/negative values as OUT_OF_RANGE. Updated those labels to INVALID_ARGUMENT while leaving current-range boundary failures as OUT_OF_RANGE.

## Review Notes
The code examples still depend on illustrative generated protobuf types and helper functions such as `generateOrderID`, `generateAppointmentID`, and `myapp/proto`; those are reasonable placeholders for a blog post. No deprecated gRPC-Go APIs were found in the reviewed snippets.
