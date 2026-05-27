# Validation Summary: How to Configure Kubernetes Liveness, Readiness, and Startup Probes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes HTTP, TCP socket, exec, and gRPC probe handlers
- YAML Kubernetes Pod configuration
- FastAPI
- asyncpg
- redis-py asyncio

## Sources Consulted
- Kubernetes official documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes official API reference: Pod v1 Probe, HTTPGetAction, TCPSocketAction, ExecAction, and GRPCAction fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- FastAPI official documentation: Response - Change Status Code - https://fastapi.tiangolo.com/advanced/response-change-status-code/
- redis-py official documentation: Asyncio Examples - https://redis.readthedocs.io/en/latest/examples/asyncio_examples.html
- asyncpg official documentation: Pool acquire and fetchval APIs - https://magicstack.github.io/asyncpg/current/api/index.html

## Issues Found
- The post said Kubernetes supports three probe mechanisms, but it also correctly documented gRPC probes. Updated the wording to say Kubernetes supports four ways to check health.
- The FastAPI example imported `aioredis`, which is outdated for current Redis Python async usage. Updated the example to use `redis.asyncio` from redis-py.
- The FastAPI example left the database pool and Redis client as untyped `None` globals, which made the readiness check less accurate as a reusable code example. Added current type annotations and explicit initialization checks so an uninitialized dependency returns a clear readiness failure instead of an ambiguous attribute error.

## Review Notes
- The Kubernetes probe defaults and field names match the current Pod API reference. `successThreshold` defaults to 1 and must remain 1 for liveness and startup probes.
- The gRPC probe version note is accurate: Kubernetes gRPC probes are stable as of v1.27.
- YAML snippets parse successfully. `kubectl` was not installed in the workspace, so local client-side schema validation could not be run.
- The Python code block parses successfully with Python 3.
