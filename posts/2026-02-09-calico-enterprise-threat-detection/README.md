# How to Set Up Calico Enterprise Threat Detection for Kubernetes Network Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, Kubernetes, Security, Threat Detection, Network

Description: Configure Calico Enterprise threat detection to identify and block malicious network activity in Kubernetes clusters with real-time alerts, anomaly detection, and automated response capabilities.

---

Kubernetes clusters face constant security threats from external attackers and compromised workloads. Traditional perimeter security fails when threats originate inside the cluster or when workloads are compromised. Calico Enterprise provides deep threat detection that monitors network behavior and identifies malicious activity in real time.

This guide shows you how to deploy Calico Enterprise threat detection, configure detection rules, set up alerts, and implement automated responses to security threats.

## Understanding Calico Threat Detection

Calico Enterprise monitors network traffic for suspicious patterns:

- Port scanning attempts
- DDoS attack signatures
- Cryptocurrency mining activity
- Data exfiltration patterns
- Lateral movement attempts
- Connection to known malicious IPs

Detection happens at the network layer using eBPF, providing visibility without application modifications.

## Installing Calico Enterprise

Install Calico Enterprise operator:

```bash
# Add Tigera operator repository
kubectl create -f https://downloads.tigera.io/ee/v3.17.0/manifests/tigera-operator.yaml

# Create pull secret for Calico Enterprise images
kubectl create secret generic tigera-pull-secret \
  --from-file=.dockerconfigjson=<path-to-pull-secret> \
  --type=kubernetes.io/dockerconfigjson \
  -n tigera-operator
```

Install Calico Enterprise:

```yaml
# calico-installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: TigeraSecureEnterprise
  registry: quay.io/
  imagePath: tigera
  imagePullSecrets:
    - name: tigera-pull-secret
  calicoNetwork:
    bgp: Enabled
    ipPools:
    - cidr: 10.244.0.0/16
      encapsulation: VXLAN

---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}

---
apiVersion: operator.tigera.io/v1
kind: IntrusionDetection
metadata:
  name: default
spec:
  componentResources:
  - componentName: IntrusionDetectionController
    resourceRequirements:
      requests:
        cpu: 100m
        memory: 100Mi
      limits:
        cpu: 500m
        memory: 500Mi
```

Apply the configuration:

```bash
kubectl apply -f calico-installation.yaml
```

## Enabling Threat Detection Features

Configure intrusion detection system (IDS):

```yaml
# threat-detection-config.yaml
apiVersion: projectcalico.org/v3
kind: GlobalThreatFeed
metadata:
  name: threatfeed-all
spec:
  content: All
  mode: Enabled
  description: "Enable all threat feeds"

---
apiVersion: projectcalico.org/v3
kind: GlobalThreatFeed
metadata:
  name: threatfeed-tor
spec:
  content: TorNodes
  mode: Enabled
  description: "Block Tor exit nodes"

---
apiVersion: projectcalico.org/v3
kind: GlobalThreatFeed
metadata:
  name: threatfeed-malware
spec:
  content: MalwareC2
  mode: Enabled
  description: "Block known malware C2 servers"

---
apiVersion: projectcalico.org/v3
kind: DeepPacketInspection
metadata:
  name: default
  namespace: production
spec:
  selector: all()
```

Apply threat detection config:

```bash
kubectl apply -f threat-detection-config.yaml
```

## Configuring Detection Rules

Create custom detection rules:

```yaml
# detection-rules.yaml
apiVersion: projectcalico.org/v3
kind: GlobalAlert
metadata:
  name: port-scan-alert
spec:
  description: "Alert on port scanning activity"
  summary: "Port scan detected from ${source_ip}"
  severity: 100
  dataSet: flows
  query: |
    (
      source_ip=${source_ip} AND
      dest_port_count > 20 AND
      time_window = 60s
    )
  aggregateBy: [source_namespace, source_name]
  metric: count
  condition: gt
  threshold: 1

---
apiVersion: projectcalico.org/v3
kind: GlobalAlert
metadata:
  name: dns-tunneling-alert
spec:
  description: "Detect DNS tunneling attempts"
  summary: "Possible DNS tunneling from ${source_name}"
  severity: 80
  dataSet: dns
  query: |
    (
      query_length > 100 OR
      subdomain_count > 5
    )
  aggregateBy: [source_namespace, source_name]
  metric: count
  condition: gt
  threshold: 10
  period: 5m

---
apiVersion: projectcalico.org/v3
kind: GlobalAlert
metadata:
  name: crypto-mining-alert
spec:
  description: "Detect cryptocurrency mining activity"
  summary: "Crypto mining detected in ${source_namespace}/${source_name}"
  severity: 90
  dataSet: flows
  query: |
    (
      (dest_port IN (3333, 5555, 7777, 8888, 9999)) OR
      (dest_name IN (
        'pool.supportxmr.com',
        'xmr-eu1.nanopool.org',
        'xmr.pool.minergate.com'
      ))
    )
  aggregateBy: [source_namespace, source_name]
  metric: count
  condition: gt
  threshold: 1

---
apiVersion: projectcalico.org/v3
kind: GlobalAlert
metadata:
  name: data-exfiltration-alert
spec:
  description: "Detect large data transfers"
  summary: "Large data transfer from ${source_name}"
  severity: 85
  dataSet: flows
  query: |
    (
      bytes_out > 1000000000 AND
      dest_ip NOT IN ${internal_networks}
    )
  aggregateBy: [source_namespace, source_name]
  metric: sum
  field: bytes_out
  condition: gt
  threshold: 5000000000
  period: 10m
```

Apply detection rules:

```bash
kubectl apply -f detection-rules.yaml
```

## Setting Up Alert Notifications

Configure alert webhooks:

```yaml
# alert-webhook.yaml
apiVersion: projectcalico.org/v3
kind: GlobalAlertWebhook
metadata:
  name: slack-alerts
spec:
  description: "Send alerts to Slack"
  url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  method: POST
  headers:
    Content-Type: application/json
  body: |
    {
      "text": "Security Alert: ${alert.summary}",
      "attachments": [{
        "color": "danger",
        "fields": [
          {
            "title": "Severity",
            "value": "${alert.severity}",
            "short": true
          },
          {
            "title": "Source",
            "value": "${alert.source_namespace}/${alert.source_name}",
            "short": true
          },
          {
            "title": "Description",
            "value": "${alert.description}"
          }
        ]
      }]
    }

---
apiVersion: projectcalico.org/v3
kind: GlobalAlertWebhook
metadata:
  name: pagerduty-alerts
spec:
  description: "Send critical alerts to PagerDuty"
  url: https://events.pagerduty.com/v2/enqueue
  method: POST
  headers:
    Content-Type: application/json
  body: |
    {
      "routing_key": "YOUR_PAGERDUTY_KEY",
      "event_action": "trigger",
      "payload": {
        "summary": "${alert.summary}",
        "severity": "critical",
        "source": "${alert.source_name}",
        "custom_details": {
          "namespace": "${alert.source_namespace}",
          "description": "${alert.description}"
        }
      }
    }
  filter:
    severity: gte(90)
```

## Implementing Automated Response

Create quarantine policies:

```yaml
# quarantine-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: quarantine-infected-pods
spec:
  tier: security
  order: 10
  selector: has(quarantine)
  types:
  - Ingress
  - Egress
  ingress:
  - action: Log
    source:
      selector: has(security-scanner)
  - action: Deny
  egress:
  - action: Log
    destination:
      selector: has(security-scanner)
  - action: Deny

---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-crypto-mining
spec:
  tier: security
  order: 20
  selector: all()
  types:
  - Egress
  egress:
  - action: Deny
    destination:
      ports:
      - 3333
      - 5555
      - 7777
      - 8888
      - 9999
    protocol: TCP
  - action: Deny
    destination:
      domains:
      - "*.pool.minergate.com"
      - "*.nanopool.org"
      - "*.supportxmr.com"
```

## Building Automated Remediation

Create a controller that responds to threats:

```go
// threat-responder.go
package main

import (
    "context"
    "fmt"
    "log"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type ThreatResponder struct {
    clientset *kubernetes.Clientset
}

func NewThreatResponder() (*ThreatResponder, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &ThreatResponder{clientset: clientset}, nil
}

func (tr *ThreatResponder) QuarantinePod(namespace, podName string) error {
    ctx := context.Background()

    pod, err := tr.clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
    if err != nil {
        return fmt.Errorf("failed to get pod: %w", err)
    }

    // Add quarantine label
    if pod.Labels == nil {
        pod.Labels = make(map[string]string)
    }
    pod.Labels["quarantine"] = "true"
    pod.Labels["quarantine-reason"] = "threat-detected"

    _, err = tr.clientset.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{})
    if err != nil {
        return fmt.Errorf("failed to quarantine pod: %w", err)
    }

    log.Printf("Quarantined pod: %s/%s", namespace, podName)

    // Scale down parent deployment
    return tr.scaleDownDeployment(namespace, pod)
}

func (tr *ThreatResponder) scaleDownDeployment(namespace string, pod *corev1.Pod) error {
    ctx := context.Background()

    // Find owning deployment
    for _, owner := range pod.OwnerReferences {
        if owner.Kind == "ReplicaSet" {
            rs, err := tr.clientset.AppsV1().ReplicaSets(namespace).Get(ctx, owner.Name, metav1.GetOptions{})
            if err != nil {
                continue
            }

            for _, rsOwner := range rs.OwnerReferences {
                if rsOwner.Kind == "Deployment" {
                    deployment, err := tr.clientset.AppsV1().Deployments(namespace).Get(ctx, rsOwner.Name, metav1.GetOptions{})
                    if err != nil {
                        return err
                    }

                    // Scale to 0
                    replicas := int32(0)
                    deployment.Spec.Replicas = &replicas

                    _, err = tr.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
                    if err != nil {
                        return err
                    }

                    log.Printf("Scaled down deployment: %s/%s", namespace, deployment.Name)
                    return nil
                }
            }
        }
    }

    return nil
}

func (tr *ThreatResponder) HandleAlert(alert Alert) error {
    log.Printf("Processing alert: %s", alert.Summary)

    switch alert.Severity {
    case 100:
        // Critical threat - immediate quarantine
        return tr.QuarantinePod(alert.SourceNamespace, alert.SourceName)

    case 80, 90:
        // High severity - log and notify
        log.Printf("High severity threat detected: %s/%s", alert.SourceNamespace, alert.SourceName)
        // Send notification

    default:
        // Lower severity - log only
        log.Printf("Threat detected: %s/%s", alert.SourceNamespace, alert.SourceName)
    }

    return nil
}

type Alert struct {
    Summary         string
    Severity        int
    SourceNamespace string
    SourceName      string
    Description     string
}
```

## Monitoring Threat Detection

View detected threats:

```bash
# List all alerts
kubectl get globalalerts

# View alert details
kubectl describe globalalert port-scan-alert

# Check alert history
calicoctl get alerts --all

# View quarantined pods
kubectl get pods -A -l quarantine=true
```

Create a threat dashboard:

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "Calico Threat Detection",
    "panels": [
      {
        "title": "Active Threats",
        "targets": [{
          "expr": "sum(calico_threat_alerts_total) by (severity)"
        }]
      },
      {
        "title": "Blocked Connections",
        "targets": [{
          "expr": "rate(calico_blocked_connections_total[5m])"
        }]
      },
      {
        "title": "Top Threat Sources",
        "targets": [{
          "expr": "topk(10, sum by (source_namespace) (calico_threat_alerts_total))"
        }]
      }
    ]
  }
}
```

## Testing Threat Detection

Simulate threats for testing:

```bash
# Port scan simulation
kubectl run port-scanner --image=alpine --rm -it -- sh -c "
  for i in \$(seq 1 100); do
    nc -zv target-service \$i 2>&1 | grep succeeded || true
  done
"

# DNS tunneling simulation
kubectl run dns-tunnel --image=alpine --rm -it -- sh -c "
  for i in \$(seq 1 20); do
    nslookup verylongsubdomain\$i.verylongsubdomain.example.com
  done
"

# Crypto mining simulation
kubectl run crypto-miner --image=alpine --rm -it -- sh -c "
  nc -zv pool.supportxmr.com 3333
"
```

Verify alerts were triggered:

```bash
kubectl get globalalerts
calicoctl get alerts --all | grep -E "port-scan|dns-tunnel|crypto"
```

Calico Enterprise threat detection provides continuous security monitoring at the network layer. Configure detection rules that match your security requirements, integrate with incident response systems, and automate remediation for rapid threat containment.
