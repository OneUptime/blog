# Validation Summary: How to Set Up Custom Alerts in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Operator `PrometheusRule`
- Prometheus
- Alertmanager
- PromQL

## Sources Consulted
- Rancher docs, "Configuring PrometheusRules": https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Rancher docs, "How Monitoring Works": https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher docs, "Built-in Dashboards": https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Rancher monitoring chart values (official chart source): https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/105.1.0%2Bup61.3.2/values.yaml
- Rancher monitoring chart Prometheus template: https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/105.1.0%2Bup61.3.2/templates/prometheus/prometheus.yaml
- Rancher monitoring chart Alertmanager service template: https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/105.1.0%2Bup61.3.2/templates/alertmanager/service.yaml

## Issues Found
- The inhibition example was ambiguous as written: the nested `alertmanager.config` structure is a `rancher-monitoring` chart values path, not the top level of a standalone Alertmanager config file. I clarified that context, quoted the matcher strings to match the official chart format, and aligned the prose with the actual inhibition behavior shown by `equal: [namespace, alertname]`.
- The verification command only listed `PrometheusRule` objects in `cattle-monitoring-system`, even though the post earlier says rules may be created in a different namespace. I changed the command to `kubectl get prometheusrules -A` and clarified that this step checks where the rule exists before verifying pickup in the Prometheus UI.

## Review Notes
- The Alertmanager port-forward command assumes the default Rancher monitoring release name, which produces the service `svc/rancher-monitoring-alertmanager` in `cattle-monitoring-system`.
- The reviewed Rancher monitoring chart version defaults `ruleSelector` and `ruleNamespaceSelector` to `{}`, so `PrometheusRule` resources can be selected across namespaces unless an operator has narrowed those selectors.
