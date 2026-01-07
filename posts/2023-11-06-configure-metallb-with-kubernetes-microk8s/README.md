# How to configure MetalLB with Kubernetes (Microk8s).

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Kubernetes, Microk8s

Description: MetalLB is a load-balancer implementation for bare metal Kubernetes clusters, using standard routing protocols. This guide will help you configure MetalLB with Kubernetes (Microk8s).

MetalLB is a load balancer implementation for environments that do not natively provide this feature, like bare metal clusters and edge deployments. It allows external access to services deployed in your Kubernetes cluster, which is crucial for many applications.

### Prerequisites

Before we start, make sure you have the following:

- A Microk8s Kubernetes cluster up and running.
- `kubectl` installed and configured to interact with your cluster.

### Enable MetalLb for your cluster

To enable MetalLB, you need to run the following command:

This command activates the MetalLB addon in your Microk8s cluster, allowing it to handle LoadBalancer-type services.

```bash
# Enable the MetalLB addon in Microk8s
# This sets up MetalLB as the load balancer implementation for your cluster
microk8s enable metallb
```

### Add Address Pool to your Cluster

Create a file address-pool.yaml and add these contents to it:

This YAML configuration defines a pool of IP addresses that MetalLB can assign to LoadBalancer services. Replace the placeholder IPs with your actual public IP addresses.

```yaml
# MetalLB IP Address Pool Configuration
# This defines the range of IP addresses MetalLB can allocate to services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  # Name used to reference this pool in service annotations
  name: "metallb-address-pool"
  # MetalLB resources must be in the metallb-system namespace
  namespace: metallb-system
spec:
  # List of IP addresses or CIDR ranges available for allocation
  addresses:
    - PUBLIC_IP_ADDRESS_1 # Replace with your IP + CIDR (e.g., 51.568.145.125/32)
    - PUBLIC_IP_ADDRESS_2 # Replace with your IP + CIDR (e.g., 51.568.145.126/32)
    - MORE_IP_IF_YOU_HAVE_THEM # Add additional IPs as needed
```

And apply it with:

This command creates the IPAddressPool resource in your cluster, making the IP addresses available for MetalLB to use.

```bash
# Apply the address pool configuration to the cluster
# MetalLB will now be able to allocate IPs from this pool
kubectl apply -f address-pool.yaml
```

### Add this address pool to your Kubernetes LoadBalancer Service

This Service configuration creates a LoadBalancer that uses MetalLB to expose your application externally. The annotation tells MetalLB which IP pool to allocate from.

```yaml
# Kubernetes Service with MetalLB LoadBalancer configuration
apiVersion: v1
kind: Service
metadata:
  # Give your service a descriptive name
  name: "service-name"
  annotations:
    # This annotation tells MetalLB to use the address pool we created earlier
    metallb.universe.tf/address-pool: metallb-address-pool
spec:
  # Uncomment the line below to request a specific IP from your pool
  # loadBalancerIP: a.b.c.d
  ports:
    - protocol: TCP
      port: 80          # Port exposed externally
      targetPort: 80    # Port your application listens on
  selector:
    # Add your pod selector labels here to route traffic to the correct pods
    # Example: app: my-application
    # <YOUR_SELECTORS>
  # LoadBalancer type triggers MetalLB to assign an external IP
  type: LoadBalancer
```

### Conclusion

Setting up MetalLB with Kubernetes is straightforward and provides a critical feature for applications that require external access. With MetalLB, you can bring your bare metal or edge Kubernetes deployments closer to cloud-like functionality.

Remember to replace the IP ranges and service selectors with values that match your environment. Happy load balancing!

**Related Reading:**

- [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view)
- [The Five Stages of SRE Maturity: From Chaos to Operational Excellence](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)