# Validation Summary: How to Build a gRPC Service in Python and Deploy to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3.11+
- gRPC Python
- Protocol Buffers
- Docker
- Azure CLI
- Azure Container Apps
- Azure Container Registry

## Sources Consulted
- gRPC Python basics tutorial: https://grpc.io/docs/languages/python/basics/
- gRPC Python generated-code reference: https://grpc.io/docs/languages/python/generated-code/
- Protocol Buffers Python generated-code guide: https://protobuf.dev/reference/python/python-generated/
- Azure Container Apps ingress documentation: https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
- Azure CLI `az containerapp create` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest#az-containerapp-create
- PyPI package metadata for `grpcio`, `grpcio-tools`, `grpcio-reflection`, and `protobuf`: https://pypi.org/

## Issues Found
- The generated Python code was written to `generated/`, but `inventory_pb2_grpc.py` imports `inventory_pb2` as a top-level module with that invocation. This made `from generated import inventory_pb2_grpc` fail. Changed the generation commands to use `-I . --python_out=. --pyi_out=. --grpc_python_out=.` with `protos/inventory.proto`, added `protos/__init__.py`, and updated imports to `from protos import ...`.
- The project setup did not create the `protos` directory before instructing readers to create `protos/inventory.proto`. Added `mkdir protos`.
- The server imported `asyncio` but did not use it. Removed the unused import from the example.
- The code comment said protobuf messages are immutable. Python protobuf message objects are mutable, so the comment was misleading. Reworded it to describe replacing the product value in the in-memory store.
- The requirements pinned older package versions. Updated the gRPC packages to `1.80.0` and `protobuf` to `6.33.6`, a compatible current set verified with package metadata.
- The Azure Container Apps section said ingress defaults to HTTP/1.1. Microsoft documentation lists the default `transport` value as `auto`. Updated the wording while keeping `--transport http2` as the explicit gRPC setting.
- The performance claim said gRPC is typically `5-10x` faster than REST. That benchmark-style claim was too broad without a specific workload. Reworded it to state that gRPC can be significantly faster for many service-to-service workloads, with results depending on payload, network, and implementation.

## Review Notes
The Azure CLI was not installed in the review environment, so CLI syntax was checked against Microsoft Learn rather than executed locally. The updated Python/protobuf generation path was tested in a temporary directory by installing the pinned dependencies, generating stubs from the article's `.proto`, and importing the server module successfully.
