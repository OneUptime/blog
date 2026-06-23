# Validation Summary: How to Benchmark Go Code with testing.B

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go `testing` package
- Go benchmark functions and `testing.B`
- Go test command benchmark flags
- `benchstat`
- GitHub Actions
- Shell scripting for benchmark comparison

## Sources Consulted
- Go `testing` package documentation: https://pkg.go.dev/testing
- Go command testing flags documentation: https://pkg.go.dev/cmd/go
- `benchstat` documentation: https://pkg.go.dev/golang.org/x/perf/cmd/benchstat
- GitHub Actions `actions/checkout` documentation: https://github.com/actions/checkout
- GitHub Actions `actions/setup-go` documentation: https://github.com/actions/setup-go
- GitHub Actions `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact
- `stefanzweifel/git-auto-commit-action` documentation: https://github.com/stefanzweifel/git-auto-commit-action

## Issues Found
- Several benchmark examples discarded function results directly. This conflicted with the post's later guidance about avoiding compiler optimization. I added package-level sink variables and assigned results after the benchmark loops in the string concatenation, sub-benchmark, linear search, and mock database query examples.
- The benchmark comparison shell script defaulted `BRANCH_NEW` to `HEAD` before checking out the old branch, but `HEAD` would resolve to the old branch after that checkout when no third argument was supplied. I changed the script to save the current branch before switching branches and default `BRANCH_NEW` to that saved branch.
- The benchstat explanation described `+/- X%` as variance. I corrected it to describe the confidence interval for the reported statistic.
- The benchstat explanation said a lower p-value is "better." I clarified that a lower p-value means stronger evidence that the observed difference is not noise.
- The best-practices wording said to always use `b.N`. I narrowed that to traditional benchmarks because current Go also supports `b.Loop`.

## Review Notes
- The examples use the traditional `for i := 0; i < b.N; i++` benchmark style, which remains valid. Current Go documentation also documents `b.Loop`, added in Go 1.24, as an alternative benchmark loop style.
- I could not compile the snippets locally because the `go` command is not installed in this environment.
