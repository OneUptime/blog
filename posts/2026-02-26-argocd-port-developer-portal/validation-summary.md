# Validation Summary: How to Integrate ArgoCD with Port (Developer Portal)

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Port developer portal
- Port Kubernetes exporter
- Port blueprints, self-service actions, and scorecards
- Argo CD Applications and sync API
- Kubernetes custom resources
- Helm
- Flask and Python requests

## Sources Consulted
- Port Kubernetes integration documentation: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/
- Port Kubernetes exporter advanced Helm configuration: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/advanced/
- Port custom CRD export documentation: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes/custom-crds
- Port API reference and regional API base URLs: https://docs.port.io/api-reference/port-api/
- Port self-service action JSON structure: https://docs.port.io/actions-and-automations/create-self-service-experiences/
- Port webhook backend documentation: https://docs.port.io/actions-and-automations/setup-backend/webhook/
- Port scorecard documentation: https://docs.port.io/scorecards/manage-scorecards/
- Port search comparison operators: https://docs.port.io/search-and-query/comparison-operators/
- Argo CD sync operation documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/sync-kubectl/
- Argo CD ApplicationSyncRequest API structure: https://pkg.go.dev/github.com/argoproj/argo-cd/pkg/apiclient/application

## Issues Found
- The Kubernetes exporter values used `configMap.config` as a YAML object. Port's Helm documentation shows declarative mapping under `configMap.config` as a block string, so the values snippets were updated to use `config: |`.
- The resync example used `resyncIntervalMinutes` inside the mapping config. Port documents the chart value as `resyncInterval`, so the example was changed to `resyncInterval: 1` at the values root.
- Port API examples used `https://api.getport.io`. Current Port API documentation lists `https://api.port.io` for EU accounts and `https://api.us.port.io` for US accounts, so examples were updated to `https://api.port.io`.
- The self-service action example used an outdated action shape with top-level `trigger: "DAY-2"` and top-level `userInputs`. Current Port action JSON requires a `trigger` object with `type`, `operation`, and `userInputs`, so the action JSON was corrected.
- The action creation endpoint was changed from the old blueprint-scoped action path to the current `POST /v1/actions` endpoint.
- The webhook handler expected a default Port webhook payload shape that was not defined in the action. The action now sends an explicit body, and the Flask handler reads that body and normalizes boolean inputs.
- The scorecard date rule used the numeric `>` operator against a date-time property. Port documents `between` for datetime ranges, so the rule now uses `between` with the `today` preset and its title was updated to match.
- The blueprint setup text did not mention that the `service` and `cluster` blueprints referenced by relations must already exist. A short prerequisite note was added.

## Review Notes
- Helm and kubectl were not installed in the local environment, so CLI behavior was verified against official documentation instead of local `--help` output.
- The examples use the EU Port API base URL. Users on Port's US region should use `https://api.us.port.io`.
