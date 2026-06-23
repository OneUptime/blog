# Validation Summary: How to Benchmark gRPC Services with ghz

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ghz (gRPC benchmarking / load testing CLI)
- gRPC
- Protocol Buffers / protoc
- gRPC reflection & grpcurl
- Docker
- Go (`go install`)
- Python (results analysis scripts)
- GitHub Actions, Jenkins, GitLab CI (CI/CD integration)
- InfluxDB / Grafana output, `hey` (REST comparison)

## Sources Consulted
- ghz documentation — Call Data / template variables: https://ghz.sh/docs/calldata
- ghz documentation — Options: https://ghz.sh/docs/options
- ghz source — CLI flag definitions (`cmd/ghz/main.go`): https://github.com/bojand/ghz/blob/master/cmd/ghz/main.go
- ghz source — config struct & JSON tags (`runner/config.go`): https://github.com/bojand/ghz/blob/master/runner/config.go
- ghz GitHub repository / releases: https://github.com/bojand/ghz

## Issues Found
1. **Incorrect rate-limit flag `--qps`.** ghz uses `--rps` (`-r`) for the requests-per-second rate limit; there is no `--qps` flag. Fixed all CLI occurrences: the parameters mermaid diagram (`--qps` → `--rps`), the Key Parameters table row (relabeled to "Requests per second rate limit", `--rps 100`), Scenario 2 (`--rps 500`), and Scenario 3's ghz invocation (`--rps $QPS`). The shell loop variable `QPS` and the output filenames (`results_${QPS}qps.json`) were left unchanged since they are just labels, not flags.
2. **Incorrect template variable `{{.FullyQualifiedMethod}}`.** The correct ghz call-data field is `FullyQualifiedName`. Fixed to `{{.FullyQualifiedName}}`.
3. **Incorrect config-file key `"dial-timeout"`.** The ghz config JSON key for the connection dial timeout is `"connect-timeout"` (the `DialTimeout` field is tagged `json:"connect-timeout"`). Fixed to `"connect-timeout": "10s"`.

## Review Notes
- Verified that all other CLI flags used are valid and current: `--insecure`, `--proto`, `--call`, `--data`, `--data-file`, `--binary-file`, `--total`, `--concurrency`, `--duration`, `--connections`, `--timeout`, `--connections`, `--stream-call-count`, `--metadata`, `--format`, `--output`, `--tags`, `--config`, `--keepalive`, `--cacert`, `--cert`, `--key`.
- Verified the JSON output fields referenced in the Python/Groovy/JS analysis scripts (`count`, `total`, `average`, `fastest`, `slowest`, `rps`, `latencyDistribution` with `percentage`/`latency`, `statusCodeDistribution`, `errorDistribution`) match ghz's actual JSON output schema.
- Verified supported `--format` values: `json`, `csv`, `html`, `pretty`, `influx-summary`, `influx-details`, `prometheus`. The post uses `json`, `csv`, `html`, and `influx-summary`, all valid.
- Verified the remaining template variables (`RequestNumber`, `MethodName`, `ServiceName`, `InputName`, `OutputName`, `IsClientStreaming`, `IsServerStreaming`, `Timestamp`, `TimestampUnix`, `TimestampUnixMilli`, `TimestampUnixNano`, `UUID`) are all correct.
- Installation details (Linux release asset `ghz-linux-x86_64.tar.gz`, Docker image `bojand/ghz`, `go install github.com/bojand/ghz/cmd/ghz@latest`, version v0.120.0) are accurate.
- The InfluxDB tag example, warm-up pattern, and CI/CD examples are conceptually sound; the GitHub Actions example references `actions/checkout@v3` and `actions/github-script@v6` which still work but newer major versions (v4/v7) exist — not a correctness error, just a future freshness note.
