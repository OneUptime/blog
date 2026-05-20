# Validation Summary: How to Deploy CrowdSec with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- CrowdSec Security Engine
- CrowdSec Helm chart
- CrowdSec cscli
- CrowdSec ingress-nginx Lua bouncer
- Argo CD Application manifests
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- Bitnami Sealed Secrets

## Sources Consulted
- CrowdSec Helm chart values and templates: https://github.com/crowdsecurity/helm-charts/tree/main/charts/crowdsec
- CrowdSec Helm chart on Artifact Hub: https://artifacthub.io/packages/helm/crowdsec/crowdsec
- CrowdSec ingress-nginx bouncer documentation: https://docs.crowdsec.net/u/bouncers/ingress-nginx/
- CrowdSec scenario format documentation: https://docs.crowdsec.net/docs/log_processor/scenarios/format/
- CrowdSec whitelist documentation: https://docs.crowdsec.net/docs/log_processor/whitelist/intro/
- CrowdSec IP/CIDR whitelist documentation: https://docs.crowdsec.net/docs/log_processor/whitelist/create_ip/
- CrowdSec console enrollment documentation: https://docs.crowdsec.net/u/getting_started/post_installation/console/
- CrowdSec cscli bouncers add documentation: https://doc.crowdsec.net/docs/cscli/cscli_bouncers_add
- CrowdSec Hub index for referenced collections and scenarios: https://cdn-hub.crowdsec.net/crowdsecurity/master/.index.json
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD automated sync retry documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/

## Issues Found
- The wrapper chart pinned CrowdSec chart version `0.12.0`, which is outdated. Updated it to `0.24.0`, the current chart version found in the official chart metadata.
- The CrowdSec values used `lapi.dashboard.enabled`, which is not a current chart value. Replaced it with the supported `lapi.metrics.serviceMonitor` configuration.
- The file-based SSH log acquisition was placed under `agent.acquisition`, which only accepts Kubernetes pod log selectors. Moved it to `agent.additionalAcquisition` with `source: file`.
- The Nginx bouncer example deployed `crowdsecurity/lua-bouncer-plugin` as a standalone Deployment with unsupported environment variable names. Replaced it with the supported ingress-nginx plugin pattern using the CrowdSec-maintained ingress controller image and `API_URL` / `API_KEY`.
- The repository layout referenced loose custom scenario and parser files that were not mounted by the Helm chart. Updated the scenario and whitelist examples to use the chart's `crowdsec.config.scenarios` and `crowdsec.config.parsers.s02-enrich` values.
- The high-rate 404 custom scenario filtered on `evt.Meta.log_type == 'nginx'`; the official CrowdSec scenario examples use HTTP service metadata. Updated the filter to `evt.Meta.service == 'http'`.
- The whitelist example put CIDR ranges under `whitelist.ip`. Updated them to `whitelist.cidr` and kept the expression whitelist as a parser-stage expression.
- The ServiceMonitor selector used `app: crowdsec-lapi`, but the official chart labels the LAPI service as `app: <release>-service`. Updated the selector to `app: crowdsec-service` and added a namespace selector.

## Review Notes
The Argo CD Application manifest, sync retry fields, `CreateNamespace=true`, `cscli bouncers add -o json`, SealedSecret shape, and referenced CrowdSec Hub collections/scenarios are technically valid. The Kubernetes API brute-force scenario assumes audit logs are collected and parsed into the shown metadata fields; the post still treats that as a custom scenario example rather than a complete audit-log pipeline.
