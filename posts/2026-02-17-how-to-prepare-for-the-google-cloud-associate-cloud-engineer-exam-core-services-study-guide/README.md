# How to Prepare for the Google Cloud Associate Cloud Engineer Exam Core Services Study Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Certification, Associate Cloud Engineer, Study Guide, Google Cloud, Cloud Computing

Description: A practical study guide covering the core GCP services you need to know for the Google Cloud Associate Cloud Engineer certification exam with hands-on practice tips.

---

The Google Cloud Associate Cloud Engineer (ACE) exam tests your ability to deploy applications, monitor operations, and manage enterprise solutions on GCP. It is one of the most popular cloud certifications, and for good reason - it validates practical skills that employers actually care about. But the breadth of services covered can feel overwhelming.

This guide breaks down the core services you need to know, with practical advice on what to study and how to practice. I passed this exam after about six weeks of preparation, and these are the areas that mattered most.

## Exam Overview

The ACE exam covers five domains:

1. Setting up a cloud solution environment (17.5%)
2. Planning and configuring a cloud solution (17.5%)
3. Deploying and implementing a cloud solution (25%)
4. Ensuring successful operation of a cloud solution (20%)
5. Configuring access and security (20%)

The exam is 50 questions, 2 hours, and costs $200. You need hands-on experience - rote memorization will not get you through.

## Compute Services

### Compute Engine

Compute Engine is the foundation. You need to know:

**Machine types and their use cases**: General-purpose (E2, N2), compute-optimized (C2), memory-optimized (M2), and when to use each. E2 machines are cost-effective for most workloads. C2 is for CPU-intensive tasks like batch processing.

**Instance lifecycle**: Creating, starting, stopping, suspending, and deleting instances. Know the cost implications - a stopped instance still incurs charges for attached disks and reserved IPs.

Practice this command until it feels natural:

```bash
# Create an instance with a specific machine type and boot disk
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=http-server
```

**Managed Instance Groups (MIGs)**: Know how to create instance templates, set up autoscaling, and configure health checks. MIGs are how you run scalable, self-healing applications on Compute Engine.

**Preemptible and Spot VMs**: Understand the difference - preemptible VMs are being replaced by Spot VMs. Both are cheaper but can be terminated with 30 seconds notice. Good for batch jobs, bad for web servers.

### Google Kubernetes Engine (GKE)

You do not need to be a Kubernetes expert, but you need to understand:

- Creating clusters (standard vs. Autopilot)
- Deploying workloads with kubectl
- Exposing services with LoadBalancer and Ingress
- Node pool management and scaling
- Upgrading clusters

Key commands to practice:

```bash
# Create an Autopilot cluster
gcloud container clusters create-auto my-cluster \
  --region=us-central1

# Get cluster credentials for kubectl
gcloud container clusters get-credentials my-cluster \
  --region=us-central1

# Deploy an application
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=LoadBalancer
```

### App Engine

Know the difference between Standard and Flexible environments:

- **Standard**: Scales to zero, supports specific runtimes, fast deployment, limited customization
- **Flexible**: Runs Docker containers, does not scale to zero, more customizable, supports any runtime

Understand traffic splitting for gradual rollouts and how versioning works.

### Cloud Run

Cloud Run is increasingly important on the exam. Know how to deploy containerized applications, set up custom domains, configure concurrency, and manage revisions with traffic splitting.

```bash
# Deploy a container to Cloud Run
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-service \
  --region=us-central1 \
  --allow-unauthenticated
```

### Cloud Functions

Understand triggers (HTTP, Pub/Sub, Cloud Storage), runtimes, and basic deployment. Know when to use Cloud Functions vs. Cloud Run.

## Storage Services

### Cloud Storage

This is heavily tested. Know the storage classes and their use cases:

- **Standard**: Frequently accessed data
- **Nearline**: Accessed less than once a month (30-day minimum storage)
- **Coldline**: Accessed less than once a quarter (90-day minimum)
- **Archive**: Accessed less than once a year (365-day minimum)

Understand lifecycle policies, versioning, ACLs vs. IAM permissions, and gsutil commands:

```bash
# Create a bucket with a lifecycle rule to move objects to Nearline after 30 days
gsutil mb -l us-central1 gs://my-bucket

# Set a lifecycle policy
gsutil lifecycle set lifecycle.json gs://my-bucket
```

### Cloud SQL

Know how to create instances (MySQL, PostgreSQL, SQL Server), set up replicas, configure backups, and manage connections. Understand private IP vs. public IP access and Cloud SQL Proxy.

### Cloud Spanner

Understand when to use Spanner over Cloud SQL - globally distributed, horizontally scalable relational database. Know the pricing model (it is expensive) and use cases (financial systems, global applications).

### Cloud Bigtable and Firestore

Know the high-level use cases. Bigtable is for analytical and IoT workloads with massive scale. Firestore is for mobile and web application data with real-time sync.

## Networking

### VPC Networks

Understand VPC concepts thoroughly:

- Subnets (auto-mode vs. custom-mode)
- Firewall rules (priority, targets, source/destination)
- Routes and routing tables
- VPC peering and Shared VPC
- Private Google Access

```bash
# Create a custom VPC with a subnet
gcloud compute networks create my-vpc --subnet-mode=custom
gcloud compute networks subnets create my-subnet \
  --network=my-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24
```

### Load Balancing

Know the load balancer types:

- **HTTP(S) Load Balancer**: Global, Layer 7, supports URL maps
- **TCP/SSL Proxy**: Global, Layer 4
- **Network Load Balancer**: Regional, Layer 4, pass-through
- **Internal Load Balancer**: Regional, for internal traffic

Understand when to use each type and how health checks work.

### Cloud DNS

Basic DNS management - creating zones, record sets, and understanding DNS resolution in GCP.

### Cloud VPN and Cloud Interconnect

Know the difference between VPN (encrypted tunnel over the internet) and Interconnect (dedicated physical connection). Understand when each is appropriate.

## Monitoring and Operations

### Cloud Monitoring

Creating dashboards, setting up alerting policies, and understanding uptime checks. Know how to create custom metrics and use them in alerts.

### Cloud Logging

Log sinks, log-based metrics, and log retention. Understand how to export logs to Cloud Storage, BigQuery, or Pub/Sub.

```bash
# Create a log sink to export logs to BigQuery
gcloud logging sinks create my-sink \
  bigquery.googleapis.com/projects/my-project/datasets/logs \
  --log-filter='resource.type="gce_instance"'
```

### Error Reporting and Cloud Trace

Know what these services do and when to use them. Error Reporting aggregates application errors. Cloud Trace helps identify latency bottlenecks.

## Practical Study Strategy

1. **Start with a free tier project**: Create a GCP project and use the free tier credits to practice. Actually run the commands, do not just read about them.

2. **Take the practice exam**: Google provides a free practice exam. Take it early to identify weak areas.

3. **Focus on gcloud CLI**: Many exam questions ask about the correct gcloud command. Practice creating, listing, and modifying resources from the command line.

4. **Use Qwiklabs and Cloud Skills Boost**: The hands-on labs are excellent for building practical experience.

5. **Read the documentation**: When you encounter a concept you do not understand, go to the official docs. They are well-written and are the source of exam questions.

6. **Study IAM deeply**: Access control questions appear across all domains. Understand roles, service accounts, and the principle of least privilege (this topic gets its own section on the exam).

## Time Management

Budget your study time based on the exam domain weights:

- Deploying and implementing (25%): Spend the most time here. Practice deploying to Compute Engine, GKE, App Engine, Cloud Run, and Cloud Functions.
- Ensuring successful operation (20%): Monitoring, logging, and troubleshooting.
- Configuring access and security (20%): IAM, service accounts, network security.
- Setting up and planning (35% combined): Project setup, billing, resource hierarchy.

## Wrapping Up

The ACE exam is approachable if you have hands-on experience with GCP. The key is actual practice - create resources, break things, fix them, and do it again. Focus on compute services (Compute Engine and GKE carry the most weight), understand networking fundamentals, and make IAM second nature. Use the official practice exam to calibrate your readiness, and allocate at least four to six weeks of study time if you are coming from limited GCP experience.
