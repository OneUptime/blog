# Validation Summary: How to Provision Dashboards as Code in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard provisioning
- Grafana dashboard JSON
- Grafana Helm chart dashboard sidecar
- Kubernetes ConfigMaps
- Grafonnet
- Jsonnet and jsonnet-bundler
- Terraform Grafana provider
- GitHub Actions
- Grafana Dashboard HTTP API

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana API structure documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/apis/
- Grafonnet simple dashboard example: https://grafana.github.io/grafonnet/examples/simple.html
- Grafonnet dashboard API reference: https://grafana.github.io/grafonnet/API/dashboard/index.html
- Grafonnet stat panel API reference: https://grafana.github.io/grafonnet/API/panel/stat/index.html
- Grafonnet time series panel API reference: https://grafana.github.io/grafonnet/API/panel/timeSeries/index.html
- Grafonnet Prometheus query API reference: https://grafana.github.io/grafonnet/API/query/prometheus.html
- Grafana Terraform dashboard guide: https://grafana.com/docs/grafana/latest/as-code/infrastructure-as-code/terraform/dashboards-github-action/
- Terraform Grafana provider documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard
- Grafana Helm chart values reference: https://artifacthub.io/packages/helm/grafana/grafana
- go-jsonnet releases: https://github.com/google/go-jsonnet/releases
- jsonnet-bundler documentation: https://github.com/jsonnet-bundler/jsonnet-bundler
- Jsonnet getting started documentation: https://jsonnet.org/learning/getting_started.html

## Issues Found
- The provisioning example set `folder` and `folderUid` while also enabling `foldersFromFilesStructure`. Grafana documentation says those options must be unset when using `foldersFromFilesStructure`, so they were removed from the provider snippet.
- The `disableDeletion` explanation incorrectly stated that dashboards cannot be deleted from the UI. It was updated to describe the documented behavior: Grafana does not delete provisioned dashboards when source files are removed.
- The `allowUiUpdates` explanation incorrectly implied UI edits are saved back to files. It was updated to clarify that UI edits are saved to Grafana's database, not the provisioning source files.
- The Kubernetes ConfigMap example used `...` inside JSON, which would not be valid JSON. It was replaced with a minimal valid dashboard JSON object.
- The Terraform provider constraint used `~> 2.0`, which is outdated for a current tutorial. It was updated to `~> 4.0`.
- The GitHub Actions workflow downloaded a non-existent go-jsonnet release archive path for v0.20.0. It was updated to the current v0.22.0 archive name and verified that the archive contains a top-level `jsonnet` binary.
- The deploy job attempted to generate dashboards without installing `jsonnet` or `jb` first. Matching install steps were added to the deploy job.
- The dashboard deploy `curl` command constructed JSON with shell interpolation. It was changed to use `jq --argfile` so the request body remains valid JSON for dashboard files with formatting or special characters.

## Review Notes
- The workflow still uses Grafana's legacy `/api/dashboards/db` endpoint. Grafana 13 deprecates legacy `/api` endpoints in favor of `/apis`, but the legacy endpoints remain available for now, so this is technically valid with a forward-looking caveat.
- The sample PromQL expressions assume common Kubernetes, node_exporter, and application metrics are present. They are syntactically plausible but depend on the reader's metric names and labels.
