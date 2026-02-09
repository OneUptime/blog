# How to Implement FedRAMP Security Controls for Kubernetes Workloads in Government Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, FedRAMP, Compliance, Government, Security, Cloud

Description: Implement FedRAMP security controls for Kubernetes clusters serving government workloads, covering boundary protection, access enforcement, audit logging, and continuous monitoring requirements for Moderate and High impact levels.

---

Federal Risk and Authorization Management Program (FedRAMP) compliance is mandatory for cloud services used by U.S. federal agencies. FedRAMP defines security controls based on NIST SP 800-53, categorized by impact levels: Low, Moderate, and High. Most government Kubernetes deployments target Moderate or High impact levels.

FedRAMP requires implementing hundreds of security controls across 17 control families. For Kubernetes infrastructure, the most critical controls involve access control, audit and accountability, identification and authentication, system and communications protection, and continuous monitoring. Meeting these requirements demands careful architectural planning and rigorous implementation.

## Understanding FedRAMP Control Baseline for Kubernetes

FedRAMP Moderate baseline includes 325 controls across families like AC (Access Control), AU (Audit and Accountability), IA (Identification and Authentication), SC (System and Communications Protection), and SI (System and Information Integrity). Each control requires specific implementation and evidence.

For Kubernetes, key controls include AC-2 (Account Management), AC-6 (Least Privilege), AU-2 (Audit Events), AU-9 (Protection of Audit Information), IA-2 (Identification and Authentication), SC-7 (Boundary Protection), SC-8 (Transmission Confidentiality), and SI-4 (Information System Monitoring).

## Implementing AC-2 Account Management Controls

FedRAMP AC-2 requires managing system accounts including creation, enablement, modification, and removal. For Kubernetes, this means automated account lifecycle management and integration with government identity providers.

```yaml
# fedramp-ac2-account-management.yaml
---
# Integrate with government CAC/PIV authentication
apiVersion: v1
kind: ConfigMap
metadata:
  name: oidc-config
  namespace: kube-system
data:
  oidc-issuer-url: "https://login.gov/openid-connect"
  oidc-client-id: "kubernetes-cluster-prod"
  oidc-username-claim: "email"
  oidc-groups-claim: "groups"
  oidc-ca-file: "/etc/kubernetes/pki/ca.crt"

---
# Configure API server for OIDC authentication
# Add to kube-apiserver flags:
# --oidc-issuer-url=https://login.gov/openid-connect
# --oidc-client-id=kubernetes-cluster-prod
# --oidc-username-claim=email
# --oidc-groups-claim=groups
# --oidc-ca-file=/etc/kubernetes/pki/oidc-ca.crt

---
# ServiceAccount lifecycle automation
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-inactive-accounts
  namespace: kube-system
spec:
  schedule: "0 0 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: account-manager
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Remove ServiceAccounts unused for 90 days per FedRAMP AC-2(3)
              kubectl get serviceaccounts --all-namespaces -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp | fromdateiso8601 < (now - 7776000)) |
                  "\(.metadata.namespace) \(.metadata.name)"' | \
                while read ns sa; do
                  # Check last token usage
                  LAST_USED=$(kubectl get secret -n $ns -l "kubernetes.io/service-account.name=$sa" \
                    -o jsonpath='{.items[0].metadata.annotations.last-used}' 2>/dev/null)

                  if [ -z "$LAST_USED" ]; then
                    echo "Removing inactive ServiceAccount: $ns/$sa"
                    kubectl delete serviceaccount -n $ns $sa
                  fi
                done
          restartPolicy: OnFailure
```

## Implementing AU-2 Audit Events and AU-9 Audit Protection

FedRAMP requires comprehensive audit logging with protection against unauthorized access, modification, and deletion. Configure immutable audit trails that meet NIST 800-53 requirements.

```yaml
# fedramp-au2-au9-audit-logging.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: fedramp-audit-policy
rules:
  # AU-2(a): Audit successful and unsuccessful account logon events
  - level: RequestResponse
    verbs: ["create"]
    resources:
      - group: "authentication.k8s.io"
        resources: ["tokenreviews"]

  # AU-2(d): Audit successful and unsuccessful accesses to security objects
  - level: RequestResponse
    verbs: ["get", "list", "create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["secrets"]
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # AU-2: Audit privileged operations
  - level: RequestResponse
    verbs: ["create", "patch", "update", "delete"]
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # AU-2: Audit security policy changes
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: "policy"
        resources: ["podsecuritypolicies"]
      - group: "networking.k8s.io"
        resources: ["networkpolicies"]

  # Audit all namespace creation/deletion (SC-7 boundary changes)
  - level: RequestResponse
    verbs: ["create", "delete"]
    resources:
      - group: ""
        resources: ["namespaces"]

  # Log metadata for read operations
  - level: Metadata
    verbs: ["get", "list", "watch"]

---
# AU-9: Protect audit logs with write-once storage
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-forwarder-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [OUTPUT]
        Name                s3
        Match               audit.*
        bucket              fedramp-audit-logs-immutable
        region              us-gov-west-1
        # Use S3 Object Lock for immutability (AU-9)
        total_file_size     100M
        upload_timeout      10m
        use_put_object      On
        s3_key_format       /cluster-${CLUSTER_NAME}/audit/%Y/%m/%d/%H/%M/%S-$UUID.gz

    [OUTPUT]
        Name                splunk
        Match               audit.*
        Host                splunk.gov.agency.mil
        Port                8088
        TLS                 On
        TLS.Verify          On
        Splunk_Token        ${SPLUNK_HEC_TOKEN}
```

Configure S3 bucket with Object Lock for immutable audit storage:

```bash
# Create S3 bucket with Object Lock enabled (AU-9 compliance)
aws s3api create-bucket \
  --bucket fedramp-audit-logs-immutable \
  --region us-gov-west-1 \
  --create-bucket-configuration LocationConstraint=us-gov-west-1 \
  --object-lock-enabled-for-bucket

# Configure Object Lock retention (7 years for FedRAMP)
aws s3api put-object-lock-configuration \
  --bucket fedramp-audit-logs-immutable \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Years": 7
      }
    }
  }'

# Enable versioning (required for Object Lock)
aws s3api put-bucket-versioning \
  --bucket fedramp-audit-logs-immutable \
  --versioning-configuration Status=Enabled
```

## Implementing SC-7 Boundary Protection

FedRAMP SC-7 requires monitoring and controlling communications at external boundaries. Implement strict network segmentation and boundary protection.

```yaml
# fedramp-sc7-boundary-protection.yaml
---
# Default deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# SC-7(3): Limit external connections
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      external-access: "approved"
  policyTypes:
    - Egress
  egress:
    # Allow only to approved external endpoints
    - to:
        - podSelector:
            matchLabels:
              component: api-gateway
      ports:
        - protocol: TCP
          port: 443

---
# SC-7(4)(5): Deny by default, allow by exception
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: fedramp-boundary-protection
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      tier: frontend
  egress:
    # Allow DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP

    # Allow backend communication
    - toEndpoints:
        - matchLabels:
            tier: backend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP

    # Block all other egress
    - toFQDNs:
        - matchPattern: "*.gov"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

Deploy boundary protection with Cilium for enhanced visibility:

```bash
# Install Cilium for network policy enforcement
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set policyEnforcementMode=always \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Verify network policies are enforced
kubectl get networkpolicies --all-namespaces
```

## Implementing SC-8 Transmission Confidentiality

SC-8 requires encrypting sensitive information during transmission. Enforce TLS for all communication paths.

```yaml
# fedramp-sc8-transmission-encryption.yaml
---
# PeerAuthentication for strict mTLS (using Istio)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT  # SC-8(1): Cryptographic protection

---
# Require TLS 1.2 or higher
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: fedramp-tls-settings
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      minimumProtocolVersion: TLSV1_2  # SC-8 requirement
      cipherSuites:
        # NIST-approved cipher suites only
        - ECDHE-RSA-AES256-GCM-SHA384
        - ECDHE-RSA-AES128-GCM-SHA256

---
# Gateway with FIPS-compliant TLS
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: fedramp-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        minProtocolVersion: TLSV1_2
        cipherSuites:
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES128-GCM-SHA256
        credentialName: fedramp-tls-cert
      hosts:
        - "*.apps.gov.agency.mil"
```

## Implementing SI-4 Information System Monitoring

SI-4 requires continuous monitoring of the information system. Deploy comprehensive monitoring that detects security incidents.

```yaml
# fedramp-si4-monitoring.yaml
---
# Falco for runtime security monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-config
  namespace: falco
data:
  falco.yaml: |
    rules_file:
      - /etc/falco/falco_rules.yaml
      - /etc/falco/falco_rules.local.yaml
      - /etc/falco/fedramp_rules.yaml

    json_output: true
    json_include_output_property: true

    # SI-4: Alert on security events
    priority: warning

    # Send alerts to SIEM
    outputs:
      rate: 1
      max_burst: 1000

    program_output:
      enabled: true
      keep_alive: false
      program: |
        "curl -X POST https://siem.gov.agency.mil/api/alerts \
         -H 'Content-Type: application/json' \
         -d @-"

  fedramp_rules.yaml: |
    # SI-4(2): Automated tools for real-time analysis
    - rule: Unauthorized Process Launched
      desc: Detect processes not in approved baseline
      condition: >
        spawned_process and
        not proc.name in (approved_processes)
      output: >
        Unauthorized process detected (user=%user.name
        process=%proc.name parent=%proc.pname
        cmdline=%proc.cmdline container=%container.name)
      priority: CRITICAL

    - rule: Privilege Escalation Attempt
      desc: Detect attempts to escalate privileges
      condition: >
        spawned_process and
        proc.name in (sudo, su, setuid) and
        not user.name in (approved_admin_users)
      output: >
        Privilege escalation attempt (user=%user.name
        process=%proc.name container=%container.name)
      priority: CRITICAL

    - rule: Sensitive File Access
      desc: Monitor access to sensitive configuration files
      condition: >
        open_read and
        fd.name in (/etc/shadow, /etc/passwd, /etc/kubernetes/pki/*)
      output: >
        Sensitive file accessed (user=%user.name
        file=%fd.name process=%proc.name)
      priority: WARNING
```

Deploy Falco for runtime monitoring:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --values fedramp-si4-monitoring.yaml
```

## Creating FedRAMP Compliance Documentation

Generate System Security Plan (SSP) documentation automatically from cluster configuration:

```bash
# fedramp-ssp-generator.sh
#!/bin/bash

echo "FedRAMP System Security Plan - Control Implementation"
echo "======================================================"

echo -e "\nAC-2: Account Management"
echo "Implementation: OIDC integration with Login.gov"
kubectl get configmap oidc-config -n kube-system -o yaml

echo -e "\nAU-2: Audit Events"
echo "Implementation: Comprehensive API server audit logging"
echo "Audit policy location: /etc/kubernetes/audit-policy.yaml"
echo "Retention period: 7 years in immutable S3 storage"

echo -e "\nSC-7: Boundary Protection"
echo "Implementation: Network policies with default deny"
kubectl get networkpolicies --all-namespaces -o wide

echo -e "\nSC-8: Transmission Confidentiality"
echo "Implementation: Strict mTLS with Istio"
kubectl get peerauthentication -n istio-system -o yaml

echo -e "\nSI-4: Information System Monitoring"
echo "Implementation: Falco runtime security monitoring"
kubectl get pods -n falco

echo -e "\nControl Implementation Summary:"
echo "- Authentication: $(kubectl get configmap oidc-config -n kube-system &>/dev/null && echo 'Configured' || echo 'Not Configured')"
echo "- Audit Logging: $(kubectl logs -n kube-system -l component=kube-apiserver --tail=1 &>/dev/null && echo 'Active' || echo 'Inactive')"
echo "- Network Security: $(kubectl get networkpolicies -A -o json | jq '.items | length') policies active"
echo "- Encryption: $(kubectl get peerauthentication -n istio-system -o json | jq -r '.items[0].spec.mtls.mode')"
echo "- Monitoring: $(kubectl get pods -n falco -l app=falco --field-selector=status.phase=Running -o json | jq '.items | length') Falco pods running"
```

## Continuous Compliance Monitoring

Implement automated compliance scanning using OSCAP:

```yaml
# fedramp-compliance-scan.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: fedramp-compliance-scan
  namespace: compliance
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: oscap-scan
            image: openshift/oscap:latest
            command:
            - /bin/bash
            - -c
            - |
              # Run SCAP scan against FedRAMP baseline
              oscap xccdf eval \
                --profile xccdf_gov.nist_profile_NIST-800-53-moderate \
                --results /reports/scan-results-$(date +%Y%m%d).xml \
                --report /reports/scan-report-$(date +%Y%m%d).html \
                /usr/share/xml/scap/ssg/content/ssg-rhel8-ds.xml

              # Upload results to compliance portal
              curl -X POST https://compliance.gov.agency.mil/api/scans \
                -F "results=@/reports/scan-results-$(date +%Y%m%d).xml"
            volumeMounts:
            - name: reports
              mountPath: /reports
          volumes:
          - name: reports
            persistentVolumeClaim:
              claimName: compliance-reports
          restartPolicy: OnFailure
```

FedRAMP compliance for Kubernetes requires implementing comprehensive security controls, maintaining detailed documentation, and demonstrating continuous monitoring. By mapping each NIST 800-53 control to specific Kubernetes configurations and automating compliance verification, you create a defensible security posture that meets federal requirements. Regular audits and automated scanning ensure ongoing compliance as your infrastructure evolves.
