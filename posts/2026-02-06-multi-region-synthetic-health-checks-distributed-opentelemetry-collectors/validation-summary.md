# Validation Summary: How to Set Up Multi-Region Synthetic Health Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `http_check` receiver
- OpenTelemetry Collector processors and OTLP exporter
- Terraform
- AWS ECS Fargate and AWS CLI
- Prometheus and PromQL alerting

## Sources Consulted
- OpenTelemetry Collector `http_check` receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/README.md
- OpenTelemetry Collector `http_check` receiver metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector Contrib v0.96.0 `httpcheck` receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/receiver/httpcheckreceiver/README.md
- OpenTelemetry attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- AWS CLI `ecs update-service` command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecs/update-service.html
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform module block syntax documentation: https://developer.hashicorp.com/terraform/language/modules/syntax
- Prometheus data model documentation: https://prometheus.io/docs/concepts/data_model/
- Prometheus guide for using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The post used the older `httpcheck` receiver name. Current OpenTelemetry Collector Contrib documentation says the receiver was renamed to `http_check`, with `httpcheck` retained as a deprecated alias. Updated the receiver name and pipeline reference to `http_check`.
- The post described `httpcheck.status` as a single 1-for-up, 0-for-down metric. The receiver emits `httpcheck.status` per HTTP status class, with 1 when the response matches that class and 0 otherwise. Updated the metric description and PromQL/alert examples to filter `http_status_class="2xx"`.
- The deployment script generated a substituted config file with `sed` but did not pass that generated file into ECS, so it would not actually update the collector configuration. Updated the post to use OpenTelemetry Collector environment variable substitution and kept the ECS command as a force deployment after the service/task definition has been updated.
- The collector image was pinned to `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated and predates the current receiver naming convention. Updated the example to `0.153.0`, the latest OpenTelemetry Collector Contrib release available during review.
- The text said `httpcheck.error` is a count of failed checks. The official metric documentation describes it as recording errors that occur during checks, so the wording was corrected.

## Review Notes
The Terraform module shown is illustrative and assumes the local `./modules/ecs-collector` module exposes inputs such as `config_template`, `environment`, `cpu`, `memory`, and `subnet_ids`. Those inputs are not standard Terraform language features, so the module implementation still needs to define them.
