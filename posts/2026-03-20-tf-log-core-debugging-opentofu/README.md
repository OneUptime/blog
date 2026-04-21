# How to Use TF_LOG_CORE for Core Debugging in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Debugging, TF_LOG_CORE, Core Engine, Troubleshooting, Infrastructure as Code

Description: Learn how to use TF_LOG_CORE to isolate debug logging to OpenTofu's core engine - graph construction, state management, and plan generation - while keeping provider output quiet.

## Introduction

When you suspect a problem in OpenTofu's core engine (dependency graph, state operations, plan generation) rather than in a provider, `TF_LOG_CORE` lets you enable verbose logging only for the core subsystem without drowning in provider-level HTTP traffic, as long as broader `TF_LOG` logging is not also set.

## TF_LOG_CORE vs TF_LOG

| Variable | Scope |
|---|---|
| `TF_LOG` | All subsystems (core + all providers) |
| `TF_LOG_CORE` | Core engine only |
| `TF_LOG_PROVIDER` | All providers only |

## Enabling Core-Only Logging

```bash
# Enable DEBUG only for the core engine

unset TF_LOG TF_LOG_PROVIDER
export TF_LOG_CORE=DEBUG
tofu plan

# Enable TRACE for the most detailed core logging
unset TF_LOG TF_LOG_PROVIDER
export TF_LOG_CORE=TRACE
tofu apply

# Disable provider logging entirely while debugging core
unset TF_LOG
export TF_LOG_CORE=TRACE
export TF_LOG_PROVIDER=OFF
tofu plan
```

## What Core Logging Shows

Core-level logging includes:

- **Graph construction**: How resources are ordered for creation/deletion
- **State locking/unlocking**: Lock acquisition and release events
- **Plan generation**: How the diff between state and configuration is computed
- **Module loading**: How module sources are resolved and loaded
- **Variable evaluation**: How input variables and locals are resolved

Example core TRACE output:

```text
2026-03-20T10:00:01.000Z [DEBUG] Building and walking plan graph for normal
2026-03-20T10:00:01.010Z [TRACE] building graph for walkPlan
2026-03-20T10:00:01.011Z [TRACE] Executing graph transform *tofu.ConfigTransformer
2026-03-20T10:00:01.012Z [DEBUG] Starting graph walk: walkPlan
2026-03-20T10:00:01.020Z [TRACE] vertex "aws_vpc.main": starting visit (*tofu.NodePlannableResourceInstance)
```

## Diagnosing Dependency Cycle Errors

Core TRACE logs show exactly how the dependency graph is built, which helps trace circular dependency errors:

```bash
# Enable TRACE for core to see full graph construction
unset TF_LOG TF_LOG_PROVIDER
export TF_LOG_CORE=TRACE
export TF_LOG_PATH=core-debug.log
tofu plan 2>/dev/null

# Search the log for cycle detection
grep -Ei "cycle|circular|dependency" core-debug.log
```

## Diagnosing State Lock Issues

```bash
# Debug state lock operations
unset TF_LOG TF_LOG_PROVIDER
export TF_LOG_CORE=DEBUG
export TF_LOG_PATH=lock-debug.log
tofu apply

# Find lock-related messages
grep -Ei "lock|unlock" lock-debug.log
```

## Combining Core and Provider Logging at Different Levels

```bash
# Core at TRACE, providers at WARN - maximum core detail, minimal provider noise
unset TF_LOG
export TF_LOG_CORE=TRACE
export TF_LOG_PROVIDER=WARN
export TF_LOG_PATH=selective-debug.log
tofu plan
```

## Saving and Analyzing Core Logs

```bash
# Capture core trace with timestamps
unset TF_LOG
TF_LOG_CORE=TRACE TF_LOG_PROVIDER=OFF TF_LOG_PATH=/tmp/opentofu-core.log tofu apply

# Extract just the graph walk entries
grep -E "Starting graph walk|building graph|Executing graph transform|vertex" /tmp/opentofu-core.log | head -100
```

## Conclusion

`TF_LOG_CORE` is the right tool when OpenTofu's behavior seems wrong at the orchestration level: unexpected resource ordering, failed state locks, or plan generation that doesn't match your expectations. By isolating core logging from provider logging, you get a focused signal without the noise of thousands of provider API call traces.
