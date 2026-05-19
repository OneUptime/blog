# Validation Summary: How to Set Up Doppler for Secret Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Doppler (cloud secret management platform)
- Doppler CLI (`doppler` command)
- Ubuntu / Debian apt packaging (GPG signed-by repos)
- systemd service units (`Environment`, `EnvironmentFile`, `ExecStart`)
- Docker / Docker Compose
- GitHub Actions (`dopplerhq/cli-action`)
- AWS Parameter Store / Secrets Manager, GCP Secret Manager, Azure Key Vault (as Doppler sync targets)

## Sources Consulted
- Doppler "Install CLI" docs: https://docs.doppler.com/docs/install-cli
- Doppler CLI guide: https://docs.doppler.com/docs/cli
- Doppler service tokens / scoping docs (token usage patterns)
- Doppler environment-based configuration: https://docs.doppler.com/docs/environment-based-configuration
- Doppler AWS Parameter Store integration: https://docs.doppler.com/docs/aws-parameter-store
- DopplerHQ/cli GitHub repository source (`pkg/cmd/run.go`, `pkg/cmd/secrets.go`, `pkg/cmd/configs_logs.go`, `pkg/cmd/activity.go`, directory listing of `pkg/cmd/`): https://github.com/DopplerHQ/cli
- DopplerHQ/cli-action GitHub Action repository: https://github.com/dopplerhq/cli-action

## Issues Found
1. **`doppler secrets` output description was wrong.** The post claimed `doppler secrets` lists "all secret names (not values)" and that `--json` was required to "Show secret values". In reality, the bare `doppler secrets` command prints both names and values in a table; the `--only-names` flag is what suppresses values. Updated the snippet and comments to show `doppler secrets` (names + values), `doppler secrets --only-names`, and `doppler secrets --json`.

2. **Invalid `--token-file` flag and `DOPPLER_TOKEN_FILE` environment variable in the systemd section.** Neither exists in the Doppler CLI — `pkg/cmd/run.go` registers no `--token-file` flag, and the official environment variable reference lists only `DOPPLER_TOKEN`. Rewrote the systemd example to load `DOPPLER_TOKEN` from a protected file via systemd's `EnvironmentFile=` directive (a standard, documented systemd pattern) and removed the bogus `--token-file` from `ExecStart`.

3. **`doppler secrets history DATABASE_URL` does not exist.** `pkg/cmd/secrets.go` defines only `get`, `set`, `upload`, `delete`, `download`, and `substitute` subcommands. Config-level audit history lives under `doppler configs logs` (with `get` and `rollback` subcommands). Replaced the example accordingly and kept the dashboard-rollback note.

4. **`.doppler.yaml` location was wrong.** The post said setup is saved to `.doppler.yaml` in the current/parent directory. The CLI actually stores all scoped configurations centrally in `~/.doppler/.doppler.yaml` and resolves the active scope by walking up the directory tree. Updated the explanation.

5. **`doppler setup-integrations` command does not exist.** No such command is registered in the CLI (the `pkg/cmd/` directory contains no `integrations`, `setup-integrations`, or `syncs` file), and the Doppler integration docs are explicit that integrations like AWS Parameter Store are configured from the dashboard. Replaced the fabricated CLI snippet with the actual dashboard-based setup steps.

6. **Outdated GitHub Action version.** The post referenced `dopplerhq/cli-action@v3`. The action's latest major version is `v4`. Bumped the example to `@v4`.

## Review Notes
- The apt install instructions (GPG key fingerprint `DE2A7741A397C129`, signed-by keyring path, `any-version main` component) match the current official quick-install snippet.
- `doppler secrets set NAME VALUE` and `doppler secrets set KEY1=VAL1 KEY2=VAL2` are both valid forms per the CLI source — left as-is.
- `doppler configs tokens create <name> --project <p> --config <c>` is valid; flag ordering around the positional name does not matter for Cobra-based CLIs.
- `doppler secrets download --no-file --format env` is correct; `--no-file` prints to stdout rather than writing the default `doppler.env` file.
- `doppler run --token $DOPPLER_TOKEN -- ./deploy.sh` is redundant since the action and `DOPPLER_TOKEN` already authenticate the CLI, but it is not technically incorrect, so left untouched.
- The "Automatic Secret Rotation" section describes integrations broadly and is dashboard-driven; kept as-is. Note that "automatic rotation" is a feature of the destination provider (e.g. AWS Secrets Manager) rather than something Doppler performs unilaterally — a future revision could clarify this nuance.
