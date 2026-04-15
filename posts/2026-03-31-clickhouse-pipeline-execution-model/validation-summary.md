# Validation Summary: How ClickHouse Pipeline Execution Model Works

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (query pipeline execution model, processor framework, EXPLAIN PIPELINE)
- ClickHouse system tables (system.metrics, system.query_log, ProfileEvents)

## Sources Consulted
- [ClickHouse Architecture Overview](https://clickhouse.com/docs/development/architecture) — describes pull vs push QueryPipeline and processor model
- [EXPLAIN Statement docs](https://clickhouse.com/docs/sql-reference/statements/explain) — confirms EXPLAIN PIPELINE syntax
- [How ClickHouse executes a query in parallel](https://clickhouse.com/docs/optimize/query-parallelism) — thread pool and parallel reading details
- [system.processors_profile_log](https://clickhouse.com/docs/operations/system-tables/processors_profile_log) — processor names in pipeline output
- [ClickHouse IProcessor.h source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/IProcessor.h) — Status enum (NeedData, PortFull, Ready, Async, Finished, Unneeded, ExpandPipeline)
- [ClickHouse Port.h source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/Port.h) — confirms Chunk (not Block) as the data payload type
- [ClickHouse ProfileEvents.cpp source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp) — valid ProfileEvent names
- [ClickHouse Python Advanced Querying docs](https://clickhouse.com/docs/integrations/language-clients/python/advanced-querying) — confirms max_block_size default of 65,536

## Issues Found

1. **Execution model incorrectly described as "push model"**: The post stated ClickHouse uses a "push model where processors push blocks of data into output ports as fast as they can." ClickHouse actually uses a reactive state-machine model where each processor declares its status via a `prepare()` method and a `PipelineExecutor` drives scheduling. Fixed to describe the reactive model with processor statuses.

2. **Data unit incorrectly called `Block`**: The post said data flows as `Block` objects. In ClickHouse's modern processor pipeline, data flows as `Chunk` objects. `Block` serves as the schema/header (column names and types) for a port, while `Chunk` carries the actual data payload. Fixed to use `Chunk` and explain the distinction.

3. **Default chunk size wrong (8192 vs 65,536)**: The post stated "typically 8192 rows." The actual default `max_block_size` is 65,536 rows. The value 8192 is the default MergeTree `index_granularity`, not the block/chunk size used in query processing. Fixed to 65,536 with a reference to `max_block_size`.

4. **`OutputFormatProcessor` is not a real processor name**: No such class exists in ClickHouse. The correct base class is `IOutputFormat`, with concrete implementations like `LazyOutputFormat`. Fixed to `IOutputFormat`.

5. **`UnionTransform` is not a real processor name**: ClickHouse uses `Resize` for unordered merging of multiple streams into one (or `ConcatProcessor` for ordered/sequential). Fixed to `Resize`.

6. **`MergeTreeDataSelectReadRows` is not a valid ProfileEvent**: This event does not exist. The correct ProfileEvent for rows read during selection is `SelectedRows`. Fixed in the code example.

7. **Scheduling model incorrectly described as "sleep until push"**: The post stated "a processor sleeps until its upstream processor pushes a block," implying a thread-per-processor blocking model. ClickHouse processors do not block or sleep — the `PipelineExecutor` calls `prepare()` on each processor and schedules `work()` based on declared statuses. Fixed to describe the actual reactive scheduling mechanism.

## Review Notes
- The `MergeTreeThread` processor name is slightly outdated — modern ClickHouse EXPLAIN PIPELINE output shows names like `MergeTreeSelect(pool: PrefetchedReadPool, algorithm: Thread)`. Left as-is since `MergeTreeThread` is still recognizable and commonly referenced.
- The post could benefit from mentioning `system.processors_profile_log` which provides per-processor timing data (elapsed_us, input/output rows/bytes), which is more directly useful for debugging pipeline execution than ProfileEvents on query_log.
