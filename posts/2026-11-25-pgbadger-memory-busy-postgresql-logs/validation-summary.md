# Validation summary

Reviewed memory-pressure evidence separately from report retention and SQL fidelity. The article does not present file size or retained binary size as a RAM-sizing formula.

## Sources reviewed

- https://docs.kernel.org/admin-guide/cgroup-v2.html
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://raw.githubusercontent.com/darold/pgbadger/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://pgbadger.darold.net/documentation.html
- https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html

## Checks performed

Ran pgBadger13.3 under Perl5.34.1 on500 synthetic executions across100 table-specific shapes and five durations per shape. Read trusted generated binary structures locally. Defaults retained300 group samples; -s1 retained100; -s0 retained0, with500 executions and100 groups unchanged. Separate slowest-query examples remained under -s0. The -t1 case retained100 groups and300 samples while reducing the slowest list20to1.

Unique retained comments increased groups100to500. Truncating at100 characters removed the table distinction and collapsed the fixture to one group while keeping500 executions. All numeric outcomes were asserted. Executed the exact bounded-database HTML and incremental --no-week commands with fixture paths; the daily page existed with no weekly output directory. Shell snippets passed syntax checks.

The six-node/five-edge Mermaid diagram passed structural checks. The1280x720 social image was generated and visually inspected; all three title lines fit.

## Limits

No Linux cgroup or systemd resource control was executed, and no deliberate OOM was triggered. Resource inspection commands are source-verified only. These tests inspect retained data, not process peak RAM. Binary output size is not used as a memory benchmark. The synthetic workload does not establish production cardinality limits, disk requirements or memory sizing. Generated HTML was not visually inspected in a browser, and Mermaid was structurally checked only.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
