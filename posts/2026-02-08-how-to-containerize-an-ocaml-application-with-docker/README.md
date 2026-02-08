# How to Containerize an OCaml Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, OCaml, Containerization, DevOps, Functional Programming, Compiled Languages

Description: Comprehensive guide to containerizing OCaml applications with Docker, featuring opam dependency management, Dream web framework, and multi-stage builds.

---

OCaml combines functional programming elegance with native compilation performance. It powers critical infrastructure at companies like Jane Street and Facebook (the Flow type checker and Infer static analyzer are both written in OCaml). Docker helps standardize OCaml deployments, especially given the complexity of the opam package manager. This guide covers containerizing OCaml applications from simple binaries to Dream-based web services.

## Prerequisites

Docker should be installed on your machine. Familiarity with OCaml and opam is helpful. We will build a complete web application from scratch.

## Creating a Sample OCaml Application

Let's build a web API using Dream, OCaml's modern web framework.

Create the project structure:

```bash
mkdir -p ocaml-docker-demo
cd ocaml-docker-demo
```

Create the `dune-project` file:

```lisp
;; dune-project - project-level dune configuration
(lang dune 3.12)
(name ocaml_docker_demo)
```

Create `bin/dune`:

```lisp
;; bin/dune - build configuration for the executable
(executable
 (name server)
 (public_name ocaml_docker_demo)
 (libraries dream yojson))
```

Create `bin/server.ml`:

```ocaml
(* bin/server.ml - HTTP server using Dream framework *)

let () =
  let port =
    match Sys.getenv_opt "PORT" with
    | Some p -> int_of_string p
    | None -> 8080
  in
  Printf.printf "Starting OCaml server on port %d\n%!" port;
  Dream.run ~port ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router [
    (* Root endpoint *)
    Dream.get "/" (fun _ ->
      Dream.respond "Hello from OCaml in Docker!");

    (* Health check endpoint *)
    Dream.get "/health" (fun _ ->
      let body = Yojson.Safe.to_string
        (`Assoc [
          ("status", `String "ok");
          ("language", `String "OCaml");
          ("ocaml_version", `String Sys.ocaml_version);
        ])
      in
      Dream.respond ~headers:[("Content-Type", "application/json")] body);

    (* Computation endpoint - recursive fibonacci *)
    Dream.get "/compute/:n" (fun request ->
      let n = Dream.param request "n" |> int_of_string in
      let rec fib = function
        | 0 -> 0
        | 1 -> 1
        | n -> fib (n - 1) + fib (n - 2)
      in
      let result = fib n in
      let body = Yojson.Safe.to_string
        (`Assoc [
          ("fibonacci_n", `Int n);
          ("result", `Int result);
        ])
      in
      Dream.respond ~headers:[("Content-Type", "application/json")] body);
  ]
```

Create the opam file:

```
# ocaml_docker_demo.opam - package dependencies
opam-version: "2.0"
name: "ocaml_docker_demo"
version: "0.1.0"
depends: [
  "ocaml" {>= "5.1.0"}
  "dune" {>= "3.12"}
  "dream" {>= "1.0.0~alpha5"}
  "yojson" {>= "2.1.0"}
]
build: [
  ["dune" "build" "-p" name "-j" jobs]
]
```

## Basic Dockerfile

The OCaml Docker ecosystem provides official images with opam pre-configured:

```dockerfile
# Basic OCaml Dockerfile with opam
FROM ocaml/opam:ubuntu-22.04-ocaml-5.1

WORKDIR /home/opam/app

# Switch to root to install system dependencies
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libev-dev libssl-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
USER opam

# Copy opam file and install dependencies
COPY --chown=opam:opam ocaml_docker_demo.opam ./
RUN opam install --deps-only -y .

# Copy source and build
COPY --chown=opam:opam . .
RUN opam exec -- dune build --release

EXPOSE 8080

CMD ["opam", "exec", "--", "./_build/default/bin/server.exe"]
```

This image is large because it includes the full OCaml compiler toolchain and opam.

## Multi-Stage Build for Production

```dockerfile
# Stage 1: Build with full OCaml toolchain
FROM ocaml/opam:ubuntu-22.04-ocaml-5.1 AS builder

# Install system dependencies for building
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libev-dev libssl-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
USER opam

WORKDIR /home/opam/app

# Copy opam file first for dependency caching
COPY --chown=opam:opam ocaml_docker_demo.opam dune-project ./
RUN opam install --deps-only -y .

# Copy source and build in release mode
COPY --chown=opam:opam . .
RUN opam exec -- dune build --release

# Stage 2: Minimal runtime
FROM ubuntu:22.04

# Install only runtime libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libev4 libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary
COPY --from=builder /home/opam/app/_build/default/bin/server.exe /app/server

# Create non-root user
RUN useradd -m -r appuser
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["/app/server"]
```

The runtime image drops from several GB to around 80 MB.

## Static Linking with Alpine

For even smaller images, build with musl on Alpine:

```dockerfile
# Stage 1: Build on Alpine for static linking
FROM ocaml/opam:alpine-3.19-ocaml-5.1 AS builder

USER root
RUN apk add --no-cache libev-dev openssl-dev linux-headers
USER opam

WORKDIR /home/opam/app

COPY --chown=opam:opam ocaml_docker_demo.opam dune-project ./
RUN opam install --deps-only -y .

COPY --chown=opam:opam . .
RUN opam exec -- dune build --release

# Stage 2: Alpine runtime
FROM alpine:3.19

RUN apk add --no-cache libev openssl ca-certificates

COPY --from=builder /home/opam/app/_build/default/bin/server.exe /app/server

RUN adduser -D -H appuser
USER appuser

EXPOSE 8080
CMD ["/app/server"]
```

## Managing opam Dependencies

The opam dependency installation step is often the slowest part of the build. Here are strategies to speed it up.

Pin exact versions in your opam file for reproducibility:

```
depends: [
  "ocaml" {= "5.1.1"}
  "dune" {= "3.12.1"}
  "dream" {= "1.0.0~alpha5"}
  "yojson" {= "2.1.2"}
]
```

Use an opam lockfile:

```bash
# Generate a lockfile locally
opam lock .
```

Copy the lockfile into Docker:

```dockerfile
# Use lockfile for reproducible builds
COPY --chown=opam:opam ocaml_docker_demo.opam ocaml_docker_demo.opam.locked ./
RUN opam install --deps-only --locked -y .
```

## The .dockerignore File

```text
# .dockerignore
.git/
_build/
_opam/
*.byte
*.native
README.md
Dockerfile
docker-compose.yml
```

## Docker Compose for Development

```yaml
# docker-compose.yml - OCaml development environment
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./bin:/home/opam/app/bin
      - ./lib:/home/opam/app/lib
    environment:
      - PORT=8080

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ocaml
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: ocamlapp
    ports:
      - "5432:5432"
```

Development Dockerfile:

```dockerfile
# Dockerfile.dev - development with dune watch mode
FROM ocaml/opam:ubuntu-22.04-ocaml-5.1

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libev-dev libssl-dev pkg-config inotify-tools curl \
    && rm -rf /var/lib/apt/lists/*
USER opam

WORKDIR /home/opam/app

COPY --chown=opam:opam ocaml_docker_demo.opam dune-project ./
RUN opam install --deps-only -y . && \
    opam install ocaml-lsp-server -y

COPY --chown=opam:opam . .

EXPOSE 8080

# Use dune watch for automatic rebuilds
CMD ["opam", "exec", "--", "dune", "exec", "bin/server.exe"]
```

## OCaml 5 and Multicore

OCaml 5 introduced multicore support with domains and effects. Configure your application to use multiple cores:

```ocaml
(* Use multiple domains for parallel request handling *)
let () =
  let num_cores = try int_of_string (Sys.getenv "CORES") with _ -> 1 in
  Printf.printf "Using %d cores\n%!" num_cores;
  (* Dream handles this internally with its async runtime *)
  Dream.run ~port:8080 ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router [ (* routes *) ]
```

Set CPU limits in Docker to match:

```bash
# Allocate 4 CPUs for an OCaml 5 multicore application
docker run -d \
  --name ocaml-server \
  -p 8080:8080 \
  --cpus="4" \
  -e CORES=4 \
  ocaml-app:latest
```

## Testing in Docker

```dockerfile
# Add a test stage
FROM ocaml/opam:ubuntu-22.04-ocaml-5.1 AS test

USER root
RUN apt-get update && apt-get install -y libev-dev libssl-dev pkg-config
USER opam

WORKDIR /home/opam/app
COPY --chown=opam:opam . .
RUN opam install --deps-only --with-test -y .
RUN opam exec -- dune runtest

# Build stage continues from test
FROM test AS builder
RUN opam exec -- dune build --release
```

## Monitoring

OCaml applications are reliable by nature thanks to the language's strong type system. Still, monitoring matters. [OneUptime](https://oneuptime.com) can track your OCaml service's availability, response times, and error rates. The `/health` endpoint gives you a quick status check, while deeper monitoring reveals performance trends over time.

## Summary

Containerizing OCaml applications requires working with opam, which adds complexity to the Docker build. Multi-stage builds separate the heavy opam/compiler toolchain from the lean runtime. The key optimization is caching the opam dependency installation layer, which is the slowest build step. Alpine-based builds produce smaller images through musl linking. OCaml 5's multicore support makes the language even more suitable for containerized services that need to handle concurrent workloads. The combination of OCaml's type safety and native compilation with Docker's standardized deployment creates a robust foundation for production services.
