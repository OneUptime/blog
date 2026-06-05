# Validation Summary: How to Export OpenTelemetry Data to Azure Monitor and Application Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Azure Monitor
- Application Insights
- Azure Monitor OpenTelemetry Distro for Python
- Azure Monitor OpenTelemetry Exporter for JavaScript/Node.js
- OpenTelemetry Collector Contrib
- OTLP
- Docker
- Flask
- KQL

## Sources Consulted
- Microsoft Learn: OpenTelemetry on Azure - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry
- Microsoft Learn: Enable Azure Monitor OpenTelemetry for .NET, Node.js, Python, and Java applications - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable
- Microsoft Learn: Configure automatic data collection and resource detectors for Azure Monitor OpenTelemetry - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-collect-detect
- Microsoft Learn: Azure Monitor OpenTelemetry Distro client library for Python - https://learn.microsoft.com/python/api/overview/azure/monitor-opentelemetry-readme
- Microsoft Learn: Azure Monitor OpenTelemetry Exporter client library for JavaScript - https://learn.microsoft.com/javascript/api/overview/azure/monitor-opentelemetry-exporter-readme
- OpenTelemetry JavaScript SDK Node README - https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry Collector Contrib azuremonitorexporter documentation - https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/azuremonitorexporter
- Microsoft Learn: Sampling in Azure Monitor Application Insights with OpenTelemetry - https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-sampling

## Issues Found
- The prerequisite listed Python 3.8+, but the current Azure Monitor OpenTelemetry Distro documentation requires Python 3.10 or later. Updated the prerequisite to Python 3.10+.
- The Python installation command installed only `azure-monitor-opentelemetry`, but the sample application imports Flask. Updated the command to install `flask` as well.
- The Flask sample did not load the earlier `configure_telemetry.py` module, so running `app.py` as shown would not configure Azure Monitor telemetry. Added an import before the Flask app is created.
- The Collector config comment described `maxbatchsize` as a concurrent connection limit, but the official exporter documentation defines it as the maximum number of telemetry items submitted in each request. Corrected the comment.
- The sampling pitfall stated that Azure Monitor applies adaptive sampling by default. Current OpenTelemetry guidance is language- and configuration-dependent, and ingestion sampling is separate. Reworded the note to advise checking SDK, distro, and Application Insights ingestion sampling settings.

## Review Notes
- The Azure Monitor Collector exporter is documented as beta for traces, metrics, and logs in the OpenTelemetry Collector Contrib distribution.
- The JavaScript Azure Monitor OpenTelemetry exporter documentation currently identifies the package as a beta release, even though the APIs used in the post are documented.
- For most application scenarios, Microsoft recommends the Azure Monitor OpenTelemetry Distro, but the direct exporter examples remain valid for applications that already manage their own OpenTelemetry SDK setup.
