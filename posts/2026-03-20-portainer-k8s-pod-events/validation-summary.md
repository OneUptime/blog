# Validation Summary: How to View Pod Events and Logs in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Portainer API
- Grafana Loki
- Grafana Alloy
- Python logging
- Python `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer kubeconfig documentation: https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer application inspection documentation: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer node inspection documentation: https://docs.portainer.io/sts/user/kubernetes/cluster/node
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes `kube-apiserver` reference (`--event-ttl`): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Grafana Loki Docker/Compose installation docs: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki quickstart: https://grafana.com/docs/loki/latest/get-started/quick-start/quick-start/
- Grafana Loki Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Python logging documentation: https://docs.python.org/3/library/logging.html
- Python Logging HOWTO: https://docs.python.org/3/howto/logging.html

## Issues Found
- The Portainer log navigation path implied a separate pod details page. Portainer's current docs show pod logs are accessed from the application's **Application containers** section, so the navigation text was corrected.
- The post claimed a cluster-wide **Kubernetes > Cluster > Events** view in Portainer. Current Portainer docs document node-related events under **Kubernetes > Cluster > Details > Your Node > Events**, so that line was corrected.
- The `kubectl` examples used `kubectl get events --sort-by='.lastTimestamp'`. Current Kubernetes documentation provides the dedicated `kubectl events` command, and `lastTimestamp` is deprecated in newer event APIs, so the commands were updated to `kubectl events`.
- The event retention note stated a flat one-hour default without context. This was clarified to the documented `kube-apiserver --event-ttl` default of `1h0m0s`, unless changed by the cluster operator.
- The Loki example used Promtail, which Grafana has deprecated, and the snippet was not a current official setup path. It was replaced with Grafana's current Loki + Alloy Docker example workflow.
- The Python structured logging example called `logger.info(...)` without setting the logger level. Since Python defaults to `WARNING`, the example would not emit the sample `INFO` log; `logger.setLevel(logging.INFO)` was added.

## Review Notes
- The Portainer API examples are valid because Portainer can proxy the underlying Kubernetes API; actual access still depends on the Portainer user's permissions for that environment.
- The Loki example is now explicitly framed as a Docker-based setup. For Kubernetes-native log aggregation, Grafana's current guidance is to use Alloy with Kubernetes deployment tooling such as Helm rather than Docker Compose.
- The `analyze_events.py` example assumes the third-party `requests` package is already installed.
