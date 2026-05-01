# How to Configure Egress Gateway in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Egress Gateway, Network, Calico, Kubernetes, Security

Description: Configure an egress gateway in Rancher to route outbound traffic from specific namespaces or pods through a dedicated IP for firewall whitelisting and compliance.

## Introduction

Egress gateways provide a fixed, predictable source IP for outbound connections from Kubernetes pods. In regulated environments, external firewalls require whitelisted source IPs. Without explicit egress controls, outbound traffic usually leaves through node IPs that vary with pod scheduling, making firewall rules unstable.

## Use Cases

- Whitelisting Kubernetes workloads at external firewalls
- Compliance requirements for predictable outbound IPs
- Network monitoring and auditing
- Connecting to third-party APIs that require IP whitelisting

## Option 1: Calico Egress Gateway

Calico Open Source does not support egress gateways. This option requires Calico Enterprise or Calico Cloud.

```bash
kubectl patch felixconfiguration default --type='merge' -p \
  '{"spec":{"egressIPSupport":"EnabledPerNamespace"}}'
```

```yaml
# Create a dedicated egress IP pool and gateway
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: egress-ippool-1
spec:
  cidr: 10.10.10.0/30
  blockSize: 32
  nodeSelector: "!all()"
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    egress.projectcalico.org/selector: "projectcalico.org/egw == 'egress-gateway'"
---
apiVersion: operator.tigera.io/v1
kind: EgressGateway
metadata:
  name: egress-gateway
  namespace: production
spec:
  replicas: 1
  ipPools:
    - name: egress-ippool-1
```

## Option 2: Istio Egress Gateway

If Istio and the `istio-egressgateway` component are installed in your cluster, place the gateway on nodes with the outbound IP you want to whitelist and route traffic through it:

```yaml
# istio-egress-gateway.yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-service
  namespace: production
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      hosts:
        - api.external-service.com
      tls:
        mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: egress-gateway-for-external-service
  namespace: production
spec:
  host: istio-egressgateway.istio-system.svc.cluster.local
  subsets:
    - name: external-service
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: direct-external-service-through-egress
  namespace: production
spec:
  hosts:
    - api.external-service.com
  gateways:
    - mesh
    - istio-system/egress-gateway
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - api.external-service.com
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            subset: external-service
            port:
              number: 443
    - match:
        - gateways:
            - istio-system/egress-gateway
          port: 443
          sniHosts:
            - api.external-service.com
      route:
        - destination:
            host: api.external-service.com
            port:
              number: 443
```

## Option 3: Squid Egress Proxy

A simpler approach using Squid as an HTTP/HTTPS egress proxy:

```yaml
# squid-egress-proxy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: egress-proxy-config
  namespace: kube-system
data:
  squid.conf: |
    http_port 3128
    acl localnet src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
    acl SSL_ports port 443
    acl Safe_ports port 80 443 1025-65535
    http_access deny !Safe_ports
    http_access deny CONNECT !SSL_ports
    http_access allow localnet
    http_access deny all
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: egress-proxy
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: egress-proxy
  template:
    metadata:
      labels:
        app: egress-proxy
    spec:
      # Pin to nodes with the outbound IP you want to whitelist
      nodeSelector:
        egress-node: "true"
      containers:
        - name: squid
          image: ubuntu/squid:latest
          ports:
            - containerPort: 3128
          volumeMounts:
            - name: squid-config
              mountPath: /etc/squid/squid.conf
              subPath: squid.conf
      volumes:
        - name: squid-config
          configMap:
            name: egress-proxy-config
---
apiVersion: v1
kind: Service
metadata:
  name: egress-proxy
  namespace: kube-system
spec:
  selector:
    app: egress-proxy
  ports:
    - port: 3128
      targetPort: 3128
```

## Configure Pods to Use Egress Proxy

For applications that honor proxy environment variables:

```yaml
# Pod environment variables
env:
  - name: http_proxy
    value: "http://egress-proxy.kube-system.svc.cluster.local:3128"
  - name: https_proxy
    value: "http://egress-proxy.kube-system.svc.cluster.local:3128"
  - name: no_proxy
    value: "localhost,127.0.0.1,.svc,.cluster.local"
  - name: HTTP_PROXY
    value: "http://egress-proxy.kube-system.svc.cluster.local:3128"
  - name: HTTPS_PROXY
    value: "http://egress-proxy.kube-system.svc.cluster.local:3128"
  - name: NO_PROXY
    value: "localhost,127.0.0.1,.svc,.cluster.local"
```

## Conclusion

Egress gateways in Rancher solve the compliance challenge of unpredictable outbound IPs from Kubernetes pods. The right solution depends on your stack: Calico Enterprise or Calico Cloud can provide native egress gateways, Istio users can route selected traffic through the built-in egress gateway, and simpler deployments can use a forward proxy approach such as Squid.
