# Validation Summary: How to Deploy a Rust Application to AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Rust
- Actix Web
- Tokio
- tracing and tracing-subscriber
- Docker multi-stage builds
- cargo-chef
- Amazon ECR
- Amazon ECS Fargate
- Amazon CloudWatch Logs
- AWS Lambda custom runtimes
- lambda_http and lambda_runtime
- GitHub Actions

## Sources Consulted
- Actix Web server documentation: https://actix.rs/docs/server/
- Actix Web middleware documentation: https://actix.rs/docs/middleware
- Actix Web crate documentation: https://docs.rs/crate/actix-web/latest
- num_cpus crate documentation: https://docs.rs/crate/num_cpus/latest
- lambda_http crate documentation: https://docs.rs/crate/lambda_http/latest
- lambda_runtime crate documentation: https://docs.rs/crate/lambda_runtime/latest
- AWS Lambda Rust HTTP events documentation: https://docs.aws.amazon.com/lambda/latest/dg/rust-http-events.html
- AWS Lambda OS-only runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-provided.html
- AWS CLI create-function documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- Amazon ECS task definition parameters documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS container health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS LogConfiguration API documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- AWS CLI create-service documentation: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker build best practices: https://docs.docker.com/build/building/best-practices/
- aws-actions/amazon-ecr-login documentation: https://github.com/aws-actions/amazon-ecr-login
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- cargo-chef project documentation: https://github.com/cargo-chef/cargo-chef
- Linked OneUptime monitoring post: https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view

## Issues Found
- The description mentioned EC2, but the post only covers ECS Fargate and Lambda. Updated the description to match the actual content.
- The opening claim said Rust compiles to a single binary with no runtime dependencies. That is too absolute because Rust binaries may still dynamically link system libraries depending on build target and dependencies. Reworded it to say Rust can compile to a single binary with minimal runtime dependencies.
- The Actix Web example called `num_cpus::get()` without declaring the `num_cpus` crate in `Cargo.toml`. Added `num_cpus = "1"` and verified the example with `cargo check`.
- The Dockerfile comment said the runtime image used `scratch`, but the actual image was `debian:bookworm-slim`. Updated the comment to match the Dockerfile.
- The ECS task definition health check used `curl`, but the runtime image did not install `curl`. Added `curl` to the runtime image packages so the health check command can run inside the container.
- The ECS task definition referenced the CloudWatch Logs group `/ecs/rust-app`, but the deployment commands did not create it. Added an `aws logs create-log-group` command before task definition registration.
- The Lambda dependency versions used old `0.11` releases. Updated `lambda_http` and `lambda_runtime` to the current `1` major version and verified the handler with `cargo check`.
- The Lambda logging snippet enabled JSON formatting but the dependency declaration did not enable the `json` feature for `tracing-subscriber`. Updated the dependency to include `features = ["json"]`.
- The GitHub Actions workflow pushed only a SHA-tagged image while the ECS task definition referenced `:latest`, so `aws ecs update-service --force-new-deployment` would redeploy the existing `latest` image rather than the new SHA image. Updated the workflow to tag and push both `${{ github.sha }}` and `latest`.
- The performance tuning snippet used `Duration` without importing it. Added `use std::time::Duration;`.
- The performance tuning comment said `num_cpus::get()` matches the Fargate vCPU allocation. That is too strong because it reports available logical CPUs rather than the configured ECS task CPU value directly. Updated the comment to describe what the call does.
- The Lambda cold start claim said Rust is often under 10ms. Reworded it to a more defensible statement that small Rust Lambda functions can have very fast cold starts.

## Review Notes
The Rust Actix and Lambda snippets were checked locally with `cargo check` using current compatible crate versions. The AWS CLI examples are structurally valid but still require real account-specific resources such as IAM roles, VPC subnets, security groups, and an existing ECR repository or repository creation step. For production use, the GitHub Actions deployment would be stronger if it registered a new ECS task definition revision with an immutable image tag instead of relying on a mutable `latest` tag, but the current fix keeps the post's existing deployment approach technically functional.
