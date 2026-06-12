# Validation Summary: How to Handle Configuration in Go Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go standard library configuration patterns
- Environment variables with `os.Getenv` and `os.ExpandEnv`
- Kelsey Hightower's `envconfig`
- Viper configuration library
- YAML with `gopkg.in/yaml.v3`
- JSON with `encoding/json`
- TOML with `github.com/BurntSushi/toml`
- Configuration validation with `github.com/go-playground/validator/v10`

## Sources Consulted
- Go `os` package documentation: https://pkg.go.dev/os
- Go `time.ParseDuration` documentation: https://pkg.go.dev/time#ParseDuration
- Go `encoding/json.Decoder.DisallowUnknownFields` documentation: https://pkg.go.dev/encoding/json#Decoder.DisallowUnknownFields
- `github.com/kelseyhightower/envconfig` documentation: https://pkg.go.dev/github.com/kelseyhightower/envconfig
- Viper documentation: https://pkg.go.dev/github.com/spf13/viper and https://github.com/spf13/viper
- `gopkg.in/yaml.v3` documentation and tests: https://pkg.go.dev/gopkg.in/yaml.v3 and https://github.com/go-yaml/yaml
- `github.com/BurntSushi/toml` documentation: https://pkg.go.dev/github.com/BurntSushi/toml
- `github.com/go-playground/validator/v10` documentation: https://pkg.go.dev/github.com/go-playground/validator/v10

## Issues Found
- The Viper environment variable replacer comment incorrectly showed `server.port -> SERVER_PORT` despite `SetEnvPrefix("APP")`. Updated it to `APP_SERVER_PORT`, and similarly corrected the hyphenated-key example.
- Some Viper-backed struct fields had no default values, which can prevent environment-only values from appearing during `Unmarshal`. Added empty defaults for optional string fields such as database name/user/password, cache password, and logging file path.
- The YAML loading section was labeled "Standard Library" even though Go does not include a YAML parser in the standard library and the example uses `gopkg.in/yaml.v3`. Renamed it to `yaml.v3`.
- The JSON example did not match the `JSONConfig` struct and would fail with `DisallowUnknownFields`. Replaced the JSON snippet with one that matches the strict decoder example.
- The TOML loader reused structs without TOML tags for snake_case keys such as `read_timeout` and `max_open_conns`. Added `toml` tags alongside the YAML tags.
- The multi-format Viper helper claimed support for `hcl` and `properties` but the switch statement only handled YAML, JSON, TOML, and env files. Updated the comment to match the actual implementation.
- The cache validation tags required `min`/`gt` checks even when the cache was disabled and omitted. Added `omitempty` to optional cache port and TTL validation.
- The complete example read `CONFIG_PATH` but did not pass it into the layered loader. Updated `ConfigLoader` to accept and use the configured path.

## Review Notes
The Viper, envconfig, validator, JSON, YAML, and TOML APIs used are current and non-deprecated based on the consulted documentation. Local compilation was not possible because the `go` binary is not installed in this environment, so validation was performed by static review against official documentation.
