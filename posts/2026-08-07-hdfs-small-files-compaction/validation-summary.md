# Validation Summary: Solve the HDFS Small-Files Problem

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS NameNode and FSNamesystem metrics
- Hadoop MapReduce and input splits
- `CombineFileInputFormat`
- Hadoop Archives (HAR)
- HDFS Offline Image Viewer
- Hadoop `SequenceFile` and `MapFile`

## Sources Consulted

- [HDFS Users Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html)
- [HDFS Architecture](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Hadoop File System Shell Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html)
- [Apache Hadoop Metrics](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Metrics.html)
- [MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [`FileInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/FileInputFormat.html)
- [`CombineFileInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/CombineFileInputFormat.html)
- [Hadoop Archives Guide](https://hadoop.apache.org/docs/current/hadoop-archives/HadoopArchives.html)
- [Offline Image Viewer Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsImageViewer.html)
- [`SequenceFile` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/SequenceFile.html)
- [`MapFile` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/MapFile.html)
- [Hadoop FileSystem API definition](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/filesystem/index.html)

## Issues Found

- The post stated unconditionally that `CombineFileInputFormat` prefers node-local blocks before rack-local blocks. The current API documentation makes that behavior conditional on configuring a maximum split size; without one, it combines at rack scope and does not attempt node-local splits. The explanation was corrected to describe both cases.
- The post stated that a single multi-terabyte file can reduce parallelism and make retries expensive without accounting for splittable input formats. Large splittable files can still produce many input splits. The statement was narrowed to nonsplittable formats, where a whole file can be assigned to one map task.

## Review Notes

The post was reviewed against the current Apache Hadoop 3.5.0 documentation. The `hdfs dfs -count`, `hdfs oiv`, `hadoop archive`, and HAR listing commands use current, documented syntax. The post does not target an older Hadoop release, and no deprecated APIs or options were found.
