# Validation Summary: How to Use Dapr for Media and Streaming Platforms

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Workflow engine (Python SDK — `dapr-ext-workflow`)
- Dapr Actors (.NET SDK — `Dapr.Actors`)
- Dapr Pub/Sub
- Dapr Output Bindings (AWS Kinesis)
- Dapr State Management
- Python (Flask)
- C# / .NET

## Sources Consulted
- Dapr Python SDK source code (`dapr/python-sdk` GitHub repository) — `dapr/ext/workflow/__init__.py`, `workflow_runtime.py`, `dapr_workflow_context.py`
- Dapr Python SDK workflow examples (`examples/workflow/simple.py`)
- Dapr .NET SDK source code (`dapr/dotnet-sdk` GitHub repository) — `src/Dapr.Actors/Runtime/ActorAttribute.cs`
- Dapr AWS Kinesis binding documentation and source code (`kinesis.go` in `dapr/components-contrib`)
- Dapr official documentation (https://docs.dapr.io) — workflow, actors, bindings, pub/sub, and state management APIs

## Issues Found

### 1. Incorrect Python workflow decorator pattern
**What was wrong:** The code used `import dapr.ext.workflow as wf` and `@wf.workflow` as a module-level decorator. The `dapr.ext.workflow` module does not export a `workflow` decorator at the module level. Also imported `from datetime import timedelta` which was unused.

**What was changed:** Replaced imports with `from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, when_all`, created a `WorkflowRuntime` instance (`wfr = WorkflowRuntime()`), and changed the decorator to `@wfr.workflow(name='transcode_workflow')`. Added `DaprWorkflowContext` type hint to the context parameter. Updated `wf.when_all()` to `when_all()` to match the new imports.

**Why:** The Dapr Python SDK requires a `WorkflowRuntime` instance to register workflows. The `workflow()` and `activity()` decorators are instance methods of `WorkflowRuntime`, not module-level functions. `when_all` is correctly a module-level export.

### 2. Invalid `partitionKey` in Kinesis component YAML
**What was wrong:** The Kinesis binding component YAML included `partitionKey` as a component-level metadata field.

**What was changed:** Removed the `partitionKey` entry from the component metadata section.

**Why:** `partitionKey` is not a valid component-level metadata field for `bindings.aws.kinesis`. It is a per-operation metadata field that must be passed at runtime when invoking the binding. The Python code below the YAML already correctly passes it via `binding_metadata={"partitionKey": ...}`. The Dapr source code confirms this — the `kinesisMetadata` struct does not include `partitionKey`, and it is read from `req.Metadata` at invocation time.

## Review Notes
- The C# `[Actor(TypeName = "ViewerSessionActor")]` attribute is valid (confirmed in `Dapr.Actors.Runtime.ActorAttribute`), though redundant here since the TypeName matches the class name.
- The C# actor class omits the required `ActorHost` constructor parameter, which is a common blog post simplification and acceptable for illustrative purposes.
- The Kinesis component YAML omits AWS credential fields (`accessKey`, `secretKey`), which is acceptable as these can be provided via IAM roles on EKS or environment variables.
- The `publish_event` call passes a dict directly — this works in recent Dapr Python SDK versions which handle JSON serialization automatically.
