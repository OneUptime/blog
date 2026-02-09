# How to Set Up Cross-Region EKS Clusters with Global Accelerator for Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Kubernetes, EKS, High Availability

Description: Build a highly available multi-region EKS architecture using AWS Global Accelerator for automatic failover and improved global performance.

---

Running critical applications on a single Kubernetes cluster creates a regional single point of failure. AWS Global Accelerator with cross-region EKS clusters provides automatic failover, reduced latency, and improved availability for global applications.

This guide shows you how to set up multi-region EKS clusters with Global Accelerator for disaster recovery and high availability.

## Understanding the Architecture

The architecture includes:

**EKS Clusters** in multiple AWS regions (primary and secondary).

**AWS Global Accelerator** providing static anycast IPs that route to healthy endpoints.

**Application Load Balancers** in each region exposing cluster services.

**Route 53** for DNS management with health checks.

**Data replication** between regions using RDS cross-region read replicas or DynamoDB global tables.

Global Accelerator automatically routes traffic to healthy regions based on health checks.

## Creating EKS Clusters in Multiple Regions

Create primary cluster in us-east-1:

```bash
eksctl create cluster \
  --name prod-east \
  --region us-east-1 \
  --zones us-east-1a,us-east-1b,us-east-1c \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed
```

Create secondary cluster in us-west-2:

```bash
eksctl create cluster \
  --name prod-west \
  --region us-west-2 \
  --zones us-west-2a,us-west-2b,us-west-2c \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed
```

Using Terraform for both regions:

```hcl
# multi-region-eks.tf
module "eks_east" {
  source = "./modules/eks"

  cluster_name = "prod-east"
  region       = "us-east-1"
  vpc_cidr     = "10.0.0.0/16"
}

module "eks_west" {
  source = "./modules/eks"

  cluster_name = "prod-west"
  region       = "us-west-2"
  vpc_cidr     = "10.1.0.0/16"
}
```

## Installing AWS Load Balancer Controller

Install in both regions:

```bash
# East region
kubectl --context=prod-east apply -f aws-load-balancer-controller.yaml

# West region
kubectl --context=prod-west apply -f aws-load-balancer-controller.yaml
```

## Deploying Applications to Both Regions

Create identical deployments in both clusters:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myapp:v1
        ports:
        - containerPort: 8080
        env:
        - name: REGION
          value: "REPLACE_WITH_REGION"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Deploy to both regions:

```bash
# Deploy to east
sed 's/REPLACE_WITH_REGION/us-east-1/' app-deployment.yaml | \
  kubectl --context=prod-east apply -f -

# Deploy to west
sed 's/REPLACE_WITH_REGION/us-west-2/' app-deployment.yaml | \
  kubectl --context=prod-west apply -f -
```

## Creating Application Load Balancers

Create ingress with ALB in each region:

```yaml
# alb-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

Apply to both regions:

```bash
kubectl --context=prod-east apply -f alb-ingress.yaml
kubectl --context=prod-west apply -f alb-ingress.yaml
```

Get ALB DNS names:

```bash
ALB_EAST=$(kubectl --context=prod-east get ingress web-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

ALB_WEST=$(kubectl --context=prod-west get ingress web-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "East ALB: $ALB_EAST"
echo "West ALB: $ALB_WEST"
```

## Setting Up AWS Global Accelerator

Create Global Accelerator:

```bash
aws globalaccelerator create-accelerator \
  --name eks-global \
  --ip-address-type IPV4 \
  --enabled
```

Get accelerator ARN and IPs:

```bash
ACC_ARN=$(aws globalaccelerator list-accelerators \
  --query 'Accelerators[?Name==`eks-global`].AcceleratorArn' \
  --output text)

ACC_IPS=$(aws globalaccelerator list-accelerators \
  --query 'Accelerators[?Name==`eks-global`].IpSets[0].IpAddresses' \
  --output text)

echo "Accelerator ARN: $ACC_ARN"
echo "Static IPs: $ACC_IPS"
```

Create listener:

```bash
aws globalaccelerator create-listener \
  --accelerator-arn $ACC_ARN \
  --port-ranges FromPort=80,ToPort=80 FromPort=443,ToPort=443 \
  --protocol TCP
```

Get listener ARN:

```bash
LISTENER_ARN=$(aws globalaccelerator list-listeners \
  --accelerator-arn $ACC_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)
```

## Creating Endpoint Groups

Get ALB ARNs:

```bash
ALB_EAST_ARN=$(aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query "LoadBalancers[?contains(DNSName, '$(echo $ALB_EAST | cut -d- -f1)')].LoadBalancerArn" \
  --output text)

ALB_WEST_ARN=$(aws elbv2 describe-load-balancers \
  --region us-west-2 \
  --query "LoadBalancers[?contains(DNSName, '$(echo $ALB_WEST | cut -d- -f1)')].LoadBalancerArn" \
  --output text)
```

Create endpoint group for us-east-1:

```bash
aws globalaccelerator create-endpoint-group \
  --listener-arn $LISTENER_ARN \
  --endpoint-group-region us-east-1 \
  --endpoint-configurations \
    "EndpointId=$ALB_EAST_ARN,Weight=100,ClientIPPreservationEnabled=true" \
  --health-check-interval-seconds 30 \
  --threshold-count 3
```

Create endpoint group for us-west-2:

```bash
aws globalaccelerator create-endpoint-group \
  --listener-arn $LISTENER_ARN \
  --endpoint-group-region us-west-2 \
  --endpoint-configurations \
    "EndpointId=$ALB_WEST_ARN,Weight=100,ClientIPPreservationEnabled=true" \
  --health-check-interval-seconds 30 \
  --threshold-count 3
```

## Configuring Traffic Distribution

Adjust traffic weights (70% east, 30% west):

```bash
# Update east endpoint group
aws globalaccelerator update-endpoint-group \
  --endpoint-group-arn $EAST_GROUP_ARN \
  --endpoint-configurations \
    "EndpointId=$ALB_EAST_ARN,Weight=70"

# Update west endpoint group
aws globalaccelerator update-endpoint-group \
  --endpoint-group-arn $WEST_GROUP_ARN \
  --endpoint-configurations \
    "EndpointId=$ALB_WEST_ARN,Weight=30"
```

## Setting Up Data Replication

For RDS cross-region replication:

```bash
# Create read replica in secondary region
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-db-replica \
  --source-db-instance-identifier prod-db-primary \
  --db-instance-class db.r5.large \
  --region us-west-2
```

For DynamoDB global tables:

```bash
aws dynamodb create-global-table \
  --global-table-name sessions \
  --replication-group RegionName=us-east-1 RegionName=us-west-2
```

## Testing Failover

Simulate failure in primary region:

```bash
# Scale down east deployment
kubectl --context=prod-east scale deployment web-app --replicas=0

# Traffic should automatically route to west
curl http://$ACC_IPS[0]

# Should return response from us-west-2
```

Check Global Accelerator health:

```bash
aws globalaccelerator describe-endpoint-group \
  --endpoint-group-arn $EAST_GROUP_ARN \
  --query 'EndpointGroup.EndpointDescriptions'
```

## Monitoring with CloudWatch

Create dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name GlobalAcceleratorMetrics \
  --dashboard-body file://dashboard.json
```

Dashboard configuration:

```json
{
  "widgets": [{
    "type": "metric",
    "properties": {
      "metrics": [
        ["AWS/GlobalAccelerator", "ProcessedBytesIn", {"stat": "Sum"}],
        [".", "NewFlowCount", {"stat": "Sum"}]
      ],
      "period": 300,
      "stat": "Average",
      "region": "us-west-2",
      "title": "Global Accelerator Traffic"
    }
  }]
}
```

## Automation with Terraform

Complete setup:

```hcl
# global-accelerator.tf
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "eks-global"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "main" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 80
    to_port   = 80
  }

  port_range {
    from_port = 443
    to_port   = 443
  }
}

resource "aws_globalaccelerator_endpoint_group" "east" {
  listener_arn = aws_globalaccelerator_listener.main.id
  endpoint_group_region = "us-east-1"

  health_check_interval_seconds = 30
  threshold_count              = 3

  endpoint_configuration {
    endpoint_id = data.aws_lb.east.arn
    weight      = 100
    client_ip_preservation_enabled = true
  }
}

resource "aws_globalaccelerator_endpoint_group" "west" {
  listener_arn = aws_globalaccelerator_listener.main.id
  endpoint_group_region = "us-west-2"

  health_check_interval_seconds = 30
  threshold_count              = 3

  endpoint_configuration {
    endpoint_id = data.aws_lb.west.arn
    weight      = 100
    client_ip_preservation_enabled = true
  }
}
```

## Conclusion

AWS Global Accelerator with multi-region EKS clusters provides high availability, automatic failover, and improved performance for global applications. The static anycast IP addresses simplify DNS management while health-based routing ensures traffic only reaches healthy regions.

This architecture eliminates regional single points of failure and reduces latency by routing users to the nearest healthy endpoint. Combined with cross-region data replication, you achieve a fully redundant Kubernetes platform capable of surviving regional outages.
