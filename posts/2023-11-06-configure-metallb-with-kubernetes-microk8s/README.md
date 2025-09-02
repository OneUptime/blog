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

```bash
microk8s enable metallb
```

### Add Address Pool to your Cluster

Create a file address-pool.yaml and add these contents to it:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: "metallb-address-pool"
  namespace: metallb-system
spec: 
  addresses:
    - PUBLIC_IP_ADDRESS_1 # Please replace this. Please also include CIDR. Ex: 51.568.145.125/32
    - PUBLIC_IP_ADDRESS_2 # Please replace this. Please also include CIDR. Ex: 51.568.145.125/32
    - MORE_IP_IF_YOU_HAVE_THEM # Please replace this. Please also include CIDR. Ex: 51.568.145.125/32
```

And apply it with:

```bash
kubectl apply -f address-pool.yaml
```

### Add this address pool to your Kubernetes LoadBalancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: "service-name"
  annotations:
    metallb.universe.tf/address-pool: metallb-address-pool # Refer to address pool previously created. 
spec:
  # loadBalancerIP: a.b.c.d # (optional) you can hard code the IP here if you like
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  selector: 
     # <YOUR_SELECTORS>
  type: LoadBalancer
```

### Conclusion

Setting up MetalLB with Kubernetes is straightforward and provides a critical feature for applications that require external access. With MetalLB, you can bring your bare metal or edge Kubernetes deployments closer to cloud-like functionality.

Remember to replace the IP ranges and service selectors with values that match your environment. Happy load balancing!

**Related Reading:**

- [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view)
- [The Five Stages of SRE Maturity: From Chaos to Operational Excellence](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)