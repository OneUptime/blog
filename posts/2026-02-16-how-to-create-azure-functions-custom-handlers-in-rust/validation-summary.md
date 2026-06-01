# Validation Summary: How to Create Azure Functions Custom Handlers in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions custom handlers
- Azure Functions HTTP triggers and bindings
- Azure Functions Core Tools
- Azure CLI zip deployment
- Rust
- Actix Web
- Serde and serde_json
- Chrono
- Docker-based Rust cross-compilation

## Sources Consulted
- Microsoft Learn: Azure Functions custom handlers - https://learn.microsoft.com/en-gb/azure/azure-functions/functions-custom-handlers
- Microsoft Learn: Create a Go or Rust function in Azure using Visual Studio Code - https://learn.microsoft.com/en-us/azure/azure-functions/how-to-create-function-azure-cli
- Microsoft Learn: host.json reference for Azure Functions 2.x - https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Microsoft Learn: Supported languages in Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
- Microsoft Learn: Azure CLI `az functionapp deployment source config-zip` - https://learn.microsoft.com/en-us/cli/azure/functionapp/deployment/source
- Actix Web documentation: Getting Started, Application, Extractors, and web module API - https://actix.rs/docs/getting-started/ and https://docs.rs/actix-web/latest/actix_web/web/
- Chrono crate documentation - https://docs.rs/chrono
- Local verification with `cargo check` against the Rust code block and Cargo.toml dependency block in the post.

## Issues Found
- The Azure Functions directory layout placed `function.json` under `api/hello/`. Azure Functions expects each `function.json` under a function folder at the app root, while `/api/hello` is the public HTTP route. Changed the setup and deployment commands to use `hello/function.json` and `deploy/hello/`.
- The post omitted `local.settings.json`, including `FUNCTIONS_WORKER_RUNTIME=Custom`, which Microsoft documents as required for custom handlers during local development. Added the local settings snippet.
- The first Cargo.toml block omitted `chrono` even though the main Rust handler uses `chrono::Utc::now()`. Moved `chrono` into the main dependency list and removed the later correction note.
- The Rust response field was named `rust_version` but populated with `env!("CARGO_PKG_VERSION")`, which is the package version. Renamed it to `package_version`.
- The Rust code manually parsed the raw query string and did not URL-decode query values. Replaced it with Actix Web's `web::Query` extractor.
- The Rust code imported unused `middleware`, which caused a compiler warning. Removed the unused import.
- The fallback custom handler port was `7071`, which is the local Functions host's public port rather than the private custom handler port. Changed the standalone fallback to `8080`.
- The non-HTTP trigger example looked up `queueMessage`, but Azure Functions custom handler payload keys match the trigger binding name in `function.json`. Updated the example to use `myQueueItem` and clarified the binding-name requirement.
- The non-HTTP queue example returned an HTTP `res` output even though the example was described as a queue trigger. Changed the response to an empty `Outputs` object with logs.
- The custom handler explanation said all events are forwarded as HTTP POST requests. Clarified that non-HTTP triggers use POST payloads, while HTTP forwarding can preserve the original method and route.
- The performance section made precise cold-start and memory comparisons without enough context. Reworded the claims to be workload-dependent and aligned with Azure Functions billing behavior.

## Review Notes
- The Azure CLI zip deployment command is current and valid.
- The Actix Web handler code compiled successfully with the dependency block from the post using `cargo check`.
- The Docker image used for musl cross-compilation is a common community image, not an official Microsoft or Rust image. The command is technically plausible, but future reviews could replace it with a fully documented official build path if desired.
