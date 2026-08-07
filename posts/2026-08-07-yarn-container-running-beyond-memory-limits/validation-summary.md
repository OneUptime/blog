# Validation Summary: Fix YARN “Container Is Running Beyond Memory Limits”

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Hadoop 3.5.0
- Apache Hadoop YARN
- YARN NodeManager and ResourceManager
- Hadoop MapReduce
- Linux process trees and cgroups v1/v2
- Java heap and native/off-heap memory

## Sources Consulted
- [Using Memory Control in YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCGroupsMemory.html)
- [Using Cgroups with YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCgroups.html)
- [YARN NodeManager](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [Hadoop Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/CommandsManual.html)
- [YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)
- [MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [Hadoop YARN NodeManager resource-calculator API](https://hadoop.apache.org/docs/current3/hadoop-yarn/hadoop-yarn-server/hadoop-yarn-server-nodemanager/apidocs/org/apache/hadoop/yarn/server/nodemanager/containermanager/linux/resources/package-summary.html)
- [Oracle Java launcher documentation](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [GNU Bash exit-status documentation](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)

## Issues Found
- The opening and conclusion described a container as an unconditional resource boundary accounted through a process tree. YARN also supports no-control mode, and cgroup calculators account the container cgroup rather than traversing a process tree. The text now describes the container as a resource allocation, qualifies the memory-control condition, and distinguishes polling process-tree accounting from cgroup accounting.
- Exit code `137` was presented as definitive proof of `SIGKILL`. Shells conventionally encode signal 9 as `128 + 9`, but a numeric status alone is not conclusive. The text now says it usually indicates that a shell or launcher reported `SIGKILL` while retaining the warning that the actor must be identified from logs.
- The cgroup v2 guidance implied that every cgroup v2 host must select a cgroup calculator. The text now limits that requirement to cgroup-based calculation and names the current cgroup v2 implementation, `CGroupsV2ResourceCalculator`.

## Review Notes
- The review used Apache Hadoop 3.5.0, the version served by the `current` documentation links on 2026-08-07. Older Hadoop releases and vendor distributions can have different cgroup v2 support and defaults, as the post already cautions.
- The YARN application/log commands, MapReduce `-D` example, XML property names, defaults, heap-ratio behavior, and strict/elastic enforcement prerequisites match the current official documentation. The MapReduce command still depends on the application consuming Hadoop generic options, which the post explicitly notes.
