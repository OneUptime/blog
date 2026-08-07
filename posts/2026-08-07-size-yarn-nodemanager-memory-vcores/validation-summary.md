# Validation Summary: Size YARN NodeManager Memory and vCores Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Apache Hadoop YARN
- YARN NodeManager and ResourceManager
- Capacity Scheduler and Fair Scheduler
- Linux cgroups memory and CPU control
- Linux memory, CPU, and process inspection commands
- HDFS DataNode capacity planning

## Sources Consulted

- [Apache Hadoop 3.5.0 YARN default configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Apache Hadoop 3.5.0: Using Memory Control in YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCGroupsMemory.html)
- [Apache Hadoop 3.5.0: Using Cgroups with YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCgroups.html)
- [Apache Hadoop 3.5.0: NodeManager](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [Apache Hadoop 3.5.0: YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [Apache Hadoop 3.5.0: Capacity Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/CapacityScheduler.html)
- [Apache Hadoop 3.5.0: Fair Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/FairScheduler.html)
- [Apache Hadoop 3.5.0: YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [Apache Hadoop 3.5.0: Resource API](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-api/apidocs/org/apache/hadoop/yarn/api/records/Resource.html)
- [Linux `free(1)` manual page](https://man7.org/linux/man-pages/man1/free.1.html)
- [Linux `/proc/meminfo` manual page](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html)
- [Linux `lscpu(1)` manual page](https://man7.org/linux/man-pages/man1/lscpu.1.html)
- [Linux `ps(1)` manual page](https://man7.org/linux/man-pages/man1/ps.1.html)

## Issues Found

- The post stated that both CPU auto-detection properties affect automatic calculation when hardware detection is enabled and `cpu-vcores` is `-1`, but it omitted that `yarn.nodemanager.resource.count-logical-processors-as-cores` is documented as Linux-only. Added that platform qualifier so readers do not expect the switch to alter Windows detection.

## Review Notes

- The review used the current Apache Hadoop documentation, which resolves to Hadoop 3.5.0 as of the validation date. The `current` documentation alias and its defaults may change in a future Hadoop release.
- The NodeManager memory and vCore defaults, automatic hardware-detection conditions, system-reserved-memory formula, scheduler allocation defaults, cgroup prerequisites, resource-calculator behavior, and YARN node command syntax were confirmed against the cited Hadoop documentation.
- The XML fragments are valid `yarn-site.xml` property entries, the memory conversion is correct, and the Linux inventory commands use supported options.
