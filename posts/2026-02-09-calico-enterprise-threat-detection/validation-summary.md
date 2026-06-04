# Validation Summary: How to Set Up Calico Enterprise Threat Detection for Kubernetes Network Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise
- Tigera Operator
- Kubernetes
- Calico Enterprise GlobalThreatFeed
- Calico Enterprise GlobalAlert
- Calico Enterprise DeepPacketInspection
- Calico Enterprise GlobalNetworkPolicy
- Prometheus / Grafana metrics
- Go client-go remediation controller

## Sources Consulted
- Calico Enterprise standard Kubernetes installation: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/kubernetes/generic-install
- Calico Enterprise installation API reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/api
- Calico Enterprise GlobalThreatFeed resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalthreatfeed
- Calico Enterprise suspicious IP threat feeds: https://docs.tigera.io/calico-enterprise/latest/threat/suspicious-ips
- Calico Enterprise suspicious domain threat feeds: https://docs.tigera.io/calico-enterprise/latest/threat/suspicious-domains
- Calico Enterprise DeepPacketInspection resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/deeppacketinspection
- Calico Enterprise deep packet inspection guide: https://docs.tigera.io/calico-enterprise/latest/threat/deeppacketinspection
- Calico Enterprise GlobalAlert resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalalert
- Calico Enterprise alert management guide: https://docs.tigera.io/calico-enterprise/latest/observability/alerts
- Calico Enterprise webhooks for security events: https://docs.tigera.io/calico-enterprise/latest/threat/configuring-webhooks
- Calico Enterprise GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalnetworkpolicy
- Calico Enterprise flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Enterprise policy metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Kubernetes client-go in-cluster config example: https://github.com/kubernetes/client-go/tree/master/examples/in-cluster-client-configuration

## Issues Found
- The post claimed threat detection happens at the network layer using eBPF. Updated the explanation to describe Calico Enterprise flow logs, DNS logs, threat feeds, GlobalAlerts, and DPI, and noted that DPI uses Snort rules with AF_PACKET.
- The Tigera Operator install command used an older v3.17.0 manifest and omitted current CRD and Prometheus operator installation steps. Updated the commands to Calico Enterprise 3.22.5 operator, CRD, and Prometheus operator manifests.
- The IntrusionDetection resource used `metadata.name: default` and `componentName: IntrusionDetectionController`. The official API requires IntrusionDetection to be named `tigera-secure`, and DPI resource tuning uses `componentName: DeepPacketInspection`. Updated the YAML.
- The GlobalThreatFeed examples used unsupported `content` values: `All`, `TorNodes`, and `MalwareC2`. Replaced them with supported `IPSet` and `DomainNameSet` threat feed examples, including a `globalNetworkSet` label for IP-based blocking.
- The GlobalAlert examples used invalid query fields and unsupported query syntax such as `dest_port_count`, `time_window`, `${source_ip}` in the query, `query_length`, `subdomain_count`, and SQL-style `IN (...)`. Replaced them with supported GlobalAlert queries using documented flow and DNS log fields.
- The alert webhook section used a non-existent `GlobalAlertWebhook` Kubernetes resource. Replaced it with the documented Calico Enterprise web console webhook workflow and the Alertmanager v2 endpoint format.
- The crypto-mining policy attempted to deny egress using `destination.domains`, which is not a supported deny rule pattern for static domain blocking. Updated the example to deny known mining ports and deny destinations selected from the threat-feed-backed GlobalNetworkSet.
- The remediation controller treated only exact severities 80 and 90 as high severity, leaving severity 85 alerts out of the high-severity branch. Changed the switch to range-based severity checks.
- The monitoring section used `calicoctl get alerts --all`, but `alerts` is not a supported Calico resource type. Replaced it with `kubectl get globalalert ... -o yaml` and noted that alert events are viewed in the Calico Enterprise web console.
- The Grafana dashboard used fabricated metrics `calico_threat_alerts_total` and `calico_blocked_connections_total`. Replaced them with documented Calico Enterprise policy metrics: `calico_denied_packets`, `calico_denied_bytes`, and `cnx_policy_rule_connections`.

## Review Notes
The post is technically relevant but had multiple fabricated or outdated Calico Enterprise resource examples. The corrected version still uses placeholder feed and webhook values where operator-specific inputs are required, so users must substitute their own licensed registry credentials, license file, threat feed URLs, and webhook destinations.
