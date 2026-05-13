# Validation Summary: How to Monitor Calico Pods for External Service Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- Prometheus
- Prometheus Operator
- CoreDNS
- Grafana
- OneUptime synthetic monitoring
- Linux iptables/NAT

## Sources Consulted
- Calico Open Source documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation, Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico Cloud Felix Prometheus metric reference: https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/prometheus
- CoreDNS prometheus plugin metrics documentation: https://coredns.io/plugins/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Prometheus alert used `felix_nat_outgoing_active`, which is not part of the documented Felix Prometheus metric reference. I replaced it with `increase(felix_iptables_restore_errors[5m]) > 0`, a documented Felix metric that detects failures while Felix applies iptables updates, including rules that can affect NAT programming.
- The CoreDNS alert queried `coredns_dns_requests_total{type="A",rcode="SERVFAIL"}`. CoreDNS documents `rcode` on `coredns_dns_responses_total`, not on `coredns_dns_requests_total`. I changed the query to `rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 0.1`.
- The NAT validation example claimed that a CronJob validates NAT rules on all nodes, but a CronJob creates ordinary Jobs that run on scheduled nodes, not one pod per node. I changed the example to an `apps/v1` DaemonSet so the validator runs on each node.
- The NAT validator used `calico/node:v3.27.0` with `/bin/bash`. That image is not the right general-purpose troubleshooting image for this shell-based check. I changed it to `nicolaka/netshoot` and `/bin/sh`, which matches the post's existing troubleshooting image choice and includes common networking tools.
- The dashboard diagram still implied that the HTTPS probe always returns HTTP 200. I changed it to say "HTTP status code or error" because `curl` reports whatever status the target returns.
- The OneUptime section said external synthetic monitors simulate pod traffic and check whether the cluster's external IP can reach an API. External HTTP monitors do not run from inside pod networking. I changed the wording to present OneUptime as an external dependency check that complements pod-based probes.
- The conclusion referred to "Felix NAT metrics" after the metric correction. I updated it to "Felix iptables programming metrics, NAT rule checks, and CoreDNS failure rate monitoring."

## Review Notes
- Felix metrics must be enabled before Prometheus can scrape them; Calico documentation notes that Felix Prometheus metrics are disabled by default and exposed on TCP port 9091 when enabled.
- Prometheus Operator installations often require labels on `PrometheusRule` objects to match the Prometheus `ruleSelector`; this is deployment-specific and the post keeps the manifest generic.
- I could not run local `kubectl --help` checks because `kubectl` is not installed in this environment, so kubectl syntax was checked against the official Kubernetes command reference instead.
