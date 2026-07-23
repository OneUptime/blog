# How to Read a SQL Server Execution Plan and Find the Actual Bottleneck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Execution Plan, Query Optimizer, Performance Tuning, Query Store

Description: Read SQL Server execution plans systematically by following runtime evidence, row-flow errors, warnings, and supporting I/O measurements.

---

An execution plan is the optimizer's chosen operator tree, not a heat map that identifies the fix automatically. The largest displayed cost percentage is based on optimizer estimates, and a visually prominent scan is not necessarily slow. A reliable reading starts with the query's observed problem and follows actual runtime evidence to the earliest important mismatch.

## Capture the Right Kind of Plan

An **estimated plan** is produced without running the statement. It is appropriate when execution is unsafe or too expensive, but it cannot contain actual rows or runtime warnings created during execution.

An **actual plan** is returned after the batch executes and adds runtime information to the same compiled plan. In SSMS, use *Include Actual Execution Plan* only in a controlled test or when its collection overhead and exposure of literals and object names are acceptable. You can also request XML in a test session:

```sql
SET STATISTICS XML ON;
GO

EXEC Sales.usp_GetOrders @CustomerId = 41792;
GO

SET STATISTICS XML OFF;
GO
```

Prefer a plan captured from the slow execution context. A fast SSMS execution with different parameters or `SET` options may use a different cached plan. Query Store can supply historical plans and aggregated runtime statistics when the bad plan is no longer active.

Collect supporting measurements in the same controlled session:

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

EXEC Sales.usp_GetOrders @CustomerId = 41792;

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
```

These results provide per-table reads plus parse, compile, and execution CPU/time. Plans do not by themselves explain every delay: blocking, storage latency, client consumption, and memory or worker pressure require wait and system evidence too.

## Start at the Statement, Not an Operator

Check the plan and statement properties first:

- query text, database, compatibility level, and cardinality-estimation model;
- optimization level and any early-abort reason;
- cached-plan size and compile time;
- parameter list, compiled values, and runtime values where captured;
- requested, granted, used, and ideal memory where available;
- degree of parallelism and relevant warnings.

Confirm that the plan belongs to the problematic execution. Then compare total elapsed time, CPU, logical reads, writes, rows returned, and waits with the service objective. A query that returns ten million rows may be doing exactly what its text requests.

## Follow Data Flow and the Pull Model

In a graphical plan, data generally appears to flow from right to left toward the root. At runtime, operators are pull-based: a parent asks its child for rows, down to a leaf that reads or produces them. This matters because an operator under `TOP` may stop early; its presence does not mean every possible row was processed.

For a complex plan:

1. locate the statement or branch responsible for most measured work;
2. start at the root of that branch and follow the rows backward;
3. inspect actual and estimated rows on each operator;
4. stop at the **first** large, consequential divergence;
5. inspect that operator's predicates, object, statistics, and inputs.

A one-row estimate that actually produces 500,000 rows can make every downstream join and memory decision inappropriate. Fixing the later hash spill without correcting that early estimate may only treat the symptom.

## Interpret Common Operators in Context

### Seeks and Scans

An index seek can still read many rows, especially when it has a broad seek predicate plus a selective residual predicate. Inspect *Number of Rows Read* versus rows returned where available. A scan may be the correct low-cost choice for a small table or a request that needs most rows.

### Key Lookups

A lookup is efficient for a few qualifying rows. Under a nested loops join, hundreds of thousands of repeated lookups can dominate reads. Consider whether the query needs every selected column, whether a carefully sized covering index helps the workload, or whether a different access strategy is appropriate.

### Nested Loops, Hash Match, and Merge Join

Do not rank join algorithms as good or bad. Nested loops often suits a small outer input with indexed probes. Hash join often suits larger unsorted inputs but needs an appropriate memory grant. Merge join benefits from sorted inputs. The row estimates and available indexes explain why the optimizer chose one.

### Sorts and Spools

A sort may support `ORDER BY`, a merge join, aggregation, or windowing. A spool materializes rows in `tempdb` for reuse or correctness. Inspect why it exists and how many times it is rewound or rebound; for a sort, also check whether it spills. Deleting an operator is not itself a tuning objective.

### Parallelism Operators

Parallel branches add exchanges that distribute, repartition, or gather rows. Skew can leave one worker with most of the data. Compare elapsed time with CPU and inspect per-thread rows when available before deciding that parallelism is the cause.

## Treat Warnings as Leads

Useful warning categories include:

- **spill to TempDB:** a sort or hash needed more memory than granted;
- **implicit conversion:** differing data types may affect estimates or index access;
- **missing statistics or no join predicate:** the optimizer lacked useful information or a join may be accidental;
- **excessive grant:** reserved memory greatly exceeded observed use;
- **unmatched indexes or plan-affecting conversion:** plan reuse or predicate processing deserves inspection.

A warning is not automatically the bottleneck. Correlate it with duration, reads, wait types, frequency, and concurrency. One small spill in a monthly report has a different priority from a moderate spill executing thousands of times per minute.

## Do Not Trust Cost Percentages as Runtime Percentages

Graphical percentages are derived from optimizer cost estimates within that compiled plan. They are neither elapsed-time measurements nor a comparison with alternative plans the optimizer did not choose. Estimate errors can make the percentages especially misleading.

Instead, rank candidate work using:

- actual rows and executions per operator;
- rows read versus rows returned;
- runtime CPU and elapsed metrics where present;
- `STATISTICS IO` logical reads by object;
- spills, memory use, and wait evidence;
- Query Store execution count and total resource contribution.

## Turn Evidence into a Testable Change

Map the first important problem to a specific hypothesis:

| Evidence | Hypothesis to test |
| --- | --- |
| estimate far below actual | stale/insufficient statistics, skew, correlation, or non-searchable predicate |
| many rows read, few returned | residual predicate or unsuitable key order |
| repeated expensive lookup | selected columns or index coverage do not fit the high row count |
| sort/hash spill | bad estimate or insufficient grant; possibly excessive input rows |
| plan changes by parameter | parameter-sensitive workload |
| low server execution, high client duration | network or client consumption rather than operator cost |

Change one thing at a time in a production-like environment. Compare results for typical and edge-case parameter values, writes as well as reads, and single-user as well as concurrent load. Save the before and after plans, measurements, SQL Server build, compatibility level, and rollback command.

The best plan review does not end with “the scan is gone.” It ends with lower resource use or latency for the full workload, without a correctness change or an unacceptable regression elsewhere.

## Official Documentation

- [Execution plans](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans?view=sql-server-ver17)
- [Analyze an actual execution plan](https://learn.microsoft.com/en-us/sql/relational-databases/performance/analyze-an-actual-execution-plan?view=sql-server-ver17)
- [Logical and physical Showplan operator reference](https://learn.microsoft.com/en-us/sql/relational-databases/showplan-logical-and-physical-operators-reference?view=sql-server-ver17)
- [SET STATISTICS IO](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-io-transact-sql?view=sql-server-ver17)
- [SET STATISTICS TIME](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-time-transact-sql?view=sql-server-ver17)
