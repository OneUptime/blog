# How to Diagnose LoadBalancer Service Not Getting External IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Cloud

Description: Troubleshoot and fix LoadBalancer services stuck in pending state without external IP addresses in Kubernetes clusters.

---

LoadBalancer services provide external access to applications by requesting a cloud provider load balancer. When everything works correctly, the cloud provider provisions the load balancer and assigns an external IP address within minutes. However, when the service gets stuck with `<pending>` in the EXTERNAL-IP column, applications remain inaccessible from outside the cluster.

This issue is frustrating because Kubernetes shows no errors, yet the service never becomes ready. The root cause varies depending on your infrastructure, from cloud provider configuration issues to cluster setup problems.

## Understanding LoadBalancer Service Provisioning

When you create a LoadBalancer service, Kubernetes performs several steps. The service controller detects the new LoadBalancer service, communicates with the cloud provider API to request a load balancer, and waits for the cloud provider to provision and return the external IP. Once received, Kubernetes updates the service status with the external IP.

Failures at any step leave the service in pending state indefinitely.

## Checking Service Status

Start by examining the service details:

```bash
# View service status
kubectl get svc my-loadbalancer -n my-namespace

# Example pending output:
# NAME              TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
# my-loadbalancer   LoadBalancer   10.96.1.5      <pending>     80:30123/TCP

# Get detailed information
kubectl describe svc my-loadbalancer -n my-namespace

# Look for events showing errors
```

The describe output may show events indicating what went wrong, such as cloud provider API errors or quota limits.

## Verifying Cloud Provider Integration

Kubernetes needs proper cloud provider integration to provision load balancers:

```bash
# Check if cloud controller manager is running
kubectl get pods -n kube-system | grep cloud-controller

# For AWS
kubectl get pods -n kube-system | grep aws-cloud-controller

# For GCP
kubectl get pods -n kube-system | grep gcp-cloud-controller

# For Azure
kubectl get pods -n kube-system | grep azure-cloud-controller

# Check logs for errors
kubectl logs -n kube-system cloud-controller-manager-xxx
```

If the cloud controller manager is not running or shows errors, it cannot provision load balancers.

## Checking Cluster Configuration

Verify your cluster was configured with cloud provider support:

```bash
# Check kube-controller-manager configuration
kubectl get pod -n kube-system kube-controller-manager-xxx -o yaml | grep cloud-provider

# Should show something like:
# - --cloud-provider=aws
# or
# - --cloud-provider=external

# For managed Kubernetes (EKS, GKE, AKS), this is configured automatically
```

If cloud-provider is not set or set to empty, the cluster cannot create load balancers.

## Verifying Cloud Provider Credentials

The cloud controller needs valid credentials to provision resources:

```bash
# For AWS, check if instance IAM role has required permissions
# From a node:
kubectl debug node/my-node -it --image=nicolaka/netshoot
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Verify the role has permissions for:
# - elasticloadbalancing:CreateLoadBalancer
# - elasticloadbalancing:DescribeLoadBalancers
# - elasticloadbalancing:ConfigureHealthCheck
# - elasticloadbalancing:RegisterInstancesWithLoadBalancer

# For GCP, check service account permissions
# For Azure, check managed identity or service principal
```

Missing permissions prevent load balancer creation even if everything else is correct.

## Checking Cloud Provider Quotas

Cloud providers limit how many load balancers you can create:

```bash
# For AWS
aws elb describe-account-limits

# For GCP
gcloud compute project-info describe --project=PROJECT_ID

# For Azure
az network lb list --query "length([])"

# Compare current usage with quota limits
```

If you have reached quota limits, request an increase or delete unused load balancers.

## Examining Load Balancer Service Definition

Verify your service definition is correct:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer
  namespace: my-namespace
  # annotations:  # Cloud-specific annotations may be required
  #   service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

Check for required annotations specific to your cloud provider.

## Testing with NodePort First

Verify the underlying NodePort works before debugging LoadBalancer:

```bash
# Get the NodePort assigned to your LoadBalancer service
kubectl get svc my-loadbalancer -n my-namespace

# Output shows NodePort:
# PORT(S)
# 80:30123/TCP

# Test accessing the NodePort directly
curl http://NODE_IP:30123

# If NodePort fails, fix the service/pod issues first
```

LoadBalancer builds on top of NodePort, so NodePort must work for LoadBalancer to succeed.

## Checking Security Groups and Firewall Rules

Cloud firewalls might prevent load balancer communication with nodes:

```bash
# For AWS, verify security group allows traffic
# Check node security group allows traffic on NodePorts (30000-32767)

# For GCP, verify firewall rules
gcloud compute firewall-rules list --filter="name~k8s"

# For Azure, check NSG rules
az network nsg rule list --nsg-name CLUSTER-NSG --resource-group RG
```

Load balancers need to reach the NodePort on each node for health checks to pass.

## Examining Cloud Provider Events

Check cloud provider logs and events:

```bash
# For AWS CloudTrail
aws cloudtrail lookup-events --lookup-attributes \
  AttributeKey=ResourceType,AttributeValue=AWS::ElasticLoadBalancing::LoadBalancer \
  --max-results 50

# Look for CreateLoadBalancer events and any errors

# For GCP audit logs
gcloud logging read "resource.type=gce_forwarding_rule" --limit 50

# For Azure activity log
az monitor activity-log list --resource-group CLUSTER-RG
```

Cloud provider logs show detailed errors that Kubernetes may not expose.

## Verifying Network Configuration

Check if your cluster network configuration supports LoadBalancer:

```bash
# Verify cluster is in correct VPC/VNet
kubectl get nodes -o wide

# Check subnet configuration
# LoadBalancer may need to be in public subnets

# For AWS, verify subnets are tagged properly
# kubernetes.io/cluster/CLUSTER-NAME: owned or shared
# kubernetes.io/role/elb: 1 (for public subnets)

# Verify internet gateway exists for public load balancers
```

Incorrect network configuration prevents load balancer provisioning.

## Checking for Existing Resources

Name conflicts or leftover resources cause issues:

```bash
# For AWS, check for existing load balancers
aws elb describe-load-balancers | grep my-loadbalancer

# For GCP
gcloud compute forwarding-rules list

# For Azure
az network lb list

# Delete any stale resources matching your service
```

If a load balancer with the same name exists, Kubernetes cannot create a new one.

## Testing on Bare Metal or Unsupported Platforms

LoadBalancer type requires cloud provider or on-premises solution:

```bash
# On bare metal, you need MetalLB or similar
kubectl get pods -n metallb-system

# If no load balancer implementation exists, service stays pending forever

# Install MetalLB for bare metal
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml

# Configure IP address pool
# See MetalLB documentation for details
```

Without a load balancer implementation, LoadBalancer services cannot work.

## Checking Service Controller Logs

The Kubernetes service controller handles LoadBalancer provisioning:

```bash
# Check controller-manager logs
kubectl logs -n kube-system kube-controller-manager-xxx | grep -i loadbalancer

# Look for errors like:
# - Failed to ensure load balancer
# - Error creating load balancer
# - Cloud provider error

# Enable verbose logging if needed
kubectl edit pod -n kube-system kube-controller-manager-xxx
# Add --v=5 to increase verbosity
```

Service controller logs reveal Kubernetes-level issues.

## Verifying Annotations

Cloud providers use annotations for load balancer configuration:

```bash
# For AWS
annotations:
  service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # Use NLB instead of CLB
  service.beta.kubernetes.io/aws-load-balancer-internal: "true"  # For internal LB
  service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."

# For GCP
annotations:
  cloud.google.com/load-balancer-type: "Internal"

# For Azure
annotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "true"

# Invalid annotations may cause provisioning failure
```

Verify annotations match your cloud provider's requirements.

## Testing with Simple Service

Create a minimal test service to isolate the issue:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-lb
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx-test
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
```

Apply and check if this simple service gets an external IP:

```bash
kubectl apply -f test-lb.yaml
kubectl get svc test-lb --watch

# If this works, the issue is with your original service configuration
# If this fails, the issue is with cluster or cloud provider setup
```

## Checking for Multiple Cloud Providers

Mixed cloud provider configuration causes conflicts:

```bash
# Verify only one cloud provider is configured
kubectl get nodes -o yaml | grep -i providerID

# All nodes should have the same provider
# providerID: aws://us-east-1a/i-xxxxx
# or
# providerID: gce://project/us-central1-a/instance

# Mixed providers will cause issues
```

Hybrid or multi-cloud clusters need special configuration.

## Forcing Service Sync

Sometimes forcing a sync resolves stuck services:

```bash
# Delete and recreate the service
kubectl delete svc my-loadbalancer -n my-namespace
kubectl apply -f service.yaml

# Or update the service to trigger reconciliation
kubectl annotate svc my-loadbalancer -n my-namespace \
  reconcile="$(date +%s)" --overwrite

# Watch for external IP
kubectl get svc my-loadbalancer -n my-namespace --watch
```

This gives the controller a fresh start at provisioning.

## Checking Cloud Provider API Limits

API rate limiting prevents load balancer creation:

```bash
# For AWS, check API throttling in CloudTrail
# Look for ThrottlingException

# For GCP, check quota usage
gcloud compute project-info describe --project=PROJECT_ID | grep -i quota

# For Azure, check for rate limit errors
az monitor activity-log list --resource-group RG | grep -i throttl
```

If hitting API limits, reduce the frequency of service changes or request limit increases.

## Conclusion

LoadBalancer services stuck in pending state typically result from cloud provider integration issues, insufficient permissions, resource quotas, network configuration problems, or missing load balancer implementations. Systematic troubleshooting checks cloud provider integration, verifies credentials and permissions, examines cloud provider logs and events, tests with simple services, and reviews cluster configuration.

For managed Kubernetes services (EKS, GKE, AKS), LoadBalancer should work out of the box if your cluster has correct cloud provider permissions. For self-managed clusters, ensure cloud controller manager is running and properly configured. For bare metal clusters, install MetalLB or a similar solution.

Understanding how Kubernetes communicates with cloud providers helps you quickly identify where LoadBalancer provisioning fails. Check service controller logs, cloud provider audit logs, and network configuration to pinpoint the exact cause. Most issues resolve by fixing permissions, adjusting quotas, or correcting network setup. Master these troubleshooting techniques, and you will keep external access to your applications reliable.
