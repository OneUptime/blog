# How to Configure cert-manager with Step-CA for Custom ACME Certificate Authority

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to deploy Smallstep Step-CA as a custom ACME certificate authority and integrate it with cert-manager for internal certificate management with ACME protocol support.

---

Step-CA from Smallstep provides a lightweight, open-source certificate authority with ACME protocol support. Unlike Let's Encrypt which only issues certificates for public domains, Step-CA enables ACME-based certificate management for internal domains, private networks, and air-gapped environments. Integrating Step-CA with cert-manager provides automated internal certificate management using the same workflows as public ACME providers.

This combination delivers enterprise-grade internal PKI with the automation benefits of ACME, without dependency on external certificate authorities or manual certificate management.

## Understanding Step-CA Benefits

Step-CA provides several advantages for internal certificate management:

Full ACME protocol support enabling integration with cert-manager and other ACME clients.

Internal domain certificate issuance without public DNS requirements.

Complete control over certificate policies, validity periods, and CA hierarchy.

Air-gapped deployment capability for isolated networks.

Integration with identity providers for authentication and authorization.

Open-source with optional commercial support.

## Installing Step-CA in Kubernetes

Deploy Step-CA using Helm:

```bash
# Add Smallstep Helm repository
helm repo add smallstep https://smallstep.github.io/helm-charts/
helm repo update

# Install Step-CA
helm install step-ca smallstep/step-certificates \
  --namespace step-ca \
  --create-namespace \
  --set ca.name="Internal CA" \
  --set ca.dns="step-ca.step-ca.svc.cluster.local" \
  --set ca.address=":9000" \
  --set service.targetPort=9000

# Verify installation
kubectl get pods -n step-ca
kubectl get svc -n step-ca
```

Initialize Step-CA:

```bash
# Get CA initialization password
CA_PASSWORD=$(kubectl get secrets -n step-ca step-certificates-ca-password \
  -o jsonpath='{.data.password}' | base64 -d)

# Initialize CA
kubectl exec -n step-ca step-ca-0 -- step ca init \
  --name="Internal CA" \
  --dns="step-ca.step-ca.svc.cluster.local" \
  --address=":9000" \
  --provisioner="acme" \
  --password-file=/home/step/secrets/passwords/password
```

## Configuring ACME Provisioner

Enable ACME provisioner in Step-CA:

```bash
# Add ACME provisioner
kubectl exec -n step-ca step-ca-0 -- step ca provisioner add acme --type ACME

# Verify provisioner
kubectl exec -n step-ca step-ca-0 -- step ca provisioner list
```

The ACME provisioner enables cert-manager to request certificates using standard ACME protocol.

## Retrieving Step-CA Root Certificate

cert-manager needs the Step-CA root certificate to trust the CA:

```bash
# Get root certificate from Step-CA
kubectl exec -n step-ca step-ca-0 -- \
  cat /home/step/certs/root_ca.crt > step-ca-root.crt

# Create ConfigMap with root certificate
kubectl create configmap step-ca-root \
  --from-file=root-ca.crt=step-ca-root.crt \
  -n cert-manager

# Encode root certificate for caBundle
CA_BUNDLE=$(base64 -w 0 step-ca-root.crt)
```

## Configuring cert-manager ClusterIssuer for Step-CA

Create a ClusterIssuer for Step-CA ACME endpoint:

```yaml
# step-ca-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: step-ca-acme
spec:
  acme:
    # Step-CA ACME endpoint
    server: https://step-ca.step-ca.svc.cluster.local:9000/acme/acme/directory

    # Email for certificate notifications
    email: certificates@example.com

    # ACME account private key secret
    privateKeySecretRef:
      name: step-ca-acme-account-key

    # Trust Step-CA root certificate
    caBundle: <BASE64_ENCODED_ROOT_CA>

    # Skip TLS verification if using self-signed Step-CA certificate
    # skipTLSVerify: true  # Use only for testing

    # Solvers for ACME challenges
    solvers:
    # HTTP-01 solver for internal domains
    - http01:
        ingress:
          class: nginx
```

Apply the ClusterIssuer:

```bash
# Update caBundle in the file with $CA_BUNDLE value
sed "s|<BASE64_ENCODED_ROOT_CA>|$CA_BUNDLE|g" step-ca-clusterissuer.yaml | \
  kubectl apply -f -

# Verify ClusterIssuer
kubectl get clusterissuer step-ca-acme
kubectl describe clusterissuer step-ca-acme
```

## Requesting Certificates from Step-CA

Request internal domain certificates:

```yaml
# internal-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-service-cert
  namespace: production
spec:
  secretName: internal-service-tls

  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  issuerRef:
    name: step-ca-acme
    kind: ClusterIssuer

  # Internal domain names
  commonName: service.internal.example.com
  dnsNames:
  - service.internal.example.com
  - service.production.svc.cluster.local
  - service.production

  privateKey:
    algorithm: ECDSA
    size: 256
    rotationPolicy: Always

  usages:
  - digital signature
  - key encipherment
  - server auth
```

Apply and verify:

```bash
kubectl apply -f internal-certificate.yaml

# Monitor certificate issuance
kubectl get certificate internal-service-cert -n production -w

# Verify certificate details
kubectl get secret internal-service-tls -n production \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

## Using Step-CA with DNS-01 Challenges

For wildcard certificates or domains without HTTP access, configure DNS-01:

First, configure Step-CA DNS provisioner:

```bash
# Configure DNS-01 provider in Step-CA
kubectl exec -n step-ca step-ca-0 -- step ca provisioner add acme-dns01 \
  --type ACME \
  --challenge dns-01
```

Update ClusterIssuer with DNS-01 solver:

```yaml
# step-ca-dns01-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: step-ca-dns01
spec:
  acme:
    server: https://step-ca.step-ca.svc.cluster.local:9000/acme/acme-dns01/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: step-ca-dns01-account-key
    caBundle: <BASE64_ENCODED_ROOT_CA>

    # DNS-01 solver (example with Route53)
    solvers:
    - dns01:
        route53:
          region: us-east-1
```

Request wildcard certificate:

```yaml
# wildcard-internal-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-internal-cert
  namespace: production
spec:
  secretName: wildcard-internal-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: step-ca-dns01
    kind: ClusterIssuer

  commonName: "*.internal.example.com"
  dnsNames:
  - "*.internal.example.com"
  - "internal.example.com"
```

## Configuring Step-CA Certificate Policies

Customize certificate policies in Step-CA:

```bash
# Access Step-CA configuration
kubectl exec -n step-ca step-ca-0 -- cat /home/step/config/ca.json

# Update certificate policies
kubectl exec -n step-ca step-ca-0 -- step ca provisioner update acme \
  --x509-min-dur=1h \
  --x509-max-dur=720h \
  --x509-default-dur=168h

# Reload Step-CA configuration
kubectl rollout restart statefulset/step-ca -n step-ca
```

This configures:
- Minimum certificate duration: 1 hour
- Maximum certificate duration: 30 days
- Default certificate duration: 7 days

## Step-CA with Kubernetes Service Mesh

Use Step-CA for service mesh certificate management:

```yaml
# mesh-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mesh-service-cert
  namespace: service-mesh
spec:
  secretName: mesh-service-tls

  # Short-lived certificates for mesh
  duration: 24h
  renewBefore: 8h

  issuerRef:
    name: step-ca-acme
    kind: ClusterIssuer

  # Service mesh identity
  commonName: mesh-service.service-mesh.svc.cluster.local
  dnsNames:
  - mesh-service.service-mesh.svc.cluster.local
  - mesh-service.service-mesh
  - mesh-service

  privateKey:
    algorithm: ECDSA
    size: 256
    rotationPolicy: Always

  # Both server and client authentication
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
```

## High Availability Step-CA Deployment

Deploy Step-CA in HA configuration:

```yaml
# step-ca-ha-values.yaml
replicaCount: 3

# Shared database for HA
ca:
  db:
    enabled: true
    persistent: true
    type: postgresql
    dataSource: "postgresql://step-ca:password@postgres:5432/step-ca?sslmode=require"

# Load balancer service
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
```

Deploy HA Step-CA:

```bash
helm upgrade step-ca smallstep/step-certificates \
  --namespace step-ca \
  --values step-ca-ha-values.yaml
```

## Monitoring Step-CA Integration

Monitor Step-CA certificate issuance:

```bash
# Check Step-CA logs
kubectl logs -n step-ca -l app=step-certificates -f

# View ACME account registrations
kubectl exec -n step-ca step-ca-0 -- \
  step ca admin list

# Monitor certificate requests
kubectl get certificaterequest --all-namespaces

# Check Step-CA metrics (if enabled)
kubectl port-forward -n step-ca svc/step-ca 9000:9000
curl http://localhost:9000/metrics
```

## Troubleshooting Step-CA Integration

### Certificate Issuance Fails

```bash
# Check ClusterIssuer status
kubectl describe clusterissuer step-ca-acme

# Verify Step-CA ACME endpoint accessible
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -k https://step-ca.step-ca.svc.cluster.local:9000/acme/acme/directory

# Check CA root certificate
kubectl get configmap step-ca-root -n cert-manager -o yaml
```

### ACME Challenge Failures

```bash
# View challenge details
kubectl get challenges --all-namespaces
kubectl describe challenge <challenge-name> -n <namespace>

# Check Step-CA provisioner configuration
kubectl exec -n step-ca step-ca-0 -- step ca provisioner list

# Verify HTTP-01 challenge accessibility
kubectl exec -n step-ca step-ca-0 -- \
  curl http://<domain>/.well-known/acme-challenge/<token>
```

### Certificate Renewal Issues

```bash
# Check certificate renewal settings
kubectl get certificate <cert-name> -n <namespace> -o yaml

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager | grep step-ca

# Verify Step-CA certificate duration limits
kubectl exec -n step-ca step-ca-0 -- step ca provisioner list
```

## Securing Step-CA

Implement security best practices for Step-CA:

```yaml
# step-ca-security-config.yaml
# Network policies restricting Step-CA access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: step-ca-netpol
  namespace: step-ca
spec:
  podSelector:
    matchLabels:
      app: step-certificates
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from cert-manager
  - from:
    - namespaceSelector:
        matchLabels:
          name: cert-manager
    ports:
    - protocol: TCP
      port: 9000
  # Allow from ingress controllers
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 9000
  egress:
  # Allow DNS
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
```

## Best Practices

Use Step-CA for internal domains and development environments. Let's Encrypt remains appropriate for public-facing domains.

Configure appropriate certificate validity periods. Internal certificates can have shorter lifetimes than public certificates.

Implement monitoring for Step-CA availability. It's a critical infrastructure component.

Back up Step-CA database and configuration regularly. Certificate authority data is critical.

Use HA deployment for production Step-CA installations. Single-point-of-failure CAs cause widespread outages.

Document Step-CA policies and procedures. Teams need to understand certificate issuance policies.

Test certificate rotation with short durations in development before production deployment.

## Conclusion

Step-CA provides a powerful, flexible certificate authority for internal Kubernetes certificate management. Integration with cert-manager enables ACME-based automation for internal domains, bringing the benefits of automated certificate management to private networks and air-gapped environments.

This combination is ideal for organizations requiring internal PKI with automated certificate lifecycle management, compliance with specific certificate policies, or deployment in environments where public certificate authorities are unavailable or inappropriate. The open-source nature and ACME protocol support make Step-CA an excellent choice for modern cloud-native infrastructure.
