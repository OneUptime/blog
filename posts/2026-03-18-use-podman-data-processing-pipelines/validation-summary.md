# Validation Summary: How to Use Podman for Data Processing Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Compose / Compose Specification
- Python
- pandas
- requests
- SQLAlchemy
- PostgreSQL
- Bash

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman compose wrapper documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order reference: https://docs.docker.com/compose/how-tos/startup-order/
- pandas `DataFrame.dropna()` reference: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.dropna.html
- pandas `Series.str.strip()` reference: https://pandas.pydata.org/docs/reference/api/pandas.Series.str.strip.html
- pandas `json_normalize()` reference: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.json_normalize.html
- pandas `DataFrame.to_sql()` reference: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.to_sql.html
- SQLAlchemy engine configuration reference: https://docs.sqlalchemy.org/en/20/core/engines.html
- GNU Bash manual (`wait` builtin): https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The post said the example pipeline was processing CSV data, but the example actually extracts JSON from an API and transforms it into CSV later. I corrected the wording to match the implementation.
- `extract.py` wrote output files into `OUTPUT_DIR` without ensuring the directory existed. I added `os.makedirs(output_dir, exist_ok=True)` so the example works with both bind mounts and the shared Compose volume layout.
- `extract.py` called `response.json()` multiple times. I cached the parsed payload once and reused it to avoid repeated parsing and keep the example consistent.
- `transform.py` used `pd.DataFrame(data)`, which is unreliable for top-level JSON objects and does not normalize nested JSON records. I changed it to `pd.json_normalize(data)` to match current pandas guidance for semi-structured JSON.
- `transform.py` passed a float to `DataFrame.dropna(thresh=...)`, but pandas documents `thresh` as an integer. I replaced it with an integer threshold that still reflects the intended "at least half the columns" rule.
- `transform.py` used `Series.str.strip()` across object columns. Current pandas docs note that non-string values in those columns are replaced with `NaN`, which can silently corrupt mixed-type data. I replaced it with a type-checked strip operation.
- The Compose example used the obsolete top-level `version` field. I removed it to align the file with the current Compose specification.
- The Compose example invoked `podman-compose` directly. Podman's documented interface is `podman compose`, which delegates to an external provider. I updated the text and command accordingly.
- The Compose example only waited for `transform` and could start `load` before PostgreSQL was ready. I added a PostgreSQL healthcheck and a `depends_on` condition of `service_healthy` for `load`.
- The branching example mounted the same extracted directory into two parallel containers with `:Z`. Podman documents `:z` for content shared by multiple containers, so I changed those parallel input mounts to `:ro,z`.
- The branching example used `wait $PID_A $PID_B`, but Bash returns the status of the last ID waited for, which can mask a failure in the other branch. I changed it to wait for each PID explicitly and fail if either branch fails.
- The checkpoint example did not create `$WORK_DIR` before using it as a bind-mount source and checkpoint location. Podman documents that bind-mount sources must already exist, so I added `mkdir -p "$WORK_DIR"`.

## Review Notes
- `podman compose` is a thin wrapper around an external compose provider, so exact feature and flag behavior ultimately depends on the installed provider.
- Podman documents that resource flags such as `--memory` and `--cpus` have limitations on some rootless cgroups v1 environments. The commands are valid, but behavior can depend on host configuration.
- Podman was not installed in the local review environment, so CLI validation was performed against official documentation rather than local `podman --help` output.
