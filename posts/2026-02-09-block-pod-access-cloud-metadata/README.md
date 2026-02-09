# How to Block Kubernetes Pod Access to Cloud Provider Metadata Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Cloud

Description: Learn how to prevent pods from accessing cloud provider metadata endpoints to protect against credential theft and privilege escalation attacks in Kubernetes.

---

Cloud provider metadata endpoints expose sensitive information including instance credentials, SSH keys, and configuration data. Kubernetes pods can access these endpoints by default, creating a security risk where compromised containers could steal credentials or escalate privileges. Blocking metadata access is a critical security measure for production Kubernetes clusters running on AWS, GCP, Azure, or other cloud providers.

This guide will show you how to implement multiple layers of defense to prevent unauthorized metadata access while allowing legitimate workloads to use cloud provider APIs securely.

## Understanding the Metadata Endpoint Risk

Cloud providers expose metadata services at well-known IP addresses that instances can query without authentication. On AWS, the metadata service at `169.254.169.254` provides IAM credentials for the instance role. On GCP, `169.254.169.254/computeMetadata/v1/` exposes service account tokens. Azure uses `169.254.169.254/metadata/` for similar purposes.

When pods run with host networking or can access the node's network namespace, they can query these endpoints. A compromised container could retrieve instance credentials and use them to access cloud resources beyond its intended permissions, bypassing pod-level security controls.

## Blocking Metadata Access with Network Policies

The most effective defense is preventing network access to metadata endpoints. Network policies can block egress traffic to the metadata IP:

```yaml
# block-metadata-access.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-metadata-endpoint
  namespace: production
spec:
  # Apply to all pods in namespace
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Block access to cloud metadata IP
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # Block AWS/GCP/Azure metadata
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow all other traffic (adjust as needed)
  - to:
    - podSelector: {}
```

This policy blocks access to the metadata endpoint while allowing other network traffic. Apply it to sensitive namespaces:

```bash
kubectl apply -f block-metadata-access.yaml

# Verify policy is active
kubectl get networkpolicy -n production

# Test that metadata access is blocked
kubectl run test -n production --image=curlimages/curl --rm -it -- \
  curl -m 5 http://169.254.169.254/latest/meta-data/
# Should timeout or fail
```

Note that network policies require a CNI that supports them, such as Calico, Cilium, or Weave Net.

## Using Calico GlobalNetworkPolicy

For cluster-wide enforcement, use Calico's GlobalNetworkPolicy:

```yaml
# global-block-metadata.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-cloud-metadata
spec:
  # Apply to all pods except those with specific label
  selector: has(block-metadata)
  order: 100
  types:
  - Egress
  egress:
  # Deny metadata endpoint
  - action: Deny
    protocol: TCP
    destination:
      nets:
      - 169.254.169.254/32
  # Allow everything else
  - action: Allow
```

Label namespaces to enforce the policy:

```bash
# Install Calico CLI
curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/

# Apply global policy
calicoctl apply -f global-block-metadata.yaml

# Label namespaces for enforcement
kubectl label namespace production block-metadata=true
kubectl label namespace staging block-metadata=true

# Exempt specific pods that need metadata access
kubectl label pod trusted-pod -n production block-metadata-
```

## Implementing IP Tables Rules on Nodes

For defense in depth, configure iptables on nodes to block metadata access:

```bash
# Add iptables rule to drop metadata traffic from containers
sudo iptables -I FORWARD -s 10.0.0.0/8 -d 169.254.169.254/32 -j DROP

# Make rule persistent (Ubuntu/Debian)
sudo apt-get install iptables-persistent
sudo netfilter-persistent save

# For systemd-based persistence, create service
cat <<EOF | sudo tee /etc/systemd/system/block-metadata.service
[Unit]
Description=Block Cloud Metadata Access
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables -I FORWARD -s 10.0.0.0/8 -d 169.254.169.254/32 -j DROP
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable block-metadata.service
sudo systemctl start block-metadata.service
```

This creates a kernel-level block that prevents container traffic from reaching the metadata endpoint.

## Using Cilium Network Policies

Cilium provides Layer 7 network policies with more granular control:

```yaml
# cilium-block-metadata.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: block-metadata-endpoint
  namespace: production
spec:
  endpointSelector: {}
  egress:
  # Block metadata endpoint explicitly
  - toCIDR:
    - 169.254.169.254/32
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
    action: Deny
  # Allow other egress traffic
  - toEntities:
    - world
    - cluster
```

Apply the policy:

```bash
kubectl apply -f cilium-block-metadata.yaml

# Verify with Cilium CLI
cilium policy get -n production

# Test enforcement
kubectl run test -n production --image=nicolaka/netshoot --rm -it -- \
  curl -v --max-time 5 http://169.254.169.254/
```

## AWS-Specific: Requiring IMDSv2

On AWS, enable IMDSv2 which requires session tokens and prevents simple HTTP requests:

```bash
# Require IMDSv2 on EC2 instances
aws ec2 modify-instance-metadata-options \
  --instance-id i-1234567890abcdef0 \
  --http-tokens required \
  --http-endpoint enabled

# Apply to all instances in Auto Scaling group
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template LaunchTemplateId=lt-xxx,Version='$Latest'

# Update launch template to require IMDSv2
aws ec2 modify-launch-template \
  --launch-template-id lt-xxx \
  --default-version '$Latest' \
  --launch-template-data '{"MetadataOptions":{"HttpTokens":"required","HttpEndpoint":"enabled"}}'
```

IMDSv2 requires a two-step process to retrieve credentials, making it harder to exploit:

```bash
# IMDSv2 requires getting a token first
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Then use token in subsequent requests
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/
```

Most container images won't have the logic to perform this two-step process, effectively blocking access.

## GCP-Specific: Metadata Concealment

On GKE, enable metadata concealment to hide node metadata from pods:

```bash
# Create GKE cluster with metadata concealment
gcloud container clusters create secure-cluster \
  --region us-central1 \
  --enable-ip-alias \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --enable-shielded-nodes \
  --shielded-secure-boot \
  --shielded-integrity-monitoring \
  --metadata-from-file=disable-legacy-endpoints=true

# Enable on existing cluster
gcloud container clusters update existing-cluster \
  --region us-central1 \
  --enable-shielded-nodes

# Update node pool
gcloud container node-pools update default-pool \
  --cluster=existing-cluster \
  --region=us-central1 \
  --workload-metadata=GKE_METADATA
```

With `GKE_METADATA` mode, pods cannot access the VM's service account credentials via metadata endpoint. They must use Workload Identity instead.

## Azure-Specific: Instance Metadata Service Protection

On AKS, restrict IMDS access using NSGs and network policies:

```bash
# Create NSG rule to restrict metadata access
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name BlockMetadataFromContainers \
  --priority 100 \
  --source-address-prefixes VirtualNetwork \
  --destination-address-prefixes 169.254.169.254/32 \
  --destination-port-ranges '*' \
  --direction Outbound \
  --access Deny \
  --protocol '*'
```

Configure AKS to use managed identity instead of IMDS for pod authentication:

```bash
# Enable workload identity on AKS
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-oidc-issuer \
  --enable-workload-identity
```

## Allowing Specific Pods to Access Metadata

Some legitimate workloads need metadata access. Create exceptions using labels:

```yaml
# allow-metadata-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-metadata-for-trusted
  namespace: system
spec:
  podSelector:
    matchLabels:
      metadata-access: allowed
  policyTypes:
  - Egress
  egress:
  # Allow all egress including metadata
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
```

Label trusted pods:

```bash
# Allow cluster autoscaler to access metadata
kubectl label pod cluster-autoscaler -n kube-system metadata-access=allowed

# Allow cloud-controller-manager
kubectl label pod cloud-controller-manager -n kube-system metadata-access=allowed
```

## Monitoring Metadata Access Attempts

Set up logging to detect attempted metadata access:

```bash
# On nodes, log dropped packets
sudo iptables -I FORWARD -s 10.0.0.0/8 -d 169.254.169.254/32 -j LOG --log-prefix "METADATA-BLOCK: "

# View logs
sudo tail -f /var/log/kern.log | grep METADATA-BLOCK

# Forward to centralized logging
# Configure fluentd or similar to capture these logs
```

For Cilium, enable Hubble for network visibility:

```bash
# Install Hubble CLI
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin

# Enable Hubble
cilium hubble enable

# Monitor denied metadata access
hubble observe --verdict DROPPED --to-ip 169.254.169.254
```

## Testing Your Metadata Block

Verify that metadata access is properly blocked:

```bash
# Test from a pod without metadata-access label
kubectl run metadata-test --image=curlimages/curl --rm -it -- \
  curl -v --max-time 5 http://169.254.169.254/latest/meta-data/

# Should fail with timeout or connection refused

# Test from different namespaces
kubectl run metadata-test -n production --image=curlimages/curl --rm -it -- \
  curl -v --max-time 5 http://169.254.169.254/latest/meta-data/

# Verify allowed pods can still access (if exceptions configured)
kubectl run metadata-test -n system \
  --labels="metadata-access=allowed" \
  --image=curlimages/curl --rm -it -- \
  curl -v --max-time 5 http://169.254.169.254/latest/meta-data/
```

## Best Practices

Implement multiple layers of defense: network policies, node-level iptables, and cloud-provider specific protections. Block metadata access by default and explicitly allow only trusted workloads that require it. Use cloud-native identity mechanisms like IRSA, Workload Identity, or Azure AD Workload Identity instead of instance credentials.

Regularly audit which pods have metadata access permissions. Monitor and alert on attempts to access metadata endpoints, as these may indicate compromise. Test your blocking mechanisms regularly to ensure they remain effective as your cluster evolves.

Document why specific pods need metadata access and review these exceptions periodically. Use the principle of least privilege, granting access only to pods that absolutely require it.

## Conclusion

Blocking access to cloud metadata endpoints is a critical security control for Kubernetes clusters. By preventing pods from accessing instance credentials, you eliminate a common privilege escalation vector and reduce the blast radius of container compromises.

Implement network policies as your primary defense, supplemented by cloud-provider specific protections like IMDSv2, metadata concealment, or workload identity. Use iptables rules on nodes for defense in depth. Monitor access attempts to detect potential attacks.

Combined with proper RBAC, pod security standards, and runtime security tools, blocking metadata access forms an essential part of your Kubernetes security posture. The effort to implement these controls is minimal compared to the security benefits they provide.
