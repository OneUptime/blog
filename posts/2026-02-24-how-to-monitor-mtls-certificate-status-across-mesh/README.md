# How to Monitor mTLS Certificate Status Across Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate, Monitoring, Observability

Description: Monitor the health and status of mTLS certificates across your entire Istio service mesh to catch expiration issues and rotation failures before they cause outages.

---

Certificate problems in an Istio mesh can cause widespread outages. If a workload's certificate expires or fails to rotate, mTLS handshakes fail and services cannot communicate. The tricky part is that certificate issues are often silent until they cause a failure. You will not know a certificate rotation failed unless you are actively monitoring.

This guide covers how to monitor mTLS certificate status across your mesh, set up alerts for expiring certificates, and build dashboards for certificate health.

## How Istio Certificate Rotation Works

Istio workload certificates have a short default lifetime of 24 hours. The sidecar proxy automatically requests a new certificate from istiod before the current one expires. The rotation happens at roughly 50% of the certificate's lifetime, so with a 24-hour certificate, rotation happens every 12 hours.

This means every sidecar in your mesh performs certificate rotation at least once a day. Most of the time this works perfectly. But when it fails (istiod is down, the sidecar has a bug, resource limits are hit), you need to know about it fast.

## Checking Certificate Status with istioctl

The quickest way to check a specific workload's certificate is:

```bash
istioctl proxy-config secret deploy/my-app
```

This shows the certificates loaded in the Envoy proxy, including:
- The certificate chain (ROOTCA, default)
- The serial number
- The validity period (Not After / Not Before)

For a more detailed view:

```bash
istioctl proxy-config secret deploy/my-app -o json | \
  jq '.dynamicActiveSecrets[] | {name: .name, validityNotAfter: .secret.tlsCertificate.certificateChain.inlineBytes}'
```

To get the actual certificate details:

```bash
istioctl proxy-config secret deploy/my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -A2 "Validity"
```

This outputs the certificate's Not Before and Not After dates so you can see when it expires.

## Istiod Metrics for Certificate Monitoring

Istiod exposes several metrics related to certificate signing and distribution:

```text
citadel_server_csr_count
citadel_server_success_cert_issuance_count
citadel_server_csr_parsing_err_count
citadel_server_authentication_failure_count
citadel_server_root_cert_expiry_timestamp
pilot_proxy_convergence_time
```

The most important ones for monitoring:

**CSR success rate**: Compare the number of CSR requests to successful issuances:

```promql
rate(citadel_server_csr_count[5m])
```

```promql
rate(citadel_server_success_cert_issuance_count[5m])
```

If the CSR count is higher than the success count, some certificate requests are failing.

**CSR parsing errors**: These indicate malformed certificate requests:

```promql
rate(citadel_server_csr_parsing_err_count[5m])
```

**Authentication failures**: These occur when a sidecar fails to authenticate with istiod:

```promql
rate(citadel_server_authentication_failure_count[5m])
```

**Root certificate expiry**: This is critical. If the root certificate expires, the entire mesh stops working:

```promql
citadel_server_root_cert_expiry_timestamp - time()
```

This gives you the number of seconds until the root cert expires.

## Sidecar-Level Certificate Metrics

Each sidecar proxy also reports certificate-related metrics:

```text
envoy_server_days_until_first_cert_expiring
istio_agent_pilot_xds_expired_nonce
```

The `envoy_server_days_until_first_cert_expiring` metric is particularly useful. It shows how many days until the certificate on the sidecar expires:

```promql
envoy_server_days_until_first_cert_expiring{pod=~".*"}
```

Since Istio certificates default to 24-hour lifetimes, this should normally be between 0.5 and 1.0 (days). A value of 0 means the certificate has expired.

## Setting Up Alerts

Here are practical alert rules for certificate monitoring:

```yaml
groups:
- name: istio-certificate-alerts
  rules:
  - alert: IstioCertificateRotationFailing
    expr: |
      rate(citadel_server_csr_count[5m]) > 0 and
      rate(citadel_server_success_cert_issuance_count[5m]) == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Istio certificate rotation is failing"
      description: "CSR requests are being made but no certificates are being issued"

  - alert: IstioRootCertExpiringSoon
    expr: |
      (citadel_server_root_cert_expiry_timestamp - time()) < 2592000
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Istio root certificate expires in less than 30 days"

  - alert: IstioRootCertExpiryCritical
    expr: |
      (citadel_server_root_cert_expiry_timestamp - time()) < 604800
    for: 1h
    labels:
      severity: critical
    annotations:
      summary: "Istio root certificate expires in less than 7 days"

  - alert: WorkloadCertExpired
    expr: |
      envoy_server_days_until_first_cert_expiring == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Workload certificate has expired on {{ $labels.pod }}"

  - alert: CertIssuanceAuthFailures
    expr: |
      rate(citadel_server_authentication_failure_count[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Certificate issuance authentication failures detected"
```

## Building a Certificate Health Dashboard

Create a Grafana dashboard with these panels:

**Panel 1 - Certificate Issuance Rate:**

```promql
sum(rate(citadel_server_success_cert_issuance_count[5m]))
```

This should show a steady rate of certificate issuances. A sudden drop means rotation is failing.

**Panel 2 - Root Certificate TTL:**

```promql
(citadel_server_root_cert_expiry_timestamp - time()) / 86400
```

Display as a stat panel showing days until root cert expiration. Color it green if above 30 days, yellow between 7-30, red below 7.

**Panel 3 - Certificate Errors:**

```promql
sum(rate(citadel_server_csr_parsing_err_count[5m])) +
sum(rate(citadel_server_authentication_failure_count[5m]))
```

This should normally be zero. Any non-zero value needs investigation.

**Panel 4 - Per-Workload Certificate Expiry:**

```promql
envoy_server_days_until_first_cert_expiring
```

Display as a table showing each pod and its certificate expiry days. Sort by ascending to put the most urgent at the top.

## Bulk Certificate Status Check

For a quick overview of all certificates in your mesh, you can script a check across all pods:

```bash
for pod in $(kubectl get pods -A -l security.istio.io/tlsMode=istio -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  echo -n "$pod: "
  istioctl proxy-config secret -n $ns $name 2>/dev/null | grep "Not After" | head -1
done
```

This iterates over all pods with Istio sidecars and prints their certificate expiry dates.

## Handling Root Certificate Rotation

The root certificate has a much longer lifetime than workload certificates (typically years), but it still needs to be rotated eventually. Istio supports root certificate rotation without downtime, but you need to monitor the process.

When rotating the root cert:

1. Add the new root cert to the trust bundle alongside the old one
2. Wait for all workloads to get new certificates signed by the new root
3. Remove the old root cert from the trust bundle

Monitor the transition by checking the certificate issuer across workloads:

```bash
istioctl proxy-config secret deploy/my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep "Issuer"
```

Once all workloads show the new issuer, the rotation is complete.

## Practical Tips

**Set certificate lifetime appropriately**: The default 24-hour lifetime is good for security but means frequent rotations. If your istiod has reliability issues, consider extending it slightly (e.g., 48 hours) to give more buffer.

**Monitor istiod health**: Certificate rotation depends on istiod being healthy. If istiod goes down, certificates stop getting renewed. Combine certificate monitoring with istiod health monitoring.

**Test rotation under load**: Certificate rotation involves brief connection resets. Test this under production-like load to ensure it does not cause noticeable errors.

Proactive certificate monitoring prevents the kind of outage that catches everyone by surprise at 3 AM. The metrics and alerts described here give you early warning of any certificate issues in your mesh.
