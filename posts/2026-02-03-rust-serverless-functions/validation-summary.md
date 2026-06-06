# Validation Summary: How to Build Serverless Functions in Rust

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Rust (edition 2021)
- AWS Lambda (custom runtime, `provided.al2023`)
- cargo-lambda (Cargo subcommand for building/deploying Lambda functions)
- `lambda_http` crate
- `tokio` async runtime
- `serde` / `serde_json`
- `tracing` / `tracing-subscriber` (CloudWatch structured logging)
- `once_cell`, `tokio::sync::OnceCell` (singleton client patterns)
- AWS SDK for Rust (`aws-config`, `aws-sdk-dynamodb`)
- `thiserror` for typed error handling
- Terraform (AWS provider — `aws_lambda_function`, `aws_apigatewayv2_*`)
- AWS API Gateway HTTP API
- AWS CLI (provisioned concurrency)

## Sources Consulted
- [lambda_http docs (docs.rs)](https://docs.rs/lambda_http/latest/lambda_http/)
- [lambda_http Body enum trait implementations](https://docs.rs/lambda_http/latest/lambda_http/enum.Body.html) — confirmed `Body` implements both `AsRef<[u8]>` and `Deref<Target=[u8]>`, so `serde_json::from_slice(body)` coerces correctly.
- [query_map crate](https://docs.rs/query_map/latest/query_map/) — confirmed `QueryMap::first(&str) -> Option<&str>` exists, but no `get` method.
- [cargo-lambda build docs](https://www.cargo-lambda.info/commands/build.html) — confirmed `--output-format zip` is required to produce `bootstrap.zip`.
- [cargo-lambda deploy / configuration docs](https://www.cargo-lambda.info/commands/deploy.html) — confirmed `--memory` is a valid flag.
- AWS Lambda custom runtime documentation (`provided.al2023`).

## Issues Found
1. **`QueryMap::get(...)` does not exist** (in the "Integrating with API Gateway" section). The original code used `stage_vars.get("api_version").map(|s| s.as_str()).unwrap_or("v1")`, but the `query_map::QueryMap` type returned by `RequestExt::stage_variables` exposes `first(&str) -> Option<&str>` (and `all`), not `get`. Replaced with `stage_vars.first("api_version").unwrap_or("v1")`.
2. **Terraform referenced `bootstrap.zip`, but the documented build command does not produce one.** `cargo lambda build --release` outputs only the `bootstrap` binary; the zip artifact required by `aws_lambda_function`'s `filename` argument needs `--output-format zip`. Added a second build invocation showing `cargo lambda build --release --output-format zip` and noted the resulting `bootstrap.zip` path so the Terraform example is internally consistent.
3. **"Cross-compilation to Amazon Linux 2" was inaccurate / inconsistent** — the Terraform example correctly uses `provided.al2023`, and modern cargo-lambda produces a binary that is compatible with both AL2 and AL2023 Lambda runtimes. Updated the wording to "cross-compiles a Linux binary for the Lambda runtime" and mentioned both `al2` and `al2023` to remove the inconsistency.

## Review Notes
- `lambda_http = "0.13"` is a valid published version and the example patterns compile against it, but the latest crate is 1.x (1.2.1 at time of review). The API surface used in the post (`run`, `service_fn`, `RequestExt::{path_parameters, query_string_parameters, stage_variables}`, `Body`) is broadly compatible across these versions, so the version pin was left as-is.
- The Cargo.toml only enables tokio's `macros` feature. `#[tokio::main]` requires a runtime feature too, but `lambda_http` transitively enables `rt-multi-thread`, so this still compiles. Authors may wish to be explicit (`features = ["macros", "rt-multi-thread"]`) for clarity.
- The cold-start example uses `Lazy<Arc<OnceCell<Client>>>`, which is unnecessarily nested. The cleaner pattern shown in the DynamoDB section (a plain `static CLIENT: OnceCell<Client> = OnceCell::const_new();`) achieves the same result. Left as-is to preserve the author's voice.
- `aws-config = "1.1"` and `aws-sdk-dynamodb = "1.15"` are older 1.x AWS SDK pins; the 1.x API has been largely stable, so the example still works against the latest versions. Future revisions could bump these.
- The `AppError` example would not literally compile as a single program because `get_user` is shown returning `Result<_, lambda_http::Error>` in one section and would need to return `Result<_, AppError>` for the `?` operator to chain into `AppError`. This is acceptable for an illustrative snippet but worth flagging.
- The `extract_user_id` helper used in the `process_request` example is referenced but not defined in the post; it's clearly meant as illustrative.
