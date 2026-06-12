# Validation Summary: How to Implement Grafana Dashboard Templates

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Grafana dashboards and variables
- Grafana dashboard provisioning
- Grafana dashboard HTTP API
- Prometheus and PromQL
- Jsonnet and go-jsonnet
- Grafonnet / grafonnet-lib
- jsonnet-bundler
- GitHub Actions
- Python requests
- Docker Compose

## Sources Consulted
- Grafana variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana add variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana new API structure documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/apis/
- Current Grafonnet repository and README: https://github.com/grafana/grafonnet
- Legacy grafonnet-lib repository and README: https://github.com/grafana/grafonnet-lib
- Jsonnet getting started documentation: https://jsonnet.org/learning/getting_started.html
- Jsonnet tooling documentation: https://jsonnet.org/learning/tools.html
- go-jsonnet releases: https://github.com/google/go-jsonnet/releases
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- PromQL examples used single quotes in illustrative label matchers. Prometheus label values require double-quoted strings, so the examples now use double quotes.
- Examples enabled multi-value/all Grafana variables but used exact-match Prometheus selectors for `$service`. Updated those selectors to regex matchers with `=~` so multi-value and `allValue: ".*"` work correctly.
- The dashboard provisioning example combined `folder`/`folderUid` with `foldersFromFilesStructure`. Grafana requires `folder` and `folderUid` to be unset when `foldersFromFilesStructure` is used, so those fields were removed.
- The Grafonnet section described the legacy `grafonnet-lib` examples as the current official library. Updated the wording to clarify that the examples use deprecated but still available `grafonnet-lib`, and that generated `grafonnet` is the successor.
- The direct clone path for `grafonnet-lib` did not match the import path used by the examples. Changed it to `vendor/grafonnet`.
- The Makefile posted raw dashboard JSON directly to `/api/dashboards/db`, but that endpoint expects a payload containing a `dashboard` object and `overwrite` flag. Added a `jq` wrapper to build the correct payload.
- The Python tenant generator used a shallow `dict.copy()`, which could mutate nested variable state shared with the template. Changed it to `deepcopy()`.
- The Python tenant generator comment said it created a folder, but the code only used a folder UID. Updated the comment to say the folder must already exist.
- The performance Jsonnet snippet called `template.new` without the required `datasource` argument for `grafonnet-lib`. Added `datasource='$datasource'`.
- The GitHub Actions example used a non-existent go-jsonnet tarball asset URL and `jsonnet --lint`. Updated it to install current go-jsonnet `.deb` packages and run the documented `jsonnet-lint` command.
- Removed unused Jsonnet local variables so the examples pass `jsonnet-lint`.

## Review Notes
The Jsonnet examples were validated against the legacy `grafonnet-lib` API because that is the API imported by the post. Standalone Jsonnet snippets were linted/evaluated with go-jsonnet v0.22.0 where practical, JSON snippets were parsed with `jq`, Python snippets were compiled with `py_compile`, and the Makefile was checked with `make -n`.
