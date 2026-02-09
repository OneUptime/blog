# How to Troubleshoot Pod Unable to Reach External Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Troubleshooting

Description: Diagnose and fix connectivity issues when Kubernetes pods cannot reach external endpoints, APIs, or internet services.

---

When pods cannot reach external endpoints, applications fail to communicate with third-party APIs, databases, or internet services. These failures manifest as connection timeouts, DNS resolution errors, or TLS handshake failures. The challenge is determining whether the problem lies in network routing, DNS configuration, firewall rules, NetworkPolicies, or the external endpoint itself.

Systematic troubleshooting isolates the issue by testing each layer of the network stack and identifying where external connectivity breaks down.

## Testing Basic External Connectivity

Start with simple connectivity tests to external endpoints:

```bash
# Test basic internet connectivity
kubectl exec -it my-pod -- ping -c 4 8.8.8.8

# Test connectivity to external hostname
kubectl exec -it my-pod -- ping -c 4 google.com

# Test HTTP connectivity
kubectl exec -it my-pod -- curl -v https://www.google.com

# Test specific API endpoint
kubectl exec -it my-pod -- curl -v https://api.example.com/health
```

If ping to IP addresses works but hostnames fail, the issue is DNS. If nothing works, the problem is network routing or egress configuration.

## Checking DNS Resolution

DNS failures prevent pods from resolving external hostnames:

```bash
# Test DNS resolution for external domain
kubectl exec -it my-pod -- nslookup google.com

# Use dig for detailed DNS information
kubectl exec -it my-pod -- dig google.com

# Check DNS configuration
kubectl exec -it my-pod -- cat /etc/resolv.conf

# Should show cluster DNS (typically 10.96.0.10)
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
```

If /etc/resolv.conf is missing or incorrect, the pod's DNS configuration is broken.

## Verifying External DNS Resolution

Cluster DNS must forward external queries correctly:

```bash
# Test from pod using cluster DNS
kubectl exec -it my-pod -- nslookup google.com

# Test using external DNS directly
kubectl exec -it my-pod -- nslookup google.com 8.8.8.8

# If external DNS works but cluster DNS fails,
# check CoreDNS forwarding configuration

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

CoreDNS must be configured to forward external queries to upstream DNS servers.

## Checking NetworkPolicy Egress Rules

NetworkPolicies can block egress traffic to external endpoints:

```bash
# Check if NetworkPolicies select your pod
kubectl get networkpolicies -n my-namespace

# Describe policies to see egress rules
kubectl describe networkpolicy -n my-namespace

# Look for egress rules
# If no egress rules exist but policy has policyTypes: Egress,
# all egress is blocked by default
```

Example NetworkPolicy blocking external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-external
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}  # Only allows pod-to-pod
    # Missing external egress rules blocks internet access
```

Fix by adding egress rules for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}  # Allow pod-to-pod
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53  # Allow DNS
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # Block metadata service
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

## Verifying NAT and Source IP

Pods use NAT to access external endpoints. Verify NAT is working:

```bash
# Check pod's source IP when accessing external service
kubectl exec -it my-pod -- curl ifconfig.me

# Should return node's public IP, not pod IP

# If it returns pod IP, NAT is not working
# Check CNI plugin configuration and cloud provider NAT setup
```

Without proper NAT, external services receive requests from non-routable pod IPs and cannot respond.

## Testing from Node Directly

Compare pod behavior with node behavior:

```bash
# Test from pod
kubectl exec -it my-pod -- curl -v https://api.example.com

# Test from node
kubectl debug node/my-node -it --image=nicolaka/netshoot
curl -v https://api.example.com

# If node works but pod fails, issue is with pod networking
# If both fail, issue is with node or cluster egress configuration
```

This isolates whether the problem is pod-specific or affects the entire node.

## Checking Cloud Provider Firewall Rules

Cloud provider firewalls may block outbound traffic:

```bash
# For AWS, check security group egress rules
aws ec2 describe-security-groups --group-ids sg-xxxxx | grep -i egress

# Should allow outbound traffic on ports 80, 443
# Example rule:
# IpProtocol: tcp, FromPort: 443, ToPort: 443, CidrIp: 0.0.0.0/0

# For GCP, check firewall rules
gcloud compute firewall-rules list --filter="direction=EGRESS"

# For Azure, check NSG outbound rules
az network nsg rule list --nsg-name CLUSTER-NSG --resource-group RG
```

Restrictive egress rules block pods from reaching external endpoints.

## Verifying NAT Gateway or Internet Gateway

Clusters need internet access infrastructure:

```bash
# For AWS, verify NAT Gateway exists for private subnets
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-xxxxx"

# Check route tables point to NAT Gateway
aws ec2 describe-route-tables --filter "Name=vpc-id,Values=vpc-xxxxx"

# For public subnets, verify Internet Gateway exists
aws ec2 describe-internet-gateways --filter "Name=attachment.vpc-id,Values=vpc-xxxxx"

# For GCP, check Cloud NAT configuration
gcloud compute routers nats list --router=ROUTER-NAME

# For Azure, check NAT Gateway or Azure Firewall
az network nat gateway list --resource-group RG
```

Without NAT Gateway or Internet Gateway, pods cannot reach external endpoints.

## Testing with Different Protocols

Different protocols may have different connectivity:

```bash
# Test HTTP (port 80)
kubectl exec -it my-pod -- curl -v http://example.com

# Test HTTPS (port 443)
kubectl exec -it my-pod -- curl -v https://example.com

# Test custom port
kubectl exec -it my-pod -- nc -zv api.example.com 8443

# Test UDP
kubectl exec -it my-pod -- nc -u -zv ntp.ubuntu.com 123
```

If only certain ports fail, NetworkPolicies or firewall rules are blocking specific traffic.

## Checking TLS/SSL Issues

TLS problems prevent HTTPS connections:

```bash
# Test TLS connection
kubectl exec -it my-pod -- openssl s_client -connect api.example.com:443

# Check if certificate validation fails
kubectl exec -it my-pod -- curl -v https://api.example.com

# Test without certificate validation
kubectl exec -it my-pod -- curl -k https://api.example.com

# If -k works but normal curl fails, certificate validation is the issue
```

Common TLS issues include expired certificates, hostname mismatches, or missing CA certificates.

## Verifying CA Certificates

Pods need CA certificates to validate TLS connections:

```bash
# Check if CA certificates exist in pod
kubectl exec -it my-pod -- ls /etc/ssl/certs/

# Should contain ca-certificates.crt or similar

# Test with specific CA bundle
kubectl exec -it my-pod -- curl --cacert /etc/ssl/certs/ca-certificates.crt \
  https://api.example.com

# Update CA certificates if needed (in container)
kubectl exec -it my-pod -- update-ca-certificates
```

Missing or outdated CA certificates cause TLS validation failures.

## Testing Proxy Configuration

Corporate environments may require HTTP proxies:

```bash
# Check if proxy environment variables are set
kubectl exec -it my-pod -- env | grep -i proxy

# Should see HTTP_PROXY, HTTPS_PROXY, NO_PROXY if proxy is used

# Test with proxy
kubectl exec -it my-pod -- sh -c \
  'HTTP_PROXY=http://proxy.company.com:8080 curl https://api.example.com'

# Configure proxy in pod spec if needed
```

Missing proxy configuration prevents external access in proxy-required environments.

## Checking MTU Issues

MTU problems cause connection failures with large requests:

```bash
# Test small request
kubectl exec -it my-pod -- curl https://api.example.com/small

# Test large request
kubectl exec -it my-pod -- curl https://api.example.com/large-response

# If large requests fail but small succeed, MTU is likely the issue

# Test with different packet sizes
kubectl exec -it my-pod -- ping -M do -s 1400 api.example.com
kubectl exec -it my-pod -- ping -M do -s 1450 api.example.com
```

Configure appropriate MTU for your CNI plugin to fix this.

## Analyzing Traffic with tcpdump

Capture traffic to see exactly what happens:

```bash
# Attach debug container
kubectl debug -it pod/my-pod --image=nicolaka/netshoot --target=my-pod-container

# Capture traffic to external endpoint
tcpdump -i any -n host api.example.com

# From another terminal, test connection
kubectl exec -it my-pod -- curl https://api.example.com

# Look for:
# - DNS queries (should see UDP port 53)
# - TCP SYN packets (initiating connection)
# - TCP responses (or lack thereof)
# - TLS handshake
```

Packet capture reveals exactly where communication fails.

## Checking for IP Whitelisting

External services may whitelist source IPs:

```bash
# Find your cluster's egress IP
kubectl run test-pod --rm -it --image=curlimages/curl -- curl ifconfig.me

# This shows the IP that external services see
# Ensure this IP is whitelisted at the external endpoint

# For clusters with multiple egress IPs, test from different nodes
```

Contact the external service provider to whitelist your egress IPs if needed.

## Testing DNS Resolution Path

Verify the complete DNS resolution chain:

```bash
# Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Should have forward directive for external domains
# forward . /etc/resolv.conf

# Check what DNS servers CoreDNS uses
kubectl exec -n kube-system coredns-xxx -- cat /etc/resolv.conf

# Test resolution through entire chain
kubectl exec -it my-pod -- dig google.com +trace
```

Broken DNS forwarding prevents external hostname resolution.

## Checking Service Mesh Egress

Service meshes control egress traffic:

```bash
# For Istio, check if external access is allowed
kubectl get serviceentry

# Create ServiceEntry for external endpoint
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS

# Apply and test
kubectl apply -f serviceentry.yaml
```

Service meshes require explicit configuration for external access.

## Verifying kube-proxy Configuration

kube-proxy settings affect egress:

```bash
# Check masquerade configuration
kubectl get configmap kube-proxy -n kube-system -o yaml | grep masqueradeAll

# If false, only pod CIDR traffic is masqueraded
# External traffic might use pod IPs without NAT

# Check cluster CIDR configuration
kubectl cluster-info dump | grep -i cidr
```

Incorrect kube-proxy masquerading breaks external connectivity.

## Creating Comprehensive Test

Build a comprehensive connectivity test:

```bash
#!/bin/bash
# test-external-connectivity.sh

echo "=== Testing DNS ==="
kubectl exec -it $POD -- nslookup google.com

echo "=== Testing ICMP ==="
kubectl exec -it $POD -- ping -c 3 8.8.8.8

echo "=== Testing HTTP ==="
kubectl exec -it $POD -- curl -v http://example.com

echo "=== Testing HTTPS ==="
kubectl exec -it $POD -- curl -v https://www.google.com

echo "=== Testing External API ==="
kubectl exec -it $POD -- curl -v https://api.example.com/health

echo "=== Checking Source IP ==="
kubectl exec -it $POD -- curl ifconfig.me
```

This script systematically tests all aspects of external connectivity.

## Conclusion

Pods failing to reach external endpoints stems from various causes including NetworkPolicy egress restrictions, cloud provider firewall rules, missing NAT infrastructure, DNS configuration issues, TLS certificate problems, or external service IP whitelisting. Systematic troubleshooting tests basic connectivity, verifies DNS resolution, checks NetworkPolicies and firewall rules, validates NAT configuration, and examines TLS setup.

Start with simple tests like ping and curl to establish whether any external connectivity works. Then narrow down the specific failure by testing DNS, different protocols, and comparing pod behavior with node behavior. Use packet captures to see exactly what happens at the network level when external connections fail.

Most external connectivity issues resolve by adjusting NetworkPolicies to allow egress, fixing cloud provider firewall rules, ensuring NAT infrastructure exists, or configuring proper DNS forwarding. Master these troubleshooting techniques, and you will keep your pods connected to the external services they depend on.
