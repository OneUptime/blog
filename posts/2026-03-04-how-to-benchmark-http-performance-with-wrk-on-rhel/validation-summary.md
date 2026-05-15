# Validation Summary: How to Benchmark HTTP Performance with wrk on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- dnf
- wrk
- HTTP benchmarking
- LuaJIT scripting

## Sources Consulted
- wrk upstream README: https://github.com/wg/wrk
- wrk SCRIPTING documentation: https://raw.githubusercontent.com/wg/wrk/master/SCRIPTING
- wrk INSTALL documentation: https://raw.githubusercontent.com/wg/wrk/master/INSTALL
- Red Hat documentation for managing software with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat EPEL support article: https://access.redhat.com/solutions/3358

## Issues Found
- The sample output used `Requests: 3000000 Total: 30s`, which does not match wrk's actual output format. Updated it to the upstream-style `3000000 requests in 30.00s, 1.20GB read` format and included `Transfer/sec`.
- The interpretation guidance emphasized max latency and `+/- Stdev` for reliability analysis. Updated it to recommend using `--latency` for percentile inspection and watching max latency for outliers, matching wrk's latency reporting capabilities.

## Review Notes
The install and usage commands match wrk's documented command-line options. The Lua examples use wrk's documented global `wrk` table, `wrk.headers`, `wrk.body`, and `wrk.format()` APIs. The RHEL package claim is reasonable because EPEL is not part of Red Hat Enterprise Linux and is outside Red Hat's production support scope.
