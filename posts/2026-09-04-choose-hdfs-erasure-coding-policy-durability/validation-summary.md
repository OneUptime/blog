# Validation Summary: How to Choose an HDFS Erasure Coding Policy with Replication-Equivalent Durability

## Status
validated

## Post Type
Technical guide with HDFS administrative commands and reliability equations.

## Technologies Covered
- Apache Hadoop 3.5.0 and HDFS
- Reed-Solomon and XOR erasure coding
- Replication, failure-domain placement, and durability modeling
- EC reconstruction and Intel ISA-L

## Sources Consulted
- [Hadoop 3.5.0 HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html): policies, defaults, topology guidance, recovery scheduling, native coders, EC commands, and operation limitations.
- [Hadoop 3.5.0 HDFS Commands Guide](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html): dfs, dfsadmin, and fsck syntax.
- [Hadoop 3.5.0 FileSystem Shell](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-common/FileSystemShell.html): mkdir and put syntax and behavior.
- [Hadoop 3.5.0 SystemErasureCodingPolicies source](https://raw.githubusercontent.com/apache/hadoop/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/protocol/SystemErasureCodingPolicies.java): built-in policies and cell size; retrieved directly after the browser could not render the GitHub source.
- [Hadoop 3.5.0 StripedReader source](https://raw.githubusercontent.com/apache/hadoop/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/datanode/erasurecode/StripedReader.java): minimum reconstruction sources and zero-filled positions in short groups.
- [USENIX FAST 2008: The RAID-6 Liberation Codes](https://www.usenix.org/legacy/events/fast08/tech/full_papers/plank/plank.pdf): inspected the original citation and identified its title mismatch.
- [USENIX FAST 2009: A Performance Evaluation and Examination of Open-Source Erasure Coding Libraries for Storage](https://www.usenix.org/legacy/event/fast09/tech/full_papers/plank/plank.pdf): correct reference for the named paper and erasure-code background.

## Issues Found
1. **Unavailability was labeled loss.** The equations used loss labels despite defining p as unavailability. Relabeled both outcomes and specified a common observation time and a full EC group. Independent outages occurring at different times in a window do not necessarily overlap, and temporary unavailability is not permanent loss. Also clarified that large-file exposure does not justify multiplying correlated group risks.
2. **Rack-count guidance overstated placement guarantees.** Clarified that the formula is a minimum based on average occupancy for single-rack tolerance; every actual rack must still contain no more than m internal blocks per group.
3. **Reconstruction fan-in omitted short groups.** Scoped k source reads to full groups and documented the known-zero exception confirmed by StripedReader.
4. **Native-library checking had ambiguous scope.** Clarified that checknative checks its local environment and must be run in each relevant client/DataNode environment.
5. **The pilot commands omitted setup prerequisites.** Added mkdir before setting the directory policy and stated that the candidate policy must be enabled and the local input file prepared.
6. **The USENIX citation linked to the wrong paper.** Replaced the FAST 2008 Liberation Codes URL with the FAST 2009 erasure-coding libraries paper URL.

## Review Notes
- Confirmed policy widths, full-stripe ratios, erasure tolerances, default policy, legacy Java codec, and the listed command flags. Recomputed storage ratios and rack minima directly.
- The binomial tail and p^r are mathematically correct under the revised independent, simultaneous-unavailability assumptions. They are not fleet durability forecasts.
- Hadoop's guide contains a contradictory example saying nine racks cannot support RS-10-4 rack tolerance. Its stated minimum-rack formula gives four; actual placement and overlapping failure domains remain decisive. The post appropriately avoids that example.
- Keeping mutable and hsync-dependent workloads replicated is conservative advice. Hadoop 3.5.0 supports append to closed striped files with NEW_BLOCK, but hsync/hflush do not provide persistence guarantees on striped streams.
- The current documentation URL resolved to Hadoop 3.5.0 at review time; current and trunk links are moving references. Release-tagged source was used to check version-specific implementation details.
- Review was based on documentation, source inspection, arithmetic, and shell syntax checks. No HDFS cluster was available for runtime validation, reconstruction benchmarks, fault injection, or SHA-256 verification. Recovery throughput and correlated failure probabilities remain deployment-specific.
