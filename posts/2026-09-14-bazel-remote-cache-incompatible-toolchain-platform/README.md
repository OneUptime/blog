# Fix Bazel Cache Incompatibility with Toolchain and Platform Inputs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bazel, Build Cache, CI/CD, Architecture, Troubleshooting

Description: Diagnose incompatible Bazel cache hits by auditing declared tools, target and execution platforms, and hidden host inputs before isolating affected cache entries.

---

An incompatible binary restored from a Bazel remote cache does not usually mean that a content hash collided. More often, two actions appeared identical to Bazel while depending on different undeclared host state: a compiler under `/usr/bin`, a system library, a CPU-specific default, or a wrapper script that reads the environment.

Bazel's remote-caching documentation explicitly identifies tools outside the workspace as a source of incorrect cross-machine cache hits. The remedy is to represent the complete computation in the action graph. [Bazel remote caching](https://bazel.build/remote/caching).

## Distinguish Invalid Reuse from an Invalid Build

First confirm which action restored the incompatible output. Preserve the action identity, producer information if available, toolchain configuration, target platform, and output digest.

Rebuild the affected target in a disposable output base with remote reads and writes disabled:

```bash
bazel --output_base=/tmp/bazel-cache-diagnosis build //app:server \
  --remote_cache= \
  --remote_executor= \
  --disk_cache= \
  --remote_accept_cached=false \
  --remote_upload_local_results=false
```

Use a unique empty diagnostic output base and the same intended target/toolchain flags as the failing build. Clearing `remote_executor` prevents a CI configuration from silently keeping remote execution enabled. If the configuration also selects a remote-only spawn strategy, choose a supported local strategy for this diagnostic. The command removes remote execution and remote/disk-cache influence; it is not a routine CI configuration.

If the fresh local binary is also incompatible, investigate platform selection, linking, packaging, and deployment. If the local output works but the restored output does not, compare the action inputs and producer environment before invalidating the entire service.

## Treat Tools as Inputs

A shell script that executes `/usr/bin/cc` can use different compiler bytes on two runners even when its own source file is identical. Hashing the wrapper script does not automatically hash everything the wrapper discovers on the host.

Use rules that declare their compiler, linker, runtime files, headers, and relevant configuration through a proper toolchain. A custom action should receive its executable and runfiles through declared tool targets rather than searching an uncontrolled `PATH`.

For example, the action implementation portion of a custom rule can use:

```python
def _compile_impl(ctx):
    output = ctx.actions.declare_file(ctx.label.name + ".out")
    compiler = ctx.attr._compiler[DefaultInfo].files_to_run
    ctx.actions.run(
        executable = compiler,
        tools = [compiler],
        inputs = ctx.files.srcs,
        outputs = [output],
        arguments = ["--output", output.path] + [f.path for f in ctx.files.srcs],
        use_default_shell_env = False,
    )
    return [DefaultInfo(files = depset([output]))]
```

This is an illustrative rule fragment. Its rule declaration must define `_compiler` as an executable label in the execution configuration and `srcs` appropriately; the compiler must support the illustrated arguments. Real language rules also need their complete include, linking, and toolchain model.

Declaring a wrapper is only sufficient if its declared files and runfiles include the tools it actually uses. Bazel's toolchain framework exists to resolve tools compatible with the execution and target platforms. [Toolchains](https://bazel.build/extending/toolchains).

## Separate Target Platform from Execution Platform

The target platform describes where the output should run. The execution platform describes where the compiler or other action executes. Cross-compilation requires a toolchain connecting those two environments; an arm64 target label does not turn an amd64-only compiler into a cross-compiler.

A platform declaration can identify the intended target:

```python
platform(
    name = "linux_arm64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:aarch64",
    ],
)
```

Assuming this declaration lives in `platforms/BUILD.bazel` and matching toolchains are registered:

```bash
bazel build //app:server \
  --platforms=//platforms:linux_arm64 \
  --toolchain_resolution_debug='.*'
```

Review which toolchain was selected and whether its declared inputs capture the compiler and runtime assumptions. Platform constraints guide resolution; merely adding a label cannot model arbitrary host files or repair a non-hermetic custom command. [Platform and toolchain rules](https://bazel.build/reference/be/platforms-and-toolchains).

## Model Behavior-Changing Environment

Audit compiler flags such as native CPU tuning, SDK selection, locale-sensitive generators, feature switches, and linker search paths. Include meaningful values in the action environment or rule inputs. Avoid inheriting broad machine-specific environment when a small explicit set suffices.

A compiler that auto-detects the build host's CPU can emit instructions unavailable on the deployment CPU. Disable that implicit detection or represent the chosen target CPU explicitly. Likewise, linking against an undeclared host library leaves compatibility outside the cache key.

Namespace separation can contain an incident while the rules are repaired, but it is not a substitute for complete action inputs. Two incompatible machines within the same namespace can still share a bad key.

## Verify Correct and Incorrect Reuse

Use two clean environments. Populate the cache with the declared toolchain on one, restore on the other, and run the binary on its actual target platform. Then change a compiler version, target constraint, or meaningful feature flag and confirm the relevant action identity changes.

Also move the checkout without changing logical inputs. That should not require sacrificing reuse unless the task intentionally embeds its location. Compare outputs and execution logs using Bazel's cache-debugging workflow. [Local-execution cache debugging](https://bazel.build/remote/cache-local).

Quarantine suspect cache entries or move trusted builds to a clean namespace after correcting the rules. Otherwise old results produced under incomplete keys can remain available. The durable fix is a reproducible action whose declared tools, files, environment, and platform describe the binary it produces.

## References

- [Bazel remote caching and known issues](https://bazel.build/remote/caching)
- [Bazel toolchain framework](https://bazel.build/extending/toolchains)
- [Platform and toolchain rules](https://bazel.build/reference/be/platforms-and-toolchains)
- [Debugging cache hits for local execution](https://bazel.build/remote/cache-local)
