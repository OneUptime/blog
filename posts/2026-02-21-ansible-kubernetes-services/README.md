# How to Use Ansible to Create Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Services, DevOps, Networking

Description: Learn how to create and manage Kubernetes Services using Ansible's k8s module with practical examples for ClusterIP, NodePort, and LoadBalancer types.

---

Kubernetes Services are the glue that connects your pods to the rest of the world. Without them, pods just sit there with their random IPs, unreachable and useless to consumers. If you are already using Ansible to manage infrastructure, it makes sense to bring Kubernetes Service management into the same workflow.

This guide walks through creating different types of Kubernetes Services using Ansible's `kubernetes.core.k8s` module. We will cover ClusterIP, NodePort, LoadBalancer, and ExternalName services with real playbook examples you can adapt for your own clusters.

## Prerequisites

Before diving in, make sure you have:

- Ansible 2.12 or newer
- The `kubernetes.core` collection installed
- A working kubeconfig pointing to your cluster
- Python `kubernetes` library installed on the control node

Install the required collection if you have not already:

```bash
# Install the Kubernetes collection from Ansible Galaxy
ansible-galaxy collection install kubernetes.core

# Install the Python client library
pip install kubernetes
```

## Understanding Kubernetes Service Types

Before writing playbooks, let's quickly review what each service type does:

- **ClusterIP**: Internal-only access within the cluster (default)
- **NodePort**: Exposes the service on each node's IP at a static port
- **LoadBalancer**: Provisions an external load balancer (cloud providers)
- **ExternalName**: Maps a service to a DNS name outside the cluster

## Creating a ClusterIP Service

ClusterIP is the most common service type. It gives your pods a stable internal IP that other pods in the cluster can use.

```yaml
# playbook: create-clusterip-service.yml
# Creates a basic ClusterIP service for a web application
---
- name: Create Kubernetes ClusterIP Service
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create a ClusterIP service for the web frontend
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: web-frontend
            namespace: production
            labels:
              app: web-frontend
              tier: frontend
          spec:
            type: ClusterIP
            selector:
              app: web-frontend
            ports:
              - name: http
                port: 80
                targetPort: 8080
                protocol: TCP
              - name: https
                port: 443
                targetPort: 8443
                protocol: TCP
```

The `selector` field is what ties the service to your pods. Any pod with the label `app: web-frontend` will receive traffic from this service. The `port` field is what consumers connect to, while `targetPort` is the actual port your container listens on.

## Creating a NodePort Service

When you need to access a service from outside the cluster without a cloud load balancer, NodePort is your friend. It opens a port on every node in the cluster.

```yaml
# playbook: create-nodeport-service.yml
# Exposes a service on a specific node port for external access
---
- name: Create Kubernetes NodePort Service
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create a NodePort service for the API gateway
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: api-gateway
            namespace: production
            annotations:
              description: "API Gateway exposed via NodePort"
          spec:
            type: NodePort
            selector:
              app: api-gateway
            ports:
              - name: http
                port: 80
                targetPort: 3000
                nodePort: 30080
                protocol: TCP
```

The `nodePort` field is optional. If you skip it, Kubernetes picks a random port between 30000 and 32767. Specifying it gives you a predictable port, which is useful for firewall rules and documentation.

## Creating a LoadBalancer Service

For production workloads on cloud providers like AWS, GCP, or Azure, LoadBalancer services provision a real external load balancer.

```yaml
# playbook: create-loadbalancer-service.yml
# Creates a LoadBalancer service with cloud-specific annotations
---
- name: Create Kubernetes LoadBalancer Service
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    environment_name: production
    ssl_cert_arn: "arn:aws:acm:us-east-1:123456789:certificate/abc-123"

  tasks:
    - name: Create a LoadBalancer service for public-facing API
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: public-api
            namespace: "{{ environment_name }}"
            annotations:
              # AWS-specific annotations for the load balancer
              service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
              service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "{{ ssl_cert_arn }}"
              service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
          spec:
            type: LoadBalancer
            selector:
              app: public-api
            ports:
              - name: https
                port: 443
                targetPort: 8080
                protocol: TCP
            loadBalancerSourceRanges:
              - "10.0.0.0/8"
              - "203.0.113.0/24"
```

The `loadBalancerSourceRanges` field restricts which IP ranges can reach your load balancer. This is a quick way to add IP whitelisting without needing a separate security group or firewall rule.

## Creating an ExternalName Service

ExternalName services are different from the rest. They do not route traffic to pods. Instead, they create a CNAME record that points to an external DNS name. This is useful when you want pods to reference an external database or API through a Kubernetes-native service name.

```yaml
# playbook: create-externalname-service.yml
# Maps an internal service name to an external database endpoint
---
- name: Create Kubernetes ExternalName Service
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create ExternalName service for the managed database
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: database
            namespace: production
          spec:
            type: ExternalName
            externalName: mydb.abc123.us-east-1.rds.amazonaws.com
```

Now any pod in the `production` namespace can connect to `database` and it resolves to the RDS endpoint. When you migrate to a different database, you just update the service definition instead of changing application configs.

## Creating Multiple Services with a Loop

In real-world scenarios, you often need to create several services at once. Ansible loops make this straightforward.

```yaml
# playbook: create-multiple-services.yml
# Creates services for multiple microservices in one playbook run
---
- name: Create Multiple Kubernetes Services
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    services:
      - name: user-service
        port: 80
        target_port: 5000
      - name: order-service
        port: 80
        target_port: 5001
      - name: payment-service
        port: 80
        target_port: 5002
      - name: notification-service
        port: 80
        target_port: 5003

  tasks:
    - name: Create ClusterIP services for all microservices
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ item.name }}"
            namespace: production
            labels:
              app: "{{ item.name }}"
              managed-by: ansible
          spec:
            type: ClusterIP
            selector:
              app: "{{ item.name }}"
            ports:
              - port: "{{ item.port }}"
                targetPort: "{{ item.target_port }}"
                protocol: TCP
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
```

The `loop_control` with `label` keeps the output clean. Without it, Ansible dumps the entire dictionary for each iteration, which gets noisy fast.

## Headless Services for StatefulSets

Sometimes you need direct pod-to-pod communication without load balancing. Headless services (ClusterIP set to None) are how you do this, and they are essential for StatefulSets.

```yaml
# task: create a headless service for a database StatefulSet
- name: Create headless service for PostgreSQL StatefulSet
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Service
      metadata:
        name: postgres-headless
        namespace: databases
      spec:
        clusterIP: None
        selector:
          app: postgres
        ports:
          - port: 5432
            targetPort: 5432
```

With this in place, each pod gets a DNS entry like `postgres-0.postgres-headless.databases.svc.cluster.local`. Applications can connect to specific replicas when needed.

## Verifying Service Creation

After creating services, you should verify they exist and have the right configuration.

```yaml
# task: verify the service was created with correct endpoints
- name: Check the service exists and has endpoints
  kubernetes.core.k8s_info:
    kind: Service
    name: web-frontend
    namespace: production
  register: service_result

- name: Display service details
  ansible.builtin.debug:
    msg: "Service {{ service_result.resources[0].metadata.name }} has ClusterIP {{ service_result.resources[0].spec.clusterIP }}"
  when: service_result.resources | length > 0
```

## Summary

Managing Kubernetes Services through Ansible gives you repeatable, version-controlled infrastructure. You can define your entire service mesh in playbooks, review changes in pull requests, and apply them consistently across environments. The `kubernetes.core.k8s` module handles all four service types, and combining it with Ansible variables and loops keeps your playbooks DRY and maintainable.

Start with ClusterIP for internal communication, move to LoadBalancer for public-facing endpoints, and use ExternalName when bridging to services outside your cluster. Keep your service definitions in a dedicated playbook or role so they stay organized as your microservice count grows.
