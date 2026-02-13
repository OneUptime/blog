# How to Use EMR on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EMR, EKS, Kubernetes, Spark

Description: Learn how to run Apache Spark workloads on Amazon EMR on EKS to share Kubernetes infrastructure and improve resource utilization.

---

EMR on EKS lets you run Spark jobs on your existing Amazon EKS clusters. Instead of provisioning separate EC2 instances for EMR, your Spark executors run as Kubernetes pods alongside your other workloads. This is a big deal if your organization already invested in Kubernetes - you get to share infrastructure, use Kubernetes-native tooling, and consolidate your compute costs.

Let's walk through the setup, job submission, and the practical considerations you should know about.

## Why EMR on EKS?

The main reasons teams choose EMR on EKS over standalone EMR:

- **Shared infrastructure** - Run Spark jobs on the same EKS cluster as your microservices
- **Better resource utilization** - Kubernetes scheduler handles bin-packing across all workloads
- **Kubernetes tooling** - Use kubectl, Prometheus, Grafana, and other tools you already have
- **Multi-tenant isolation** - Kubernetes namespaces provide workload isolation
- **Faster startup** - No need to provision and bootstrap new EC2 instances

## Prerequisites

You'll need an EKS cluster running. If you don't have one, here's a quick setup.

This creates a basic EKS cluster using eksctl with managed node groups.

```bash
eksctl create cluster \
  --name data-platform \
  --region us-east-1 \
  --version 1.28 \
  --nodegroup-name spark-workers \
  --node-type m5.2xlarge \
  --nodes 5 \
  --nodes-min 2 \
  --nodes-max 20 \
  --managed
```

## Registering Your EKS Cluster with EMR

The first step is to create a virtual cluster. This maps an EKS namespace to an EMR virtual cluster that you'll submit jobs to.

Create a namespace for Spark workloads.

```bash
kubectl create namespace spark-workloads
```

Now create the IAM identity mapping so EMR can manage pods in that namespace.

```bash
eksctl create iamidentitymapping \
  --cluster data-platform \
  --namespace spark-workloads \
  --service-name "emr-containers"
```

Register the virtual cluster.

```bash
aws emr-containers create-virtual-cluster \
  --name "my-spark-virtual-cluster" \
  --container-provider '{
    "id": "data-platform",
    "type": "EKS",
    "info": {
      "eksInfo": {
        "namespace": "spark-workloads"
      }
    }
  }'
```

You'll get back a virtual cluster ID. Save it - you'll need it for every job submission.

## Setting Up the Execution Role

EMR on EKS needs an IAM role for the jobs to access AWS resources. This is different from the node IAM role.

Create a trust policy for the execution role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:spark-workloads:emr-containers-sa-*"
        }
      }
    }
  ]
}
```

Create the role and attach permissions.

```bash
# Create the IAM role
aws iam create-role \
  --role-name EMRContainersJobRole \
  --assume-role-policy-document file://trust-policy.json

# Attach S3 and CloudWatch permissions
aws iam put-role-policy \
  --role-name EMRContainersJobRole \
  --policy-name EMRContainersS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        "Resource": ["arn:aws:s3:::my-data-bucket", "arn:aws:s3:::my-data-bucket/*"]
      },
      {
        "Effect": "Allow",
        "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        "Resource": "*"
      }
    ]
  }'

# Update the trust relationship for the execution role
aws emr-containers update-role-trust-policy \
  --cluster-name data-platform \
  --namespace spark-workloads \
  --role-name EMRContainersJobRole
```

## Submitting a Spark Job

Now you're ready to submit jobs to your virtual cluster.

This submits a PySpark job to the EMR on EKS virtual cluster.

```bash
aws emr-containers start-job-run \
  --virtual-cluster-id abc123def456 \
  --name "daily-etl-job" \
  --execution-role-arn arn:aws:iam::123456789:role/EMRContainersJobRole \
  --release-label emr-7.0.0-latest \
  --job-driver '{
    "sparkSubmitJobDriver": {
      "entryPoint": "s3://my-scripts/etl_job.py",
      "entryPointArguments": ["--date", "2026-02-12"],
      "sparkSubmitParameters": "--conf spark.executor.instances=10 --conf spark.executor.memory=8g --conf spark.executor.cores=4 --conf spark.driver.memory=8g"
    }
  }' \
  --configuration-overrides '{
    "applicationConfiguration": [
      {
        "classification": "spark-defaults",
        "properties": {
          "spark.dynamicAllocation.enabled": "true",
          "spark.dynamicAllocation.minExecutors": "2",
          "spark.dynamicAllocation.maxExecutors": "50",
          "spark.kubernetes.allocation.batch.size": "10"
        }
      }
    ],
    "monitoringConfiguration": {
      "cloudWatchMonitoringConfiguration": {
        "logGroupName": "/emr-on-eks/spark-workloads",
        "logStreamNamePrefix": "daily-etl"
      },
      "s3MonitoringConfiguration": {
        "logUri": "s3://my-emr-logs/emr-on-eks/"
      }
    }
  }'
```

## Custom Pod Templates

One of the advantages of running on Kubernetes is that you can customize the pod spec for drivers and executors. This is useful for setting resource requests, node affinity, and tolerations.

This pod template ensures Spark executors run on specific nodes with GPU support.

```yaml
# executor-pod-template.yaml
apiVersion: v1
kind: Pod
spec:
  nodeSelector:
    node-type: spark-compute
  tolerations:
    - key: "spark-workload"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
  containers:
    - name: spark-kubernetes-executor
      resources:
        requests:
          memory: "8Gi"
          cpu: "4"
        limits:
          memory: "10Gi"
          cpu: "4"
      volumeMounts:
        - name: spark-local
          mountPath: /tmp/spark-local
  volumes:
    - name: spark-local
      emptyDir:
        sizeLimit: "100Gi"
```

Upload the template to S3 and reference it in your job.

```bash
aws s3 cp executor-pod-template.yaml s3://my-scripts/pod-templates/

aws emr-containers start-job-run \
  --virtual-cluster-id abc123def456 \
  --name "custom-pod-job" \
  --execution-role-arn arn:aws:iam::123456789:role/EMRContainersJobRole \
  --release-label emr-7.0.0-latest \
  --job-driver '{
    "sparkSubmitJobDriver": {
      "entryPoint": "s3://my-scripts/etl_job.py",
      "sparkSubmitParameters": "--conf spark.kubernetes.executor.podTemplateFile=s3://my-scripts/pod-templates/executor-pod-template.yaml"
    }
  }'
```

## Using Custom Images

You can build custom Docker images with your dependencies pre-installed. This eliminates the need for bootstrap scripts and speeds up job startup.

This Dockerfile adds Python libraries to the EMR base image.

```dockerfile
FROM public.ecr.aws/emr-on-eks/spark/emr-7.0.0:latest

USER root

# Install custom Python packages
RUN pip3 install pandas numpy scikit-learn boto3 pyarrow

# Copy your application code
COPY src/ /opt/spark/work-dir/

USER hadoop
```

Build and push it to ECR.

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker build -t my-spark-image:latest .
docker tag my-spark-image:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/my-spark-image:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-spark-image:latest
```

Then reference it in your job submission.

```bash
aws emr-containers start-job-run \
  --virtual-cluster-id abc123def456 \
  --name "custom-image-job" \
  --execution-role-arn arn:aws:iam::123456789:role/EMRContainersJobRole \
  --release-label emr-7.0.0-latest \
  --job-driver '{
    "sparkSubmitJobDriver": {
      "entryPoint": "local:///opt/spark/work-dir/etl_job.py",
      "sparkSubmitParameters": "--conf spark.kubernetes.container.image=123456789.dkr.ecr.us-east-1.amazonaws.com/my-spark-image:latest"
    }
  }'
```

## Monitoring and Debugging

You can monitor your jobs using both EMR APIs and Kubernetes-native tools.

```bash
# Check job status via EMR
aws emr-containers describe-job-run \
  --virtual-cluster-id abc123def456 \
  --id job-run-id-here

# Watch pods in the namespace
kubectl get pods -n spark-workloads -w

# Check logs of a specific executor pod
kubectl logs spark-abc123-exec-1 -n spark-workloads

# View resource usage
kubectl top pods -n spark-workloads
```

## Resource Quotas

To prevent Spark jobs from consuming all cluster resources, set Kubernetes resource quotas on the namespace.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: spark-quota
  namespace: spark-workloads
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "400Gi"
    limits.cpu: "120"
    limits.memory: "500Gi"
    pods: "200"
```

Apply it with kubectl.

```bash
kubectl apply -f resource-quota.yaml
```

This ensures your Spark workloads can't starve your other applications. For more on running Spark efficiently, check out our post on [running Apache Spark jobs on Amazon EMR](https://oneuptime.com/blog/post/2026-02-12-run-apache-spark-jobs-on-amazon-emr/view).

EMR on EKS is a great fit if you're already running Kubernetes and want to consolidate your data processing onto the same infrastructure. The setup takes some effort, but once it's running, you get the best of both worlds - managed Spark with Kubernetes flexibility.
