# Validation Summary: How to Build Mapping Data Flows in Azure Data Factory for ETL Transformations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Factory
- Mapping data flows
- Azure Integration Runtime
- Apache Spark
- Azure Data Lake Storage Gen2
- Azure Blob Storage
- Azure Synapse Analytics PolyBase staging
- Data flow expression language

## Sources Consulted
- Microsoft Learn: Mapping data flows in Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-overview
- Microsoft Learn: Mapping data flow debug mode - https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-debug-mode
- Microsoft Learn: Data Flow activity - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-execute-data-flow-activity
- Microsoft Learn: Source transformation in mapping data flows - https://learn.microsoft.com/en-us/azure/data-factory/data-flow-source
- Microsoft Learn: Join transformation in mapping data flow - https://learn.microsoft.com/en-us/azure/data-factory/data-flow-join
- Microsoft Learn: Aggregate functions in mapping data flows - https://learn.microsoft.com/en-us/azure/data-factory/data-flow-aggregate-functions
- Microsoft Learn: Data transformation expression usage in mapping data flows - https://learn.microsoft.com/en-us/azure/data-factory/data-flow-expressions-usage
- Microsoft Learn: Sink performance and best practices in mapping data flow - https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-performance-sinks

## Issues Found
- The debug setup step said to choose a 4-core cluster. Microsoft documentation currently describes AutoResolve Azure Integration Runtime debug behavior as using a default 60-minute TTL, and data flow activity compute core counts for AutoResolve start at 8. I changed the instruction to select the integration runtime and TTL instead of prescribing 4 cores.
- The data flow expression examples included `//` comments inside snippets that the reader was told to enter into the expression builder. I removed those inline comments so the examples are not presented as copy-paste expressions containing unsupported comment syntax.
- The pipeline activity snippet was labeled as JSON but contained comments, which makes it invalid JSON. I removed the comments from the snippet while preserving the same activity structure.
- The post described the staging linked service as generally used for intermediate data during certain operations. Microsoft documentation states that the `staging` block is required for Azure Synapse Analytics sources or sinks that use PolyBase staging. I narrowed the explanation and noted that file-to-file lake scenarios can omit it.
- The sink configuration mixed file naming and partitioning guidance under the Settings tab. Microsoft documentation treats file name options as sink settings and partitioning as an Optimize tab setting, so I separated those instructions and clarified that "Output to single file" is appropriate only for small outputs.

## Review Notes
The main ADF concepts, mapping data flow transformation sequence, join behavior, aggregate functions, debug/data preview workflow, and performance guidance are consistent with current Microsoft documentation. Microsoft Learn now recommends considering Data Factory in Microsoft Fabric for new data integration work, but Azure Data Factory mapping data flows remain documented and technically valid.
