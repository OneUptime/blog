# Validation Summary: Iguazio 'No space left on device': Find Feature Store, Trace and Artifact Growth

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands.

## Technologies Covered

- Iguazio data layer, platform dashboards, and predefined storage containers
- MLRun feature store, model monitoring, and artifact management
- Kubernetes pods, container logs, volumes, and local ephemeral storage
- GNU Coreutils: `df`, `du`, `sort`, and `tail`
- Bash shell syntax
- Parquet, Iguazio NoSQL, and filesystem versus object-store paths

## Sources Consulted

- [Kubernetes kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — namespace and container selection, relative time filtering, timestamps, and previous-container logs.
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — named pod lookup and wide output.
- [Kubernetes kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — pod details and associated events.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — local ephemeral storage accounting and memory-backed versus disk-backed volumes.
- [GNU df manual](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html) and [upstream df source](https://github.com/coreutils/coreutils/blob/master/src/df.c) — path-specific filesystem statistics, human-readable sizes, and inode reporting.
- [GNU du upstream source](https://github.com/coreutils/coreutils/blob/master/src/du.c) — depth reporting and filesystem-boundary options; the post's [du manual link](https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html) is the appropriate documentation destination.
- [GNU sort manual](https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html) — sorting human-readable disk usage with `-h`.
- [GNU tail manual](https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html) and [upstream tail source](https://github.com/coreutils/coreutils/blob/master/src/tail.c) — selecting the last 20 lines with `-n 20`.
- [Iguazio platform dashboard](https://www.iguazio.com/docs/latest-release/intro/ui/) — Storage capacity and per-container usage, Events, and permission-dependent access.
- [Iguazio predefined containers](https://www.iguazio.com/docs/latest-release/services/data-layer/containers/predefined-containers/) — persistent user home directories and shared project artifact paths.
- [MLRun feature-store sources and targets](https://docs.mlrun.org/en/stable/feature-store/sources-targets.html) — default Parquet and NoSQL targets, offline and online roles, and configurable project feature-store locations.
- [MLRun model-monitoring architecture](https://docs.mlrun.org/en/stable/model-monitoring/index.html) — serving data collection, Parquet writes, monitoring feature sets, streams, and database storage.
- [MLRun artifacts](https://docs.mlrun.org/en/stable/store/artifacts.html) — producer and location metadata, query limits, path overrides, run-specific paths, artifact URIs, and deletion strategies.

## Issues Found

No technical issues found.

The README.md required no changes.

## Review Notes

- All three fenced Bash examples passed `bash -n`. Commands and flags were checked against official documentation or upstream command help text in source. No live Kubernetes or Iguazio deployment was used, so platform-specific execution, permissions, capacity values, and recovery were not tested.
- The commands correctly distinguish pod inspection from filesystem checks inside the failing container. Their placeholder values must be replaced as stated in the post.
- The directory scan correctly requires GNU utilities, limits reported depth rather than traversal depth, retains errors on stderr, and treats directory usage as a candidate attribution rather than a complete backend inventory.
- Platform documentation confirms the distinction between user home storage and shared project storage. MLRun documentation supports separate offline and online feature targets, monitoring storage beyond Parquet, and artifact metadata that is independent of stored files.
- Artifact metadata-only deletion does not reclaim file contents. The installed-release caveat is appropriate because supported artifact types and deletion behavior can vary.
- The post specifies no fixed software release. Iguazio's consulted latest-release documentation identifies itself as version 3.7; MLRun stable and Kubernetes documentation are moving references. No deprecated command options were identified.
- The referenced technical URLs point to appropriate official resources. Direct browser retrieval of GNU manual pages repeatedly timed out; indexed official manual excerpts and upstream GNU source provided command verification. These retrieval failures do not establish that the links are broken.
- Recovery and monitoring recommendations are operational guidance, not a claim that every occurrence of the error has one storage cause. The post appropriately requires capacity checks at the actual failed destination and validation of downstream reads after recovery.
