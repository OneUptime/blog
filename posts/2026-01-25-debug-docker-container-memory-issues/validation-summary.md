# Validation Summary: How to Debug Docker Container Memory Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- Linux cgroup v2 memory controller
- Node.js / V8 heap snapshots
- Python memory profiling with memory-profiler and tracemalloc
- Java / JVM container memory options
- Bash monitoring and health-check scripts

## Sources Consulted
- Docker resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker CLI `docker inspect` documentation: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI `docker stats` documentation: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker CLI `docker events` documentation: https://docs.docker.com/reference/cli/docker/system/events/
- Docker CLI `docker cp` documentation: https://docs.docker.com/reference/cli/docker/container/cp/
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Node.js CLI documentation for `--heapsnapshot-signal` and `--expose-gc`: https://nodejs.org/api/cli.html
- Node.js V8 API documentation for `v8.writeHeapSnapshot()`: https://nodejs.org/api/v8.html
- memory-profiler PyPI project documentation: https://pypi.org/project/memory-profiler/
- Python tracemalloc documentation: https://docs.python.org/3/library/tracemalloc.html
- Oracle Java 21 `java` command documentation for `-XX:MaxRAMPercentage`: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html

## Issues Found
- The Node.js heap snapshot example suggested `--expose-gc` as the command-line setup for heap snapshots. Changed it to `--heapsnapshot-signal=SIGUSR2`, which matches Node.js documentation for signal-triggered heap snapshots.
- The Node.js heap snapshot example stored the return value of `v8.writeHeapSnapshot()` in a variable named `snapshotStream`, but the API writes a file and returns the filename. Renamed the variable to `writtenFile` and logged that value.
- Removed an unused `fs` import from the Node.js heap snapshot example.
- The memory monitoring script wrote a CSV header containing `memory_bytes,memory_percent` but only logged a human-readable Docker stats value and no percentage. Updated it to read cgroup v2 `memory.current` and `memory.max`, then write bytes and percent values consistently.
- The JavaScript event listener leak example referenced `this.handleError` without defining it and described cleanup as a destructor. Added a simple `handleError` method and changed the comment to cleanup when the instance is no longer needed.
- The thread-count command used `/proc/*/status` without an inner shell, which would allow the host shell to expand the glob before `docker exec`. Wrapped the command in `sh -c`.
- The memory health-check script divided by `memory.max` without handling the cgroup v2 unlimited value `max`. Added a guard for unlimited memory.
- The Java section stated that explicit heap sizing is needed to respect container limits, which is too strong for modern Java because container support is enabled by default in current JDKs. Reworded it to say heap sizing often needs tuning for container limits and clarified the purpose of `MaxRAMPercentage`.

## Review Notes
The Docker Compose examples use `deploy.resources`, which is valid in the Compose Deploy Specification and current Compose implementations, but behavior can still vary by deployment platform. The cgroup file examples are explicitly cgroup v2; hosts using cgroup v1 require different file paths. The `memory-profiler` package example is technically valid, but the project notes that it is no longer actively maintained.
