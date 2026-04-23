# Validation Summary: How to Use Rancher Webhooks for Automation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Prometheus Alertmanager
- Prometheus Operator
- Kubernetes
- Python
- Flask
- GitHub Actions
- Slack incoming webhooks
- PagerDuty
- ServiceNow

## Sources Consulted
- Rancher Monitoring and Alerting: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher Receiver Configuration: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/monitoring-v2-configuration/receivers
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- GitHub repository dispatch API: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- Slack incoming webhooks: https://api.slack.com/messaging/webhooks
- kube-prometheus runbook for `KubeNodeNotReady`: https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubenodenotready/
- kube-prometheus runbook for `KubePodCrashLooping`: https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubepodcrashlooping/
- kube-prometheus-stack chart values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack Alertmanager template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/alertmanager/alertmanager.yaml

## Issues Found
- The post used the older `monitoring.coreos.com/v1alpha1` API for `AlertmanagerConfig`. I updated both examples to `monitoring.coreos.com/v1beta1`, which matches the current Prometheus Operator API reference.
- The post omitted the required `alertmanagerConfigMatcherStrategy` prerequisite. With the upstream chart defaults, an `AlertmanagerConfig` is namespace-scoped by default, so the example in `cattle-monitoring-system` would not process cluster-wide alerts. I added the `rancher-monitoring` values snippet using `OnNamespaceExceptForAlertmanagerNamespace`.
- The main routing example referenced a `pagerduty-critical` receiver that was never defined. I added a valid PagerDuty receiver configuration.
- The alert names in the post did not match the current kube-prometheus alert names. I updated `NodeNotReady` to `KubeNodeNotReady` and `PodCrashLooping` to `KubePodCrashLooping`, and aligned the Python handler and routes with those names.
- The Alertmanager routing example did not actually send the node, crash-loop, and high-memory example alerts to the webhook handler code shown later in the post. I reordered and corrected the routes so the configuration and Python example now match.
- The Slack receiver example used a Slack incoming webhook URL and also set `channel`. I removed `channel` because Slack app incoming webhooks do not allow overriding the default channel at send time.
- The Python `create_incident()` example used `Bearer ${SERVICENOW_TOKEN}`, which would be treated as a literal string in Python. I changed it to read the token from `os.environ`.
- The crash-loop example always called `kubectl logs` without a container name. I updated the handler to use the `container` label when present, which is how the kube-prometheus alert/runbook identifies the crashing container.
- The GitHub Actions example would not work when pointed directly at GitHub’s `/dispatches` endpoint because Alertmanager sends its own webhook payload, while GitHub requires a `repository_dispatch` body with `event_type` and optional `client_payload`. I changed the example so Alertmanager sends to the local handler, and the handler now calls GitHub with the required headers and JSON body.
- The GitHub Actions `AlertmanagerConfig` lacked a route, so the receiver would never be selected. I added a matching `route`.
- The Kubernetes deployment example referenced `http://webhook-handler.automation:8080/...` but only created a `Deployment`. I added a `Service` so the DNS name used in the webhook examples resolves correctly.
- The webhook handler shells out to `kubectl logs` and `kubectl scale`, but the deployment lacked a service account and RBAC. I added a `ServiceAccount`, `ClusterRole`, `ClusterRoleBinding`, and bound the deployment to that service account.
- The conclusion claimed the example automatically restarted crash-looping pods, but the code only captured logs and notified Slack. I corrected the text to match the implemented behavior.

## Review Notes
- `HighMemoryUsage` is still a custom alert example, not a default kube-prometheus alert. The scaling example assumes the alert carries `namespace` and `deployment` labels.
- The GitHub example assumes the target repository already has a workflow that listens for `repository_dispatch` events with the `rancher-alert` type.
- The container image in the deployment remains a placeholder image reference. For the example to work in practice, that image must include the Python app, Flask, `requests`, and `kubectl`.
