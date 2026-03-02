# How to Use AWS ACM Certificates with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, ACM, TLS, Certificate, EKS

Description: How to use AWS Certificate Manager certificates with Istio ingress gateways on EKS for automated TLS certificate management.

---

AWS Certificate Manager (ACM) provides free, auto-renewing TLS certificates that are tightly integrated with AWS services. Using ACM certs with Istio is not as straightforward as it is with a plain ALB, because Istio normally manages its own TLS termination. But there are solid patterns for making this work, and the operational benefits of ACM's automatic renewal are worth the effort.

## Understanding the Challenge

ACM certificates cannot be exported. You cannot download the private key and mount it into an Istio gateway pod. AWS designed ACM specifically for use with AWS services like ALB, NLB, CloudFront, and API Gateway. The certificate and private key live inside AWS infrastructure and never leave it.

This means you have two main approaches:

1. Use an NLB or ALB with ACM for TLS termination in front of Istio
2. Use ACM Private CA to issue certificates that you can use inside Kubernetes

## Approach 1: NLB TLS Termination with ACM

This is the most common approach. You configure the NLB to terminate TLS using an ACM certificate, then forward plain HTTP or re-encrypted traffic to Istio.

First, request or import a certificate in ACM:

```bash
aws acm request-certificate \
  --domain-name "app.example.com" \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS
```

Complete the DNS validation by adding the CNAME record that ACM provides. Once validated, note the certificate ARN.

Configure the Istio ingress gateway with the NLB TLS annotation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "external"
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
          service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
          service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
          service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy: "ELBSecurityPolicy-TLS13-1-2-2021-06"
          service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
        service:
          ports:
          - name: https
            port: 443
            targetPort: 8080
            protocol: TCP
          - name: http
            port: 80
            targetPort: 8080
            protocol: TCP
```

The important detail here is that port 443 on the NLB terminates TLS and forwards decrypted traffic to port 8080 on the Istio gateway. The `ssl-negotiation-policy` controls which TLS versions and ciphers the NLB accepts.

Now configure the Istio Gateway to accept plain HTTP:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
    - "api.example.com"
```

## Approach 2: ALB with ACM Certificate

If you are using an ALB instead of NLB, the ACM integration is even simpler. Reference the certificate ARN in the Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-alb-ingress
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443},{"HTTP":80}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
    alb.ingress.kubernetes.io/healthcheck-port: "15021"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: istio-ingressgateway
            port:
              number: 8080
```

## Approach 3: ACM Private CA with cert-manager

If you want Istio to handle TLS termination (not the load balancer), you can use ACM Private CA to issue certificates that cert-manager pulls into Kubernetes secrets.

First, create a Private CA in ACM:

```bash
aws acm-pca create-certificate-authority \
  --certificate-authority-configuration \
  "KeyAlgorithm=RSA_2048,SigningAlgorithm=SHA256WITHRSA,Subject={CommonName=MyCompany Internal CA,Organization=MyCompany}" \
  --certificate-authority-type SUBORDINATE
```

Install the AWS PCA Issuer plugin for cert-manager:

```bash
helm repo add awspca https://cert-manager.github.io/aws-privateca-issuer
helm install aws-pca-issuer awspca/aws-privateca-issuer -n cert-manager
```

Create the issuer:

```yaml
apiVersion: awspca.cert-manager.io/v1beta1
kind: AWSPCAClusterIssuer
metadata:
  name: aws-pca-issuer
spec:
  arn: arn:aws:acm-pca:us-east-1:123456789:certificate-authority/abc-123
  region: us-east-1
```

Now request certificates that land in Kubernetes secrets:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: istio-system
spec:
  secretName: app-tls-credential
  issuerRef:
    name: aws-pca-issuer
    kind: AWSPCAClusterIssuer
    group: awspca.cert-manager.io
  dnsNames:
  - "app.example.com"
  - "api.example.com"
  duration: 2160h
  renewBefore: 360h
```

Then use it in the Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-credential
    hosts:
    - "app.example.com"
    - "api.example.com"
```

## Multiple Certificates on One Gateway

You can attach multiple ACM certificates to a single NLB by specifying multiple ARNs:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:123456789:certificate/abc-123,arn:aws:acm:us-east-1:123456789:certificate/def-456"
```

The NLB uses SNI to select the right certificate based on the hostname the client connects to. This works well when you have certificates for different domains.

## Certificate Renewal

One of the biggest advantages of ACM is automatic renewal. For DNS-validated certificates, ACM renews them automatically before they expire - you never have to think about it. This eliminates the common operational headache of expired certificates.

For the Private CA approach with cert-manager, cert-manager handles the renewal based on the `renewBefore` field in the Certificate resource. When the certificate gets close to expiry, cert-manager requests a new one from ACM PCA and updates the Kubernetes secret. Istio's SDS (Secret Discovery Service) picks up the new certificate and applies it without restarting the gateway.

## Security Considerations

When using NLB TLS termination with ACM, traffic between the NLB and the Istio gateway is unencrypted within your VPC. For most organizations, this is acceptable because VPC traffic is isolated. But if your compliance requirements demand encryption everywhere, use the Private CA approach so Istio handles TLS termination end-to-end.

Also, make sure the IAM role for the AWS Load Balancer Controller has the `acm:DescribeCertificate` and `acm:ListCertificates` permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "acm:DescribeCertificate",
    "acm:ListCertificates",
    "acm:GetCertificate"
  ],
  "Resource": "*"
}
```

## Verifying the Setup

Check that the NLB is using the ACM certificate:

```bash
aws elbv2 describe-listeners \
  --load-balancer-arn <nlb-arn> \
  --query 'Listeners[].Certificates'
```

Test TLS connectivity:

```bash
openssl s_client -connect app.example.com:443 -servername app.example.com
```

You should see the ACM certificate details in the output.

ACM certificates with Istio give you the best of both worlds: AWS-managed certificate lifecycle with Istio's powerful traffic management. Whether you go with NLB TLS termination for simplicity or Private CA for full Istio-managed TLS, the end result is a production setup where you never worry about certificate expiry again.
