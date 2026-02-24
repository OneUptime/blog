# How to Configure DNS for Istio Telemetry Addon Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Telemetry, Kubernetes, Networking

Description: How to set up DNS records for accessing Istio telemetry dashboards through custom domain names with manual and automated approaches.

---

Once you have exposed your Istio telemetry addons through the ingress gateway, you need DNS records pointing to that gateway. Without proper DNS, your team ends up accessing dashboards through raw IP addresses, which is ugly, hard to remember, and breaks when the IP changes.

This guide covers setting up DNS for telemetry addon access, from manual record creation to fully automated DNS management with external-dns.

## Understanding the Setup

The typical flow looks like this: a user types `grafana.monitoring.example.com` in their browser, DNS resolves that to the Istio ingress gateway's external IP, the gateway matches the hostname and routes to the Grafana service.

For this to work, you need:
1. An Istio Gateway resource configured for the hostnames
2. VirtualService resources routing to each addon
3. DNS records pointing the hostnames to the gateway IP

The first two steps should already be done. This guide focuses on the DNS part.

## Finding Your Ingress Gateway IP

First, get the external IP or hostname of your ingress gateway:

```bash
kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0]}'
```

On most cloud providers, this returns an IP address. On AWS with an ELB, it returns a hostname like `a1b2c3d4e5f6g7.us-east-1.elb.amazonaws.com`.

Store it in a variable:

```bash
# For IP-based (GKE, AKS, DigitalOcean)
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# For hostname-based (AWS)
export GATEWAY_HOSTNAME=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

## Manual DNS Configuration

### A Records (IP-based)

If your gateway has an IP address, create A records. The exact steps depend on your DNS provider, but the records should look like:

```
grafana.monitoring.example.com    A    <GATEWAY_IP>
kiali.monitoring.example.com      A    <GATEWAY_IP>
prometheus.monitoring.example.com A    <GATEWAY_IP>
jaeger.monitoring.example.com     A    <GATEWAY_IP>
```

If you want to avoid creating separate records for each addon, use a wildcard:

```
*.monitoring.example.com    A    <GATEWAY_IP>
```

This routes all subdomains of `monitoring.example.com` to the gateway. The Istio Gateway and VirtualService resources handle the rest of the routing.

### CNAME Records (hostname-based)

If your gateway has a hostname (AWS), use CNAME records:

```
grafana.monitoring.example.com    CNAME    a1b2c3d4.us-east-1.elb.amazonaws.com
kiali.monitoring.example.com      CNAME    a1b2c3d4.us-east-1.elb.amazonaws.com
```

Or a wildcard CNAME:

```
*.monitoring.example.com    CNAME    a1b2c3d4.us-east-1.elb.amazonaws.com
```

### Alias Records (AWS Route 53)

If you use Route 53 and your ingress is an AWS load balancer, use Alias records instead of CNAMEs. Alias records are free and work at the zone apex:

```bash
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "grafana.monitoring.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "a1b2c3d4.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Automated DNS with external-dns

Manual DNS works but does not scale. When the ingress gateway IP changes (after a cluster rebuild, for example), you have to update records manually. The external-dns project automates this.

### Install external-dns

Deploy external-dns to watch your Kubernetes resources and automatically create DNS records:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.14.0
          args:
            - --source=istio-virtualservice
            - --source=istio-gateway
            - --domain-filter=monitoring.example.com
            - --provider=aws
            - --registry=txt
            - --txt-owner-id=my-cluster
```

The `--source=istio-virtualservice` flag tells external-dns to watch Istio VirtualService resources and create DNS records for the hostnames defined in them. The `--domain-filter` restricts which domains external-dns can manage.

### Configure Cloud Provider Credentials

For AWS, attach an IAM policy to the external-dns service account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/Z1234567890"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets"
      ],
      "Resource": ["*"]
    }
  ]
}
```

For GCP, create a service account with the `dns.admin` role and provide the credentials as a secret. For Azure, use a managed identity with DNS Zone Contributor role.

### Annotate Your VirtualServices

External-dns picks up hostnames from VirtualService resources automatically. No additional annotations are needed if you have the `--source=istio-virtualservice` flag set.

Verify it is working by checking external-dns logs:

```bash
kubectl logs -l app=external-dns -n kube-system --tail=50
```

You should see log lines showing record creation for each hostname in your VirtualServices.

## Using CoreDNS for Internal DNS

If your telemetry dashboards should only be accessible from within the cluster or your corporate network, you can configure CoreDNS instead of public DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  monitoring.server: |
    monitoring.example.com:53 {
      hosts {
        10.96.0.100 grafana.monitoring.example.com
        10.96.0.101 kiali.monitoring.example.com
        10.96.0.102 prometheus.monitoring.example.com
        10.96.0.103 jaeger.monitoring.example.com
        fallthrough
      }
    }
```

This only works for clients that use the cluster's DNS resolver, which typically means pods inside the cluster or machines on a VPN that forwards DNS queries to CoreDNS.

## Verifying DNS Resolution

After setting up records, verify they resolve correctly:

```bash
# Check A record
dig grafana.monitoring.example.com A +short

# Check from inside the cluster
kubectl run dns-test --rm -it --image=busybox -- nslookup grafana.monitoring.example.com

# Test connectivity
curl -I https://grafana.monitoring.example.com
```

If DNS resolves but connections fail, check that your Istio Gateway has the hostname listed in its `hosts` field and that the TLS certificate covers that hostname.

## DNS TTL Considerations

When setting up records, keep TTL values reasonable:

- During initial setup, use a low TTL (60 seconds) so changes propagate quickly
- Once everything is stable, increase to 300-600 seconds
- If using external-dns, the default TTL is usually 300 seconds

For wildcard records, remember that they only match one level of subdomain. `*.monitoring.example.com` matches `grafana.monitoring.example.com` but not `v2.grafana.monitoring.example.com`.

## Summary

For most setups, the combination of wildcard DNS and external-dns gives you the best experience. You define hostnames in your Istio VirtualService resources, external-dns automatically creates the DNS records, and your team gets friendly URLs for every telemetry dashboard. When you add a new addon or change a hostname, DNS updates automatically without any manual intervention.
