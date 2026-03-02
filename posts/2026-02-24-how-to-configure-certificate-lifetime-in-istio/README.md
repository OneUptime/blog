# How to Configure Certificate Lifetime in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, Security, Configuration, Kubernetes

Description: How to configure and tune certificate lifetimes in Istio for workload certificates, the root CA, and the self-signed CA rotation period.

---

Certificate lifetimes are a balancing act. Short-lived certificates are more secure because a compromised certificate is only useful for a brief window. But overly short lifetimes increase the load on your CA and raise the risk of rotation failures. Istio has sensible defaults, but you can and should tune them based on your security requirements.

## Default Certificate Lifetimes

Out of the box, Istio uses these lifetimes:

- **Workload certificates**: 24 hours
- **Self-signed root CA**: 10 years
- **Maximum workload certificate TTL**: 90 days

The 24-hour default for workload certificates is a good balance between security and operational overhead. Certificates rotate automatically, so the short lifetime does not require any manual work.

## Checking Current Lifetimes

See the actual certificate lifetime for a running workload:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -E "Not Before|Not After"
```

This shows the validity period of the workload's current certificate. The difference between "Not Before" and "Not After" is the certificate lifetime.

Check the root CA certificate lifetime:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -text -noout | grep -E "Not Before|Not After"
```

Or if you are using custom CA certificates:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -text -noout | grep -E "Not Before|Not After"
```

## Configuring Workload Certificate Lifetime

### Method 1: IstioOperator Configuration

Set the default and maximum workload certificate TTL during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
  components:
    pilot:
      k8s:
        env:
        - name: DEFAULT_WORKLOAD_CERT_TTL
          value: "12h"
        - name: MAX_WORKLOAD_CERT_TTL
          value: "48h"
```

- `DEFAULT_WORKLOAD_CERT_TTL` - The default lifetime for workload certificates
- `MAX_WORKLOAD_CERT_TTL` - The maximum lifetime that any workload can request
- `SECRET_TTL` - The TTL that the sidecar proxy requests from the CA

### Method 2: Environment Variables on Istiod

If Istio is already running, you can update the istiod deployment:

```bash
kubectl set env deployment/istiod -n istio-system \
  DEFAULT_WORKLOAD_CERT_TTL=12h \
  MAX_WORKLOAD_CERT_TTL=48h
```

This triggers a rollout of istiod. Existing workload certificates will continue to work until they are due for rotation, at which point they will get certificates with the new lifetime.

### Method 3: Per-Workload Override

Individual workloads can request a specific certificate lifetime through proxy metadata:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-security-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            SECRET_TTL: "1h"
    spec:
      containers:
      - name: app
        image: myapp:latest
```

This gives the high-security service a 1-hour certificate lifetime while other services use the default. The requested TTL cannot exceed `MAX_WORKLOAD_CERT_TTL`.

## Configuring the Self-Signed CA Lifetime

If you are using Istio's built-in self-signed CA, you can control the root CA certificate lifetime:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: CITADEL_SELF_SIGNED_CA_CERT_TTL
          value: "87600h"  # 10 years (default)
```

Common values:
- `87600h` = 10 years (default)
- `43800h` = 5 years
- `8760h` = 1 year

Shorter CA lifetimes mean you need to rotate the CA more frequently. The CA lifetime should be significantly longer than the workload certificate lifetime.

## Self-Signed CA Rotation

Istio can automatically rotate the self-signed CA before it expires. Configure the rotation parameters:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: CITADEL_SELF_SIGNED_CA_CERT_TTL
          value: "8760h"
        - name: CITADEL_SELF_SIGNED_ROOT_CERT_CHECK_INTERVAL
          value: "1h"
        - name: CITADEL_SELF_SIGNED_ROOT_CERT_GRACE_PERIOD_PERCENTILE
          value: "20"
```

- `CITADEL_SELF_SIGNED_ROOT_CERT_CHECK_INTERVAL` - How often to check if rotation is needed
- `CITADEL_SELF_SIGNED_ROOT_CERT_GRACE_PERIOD_PERCENTILE` - Start rotation when this percentage of the CA lifetime remains

With a 1-year CA and a 20% grace period, rotation starts when the CA has less than about 73 days left.

## Lifetime Recommendations by Environment

### Development

```yaml
env:
- name: DEFAULT_WORKLOAD_CERT_TTL
  value: "24h"
- name: MAX_WORKLOAD_CERT_TTL
  value: "168h"  # 7 days
- name: CITADEL_SELF_SIGNED_CA_CERT_TTL
  value: "8760h"  # 1 year
```

Long lifetimes reduce the chance of certificate issues interrupting development.

### Staging

```yaml
env:
- name: DEFAULT_WORKLOAD_CERT_TTL
  value: "12h"
- name: MAX_WORKLOAD_CERT_TTL
  value: "48h"
- name: CITADEL_SELF_SIGNED_CA_CERT_TTL
  value: "8760h"
```

Match production settings or use slightly shorter values to catch rotation issues early.

### Production

```yaml
env:
- name: DEFAULT_WORKLOAD_CERT_TTL
  value: "12h"
- name: MAX_WORKLOAD_CERT_TTL
  value: "24h"
```

Short lifetimes for maximum security. Use an external CA instead of the self-signed one.

### High-Security Production

```yaml
env:
- name: DEFAULT_WORKLOAD_CERT_TTL
  value: "1h"
- name: MAX_WORKLOAD_CERT_TTL
  value: "4h"
```

Very short lifetimes for environments with strict compliance requirements. This increases CA load significantly, so make sure istiod can handle the CSR rate.

## Impact of Shorter Lifetimes

Shorter certificate lifetimes have trade-offs:

**More CSR requests** - With a 1-hour TTL, each sidecar requests a new certificate roughly every 48 minutes (80% of lifetime). In a cluster with 1,000 pods, that is about 1,250 CSR requests per hour.

**More CPU on istiod** - Each CSR requires a signature operation. Monitor istiod's CPU usage after changing lifetimes.

**Higher risk of rotation failure** - If istiod is temporarily unavailable during the rotation window, the certificate might expire before it can be renewed. With a 24-hour TTL, istiod can be down for several hours without impact. With a 1-hour TTL, the window is much smaller.

Monitor CSR processing:

```bash
kubectl logs deployment/istiod -n istio-system | grep -c "CSR"
```

Check Prometheus metrics:

```
# CSR processing rate
rate(citadel_server_csr_count[5m])

# CSR processing errors
rate(citadel_server_csr_parsing_err_count[5m])

# Certificate issuance success rate
rate(citadel_server_success_cert_issuance_count[5m])
```

## Verifying Lifetime Changes

After changing the configuration, verify that new certificates use the updated lifetime:

```bash
# Restart a pod to force new certificate issuance
kubectl delete pod <pod-name> -n <namespace>

# Wait for the pod to start, then check the certificate
istioctl proxy-config secret <new-pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -E "Not Before|Not After"
```

The difference between "Not Before" and "Not After" should match your configured TTL.

Getting certificate lifetimes right is about matching your security posture with your operational capabilities. Start with the defaults, shorten them as you gain confidence in your monitoring and rotation setup, and always make sure istiod can handle the increased load from shorter lifetimes.
