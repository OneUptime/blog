# How to Set Up Istio on Azure Kubernetes Service (AKS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure, AKS, Kubernetes, Service Mesh

Description: Complete walkthrough for deploying Istio on Azure Kubernetes Service with Azure-specific networking and load balancer setup.

---

Azure Kubernetes Service (AKS) is Microsoft's managed Kubernetes offering, and it pairs well with Istio for service mesh functionality. While Azure does offer its own service mesh options, running open-source Istio gives you portability and access to the full feature set of the upstream project.

This guide takes you from zero to a working Istio mesh on AKS, covering the Azure-specific configuration you need to get things right.

## Prerequisites

Install these tools:

- Azure CLI (`az`)
- kubectl
- istioctl

Log in and set your subscription:

```bash
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

## Step 1: Create a Resource Group

```bash
az group create --name istio-rg --location eastus
```

## Step 2: Create an AKS Cluster

Create a cluster with enough capacity for Istio:

```bash
az aks create \
  --resource-group istio-rg \
  --name istio-cluster \
  --node-count 3 \
  --node-vm-size Standard_DS3_v2 \
  --network-plugin azure \
  --network-policy calico \
  --generate-ssh-keys
```

The `Standard_DS3_v2` gives you 4 vCPUs and 14 GB RAM per node, which is comfortable for Istio. The Azure CNI network plugin is recommended for better network performance with Istio.

Get credentials:

```bash
az aks get-credentials --resource-group istio-rg --name istio-cluster
```

Verify:

```bash
kubectl get nodes
```

## Step 3: Install Istio

Download Istio:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Install with an AKS-friendly configuration:

```yaml
# istio-aks.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /healthz/ready
            service.beta.kubernetes.io/azure-load-balancer-internal: "false"
```

```bash
istioctl install -f istio-aks.yaml -y
```

## Step 4: Verify Installation

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

The ingress gateway should get an external IP from Azure's load balancer within a minute or two:

```bash
kubectl get svc istio-ingressgateway -n istio-system -w
```

## Step 5: Enable Sidecar Injection and Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the external IP and test:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$INGRESS_HOST/productpage | head -10
```

## Using an Internal Load Balancer

For applications that should only be accessible within your Azure virtual network, configure an internal load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/azure-load-balancer-internal: "true"
            service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "internal-subnet"
```

## Integrating with Azure Application Gateway

For more advanced ingress scenarios, you can put Azure Application Gateway in front of Istio's ingress gateway. This gives you Azure WAF protection and Azure-native TLS termination.

Install the Application Gateway Ingress Controller (AGIC) addon:

```bash
az aks enable-addons \
  --resource-group istio-rg \
  --name istio-cluster \
  --addons ingress-appgw \
  --appgw-name istio-appgw \
  --appgw-subnet-cidr "10.225.0.0/16"
```

Then create an Ingress resource that routes to Istio's gateway:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-ingress
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: istio-ingressgateway
                port:
                  number: 80
```

## Azure Monitor Integration

AKS integrates with Azure Monitor for container insights. You can also send Istio metrics to Azure Monitor:

Enable monitoring on your cluster:

```bash
az aks enable-addons \
  --resource-group istio-rg \
  --name istio-cluster \
  --addons monitoring
```

Install Prometheus and Grafana for Istio-specific dashboards:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
```

## Azure Active Directory Integration

If you're using AKS with Azure AD for authentication, make sure your user or service principal has the right permissions for Istio installation:

```bash
az role assignment create \
  --assignee YOUR_PRINCIPAL_ID \
  --role "Azure Kubernetes Service Cluster Admin Role" \
  --scope /subscriptions/YOUR_SUB/resourceGroups/istio-rg/providers/Microsoft.ContainerService/managedClusters/istio-cluster
```

## Network Policy Considerations

If you enabled Calico network policies (which we did in the cluster creation step), be aware that Istio's mTLS and Calico's network policies can interact in unexpected ways. Istio encrypts pod-to-pod traffic, but Calico operates at the network layer before encryption.

For most setups, this works fine. But if you have strict Calico policies that block certain ports, you might need to add exceptions for Istio's ports:

- 15001: Envoy outbound
- 15006: Envoy inbound
- 15010: istiod gRPC
- 15012: istiod xDS
- 15014: istiod metrics
- 15017: istiod webhook

## Scaling istiod on AKS

For production, run multiple replicas of istiod with a Horizontal Pod Autoscaler:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 80
```

## Troubleshooting AKS-Specific Issues

If the load balancer IP isn't appearing, check your AKS networking configuration. Azure CNI and kubenet behave differently with LoadBalancer services.

If you see `FailedCreatePodSandBox` errors after enabling Istio, your nodes might be running out of IP addresses. Azure CNI allocates an IP per pod, and the default subnet might be too small. You can resize the subnet or switch to Azure CNI with dynamic IP allocation.

If istiod can't start because of webhook failures, check that the AKS API server can reach the webhook service. AKS uses authorized IP ranges by default in some configurations, and this can block webhook calls:

```bash
az aks show --resource-group istio-rg --name istio-cluster --query apiServerAccessProfile
```

Getting Istio running on AKS is straightforward once you account for Azure's networking model. The biggest gotcha is usually around IP address management with Azure CNI, so make sure your subnet is sized appropriately for the number of pods you plan to run with sidecars.
