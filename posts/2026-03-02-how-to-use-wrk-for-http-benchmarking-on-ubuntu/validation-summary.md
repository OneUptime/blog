# Validation Summary: How to Use wrk for HTTP Benchmarking on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- wrk (HTTP benchmarking tool by Will Glozer)
- Lua scripting (wrk's scripting interface)
- Bash shell scripting
- Ubuntu package management (apt)

## Sources Consulted
- wrk GitHub repository: https://github.com/wg/wrk
- wrk SCRIPTING documentation: https://github.com/wg/wrk/blob/master/SCRIPTING
- wrk INSTALL documentation: https://github.com/wg/wrk/blob/master/INSTALL
- wrk source code (src/wrk.c, src/script.c) for verifying long options, summary fields, and connection distribution semantics

## Issues Found
No technical issues found.

Specifically verified:
- Build dependencies (`build-essential`, `libssl-dev`, `git`) match the official INSTALL doc.
- `git clone https://github.com/wg/wrk.git` is the correct upstream URL.
- All CLI flags (`-t`, `-c`, `-d`, `-s`, `-H`, `--latency`, `--timeout`, `--version`) are valid long/short option names per src/wrk.c.
- Connection distribution claim (`c/t` connections per thread) matches the implementation: `t->connections = cfg.connections / cfg.threads`.
- Lua API usage is correct: `wrk.method`, `wrk.headers`, `wrk.body`, `wrk.format(method, path, headers, body)` with nil defaults, `setup(thread)`, `thread:set/get`, `response(status, headers, body)`, `done(summary, latency, requests)`.
- `summary.errors` fields (`connect`, `read`, `write`, `status`, `timeout`) match the documented set.
- `summary.duration` is in microseconds (dividing by `1e6` for seconds is correct).
- `latency:percentile(n)` returns microseconds (dividing by `1000` for milliseconds is correct).
- The sample wrk output format matches real wrk output.
- `wrk.thread:get("token")` in the auth example is valid — `wrk.thread` is the thread userdata and `:get` is implemented in script.c; the more idiomatic approach is to read `token` as a global set by `thread:set`, but the post's form works.

## Review Notes
- The "Via snap (alternative)" code block contains only comments — it neither shows a working snap install nor a real alternative. It's harmless but adds no value to the reader. Not a technical error.
- The `read` builtin in the "Comparing Before and After" script could use `-r` (shellcheck SC2162), but this is style, not correctness.
- `libssl-dev` is listed and is correct per the official INSTALL doc; recent wrk versions still link system OpenSSL on Ubuntu.
- The post does not pin a specific wrk version; the upstream repo has been stable for years and the API/flags shown remain accurate as of the review date.
