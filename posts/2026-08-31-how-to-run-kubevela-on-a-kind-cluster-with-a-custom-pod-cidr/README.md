# How to Run KubeVela on a kind Cluster with a Custom Pod CIDR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Platform Engineering, Troubleshooting

Description: Build a disposable kind cluster with a nonoverlapping Pod network, install KubeVela, and verify control-plane and workload connectivity.

---

A custom Pod CIDR is useful when kind's default network overlaps a VPN, office route, Docker network, or another local cluster. Configure it when creating the cluster. Changing Pod addressing after nodes and the CNI are initialized is not a normal in-place operation; for a disposable kind environment, recreate the cluster from a reviewed configuration.

KubeVela uses Kubernetes as its control plane, so there is no KubeVela-specific Pod CIDR field. The sequence is: choose nonoverlapping ranges, configure kind networking, verify the Kubernetes version is supported by the KubeVela release, and then install the KubeVela chart.

## Choose ranges deliberately

The commands below assume kind is using Docker as its provider. Inventory routes visible from the host and Docker networks:

```bash
ip route 2>/dev/null || netstat -rn
docker network ls
docker network inspect \
  --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}} {{end}}' \
  $(docker network ls --quiet)
docker network inspect kind 2>/dev/null
```

Choose a private range that does not overlap:

- the host LAN or VPN routes;
- Docker bridge networks;
- the kind node-container network;
- the Kubernetes Service CIDR;
- Pod or Service CIDRs in clusters you will connect to; or
- destinations that Pods must reach.

This example uses `10.200.0.0/16` for Pods and `10.201.0.0/16` for Services so that both differ from kind's usual IPv4 defaults. They are examples, not universally safe choices. Replace them after checking your environment.

## Create the kind configuration

KubeVela v1.11's current installation page supports Kubernetes `>=1.19` and `<=1.31`. The example below uses kind v0.31.0 and the digest-pinned Kubernetes v1.31.14 node image published with that kind release. Use that kind release to reproduce the pairing exactly.

Save this as `kind-vela.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: vela-lab
networking:
  ipFamily: ipv4
  podSubnet: "10.200.0.0/16"
  serviceSubnet: "10.201.0.0/16"
nodes:
  - role: control-plane
    image: kindest/node:v1.31.14@sha256:6f86cf509dbb42767b6e79debc3f2c32e4ee01386f0489b3b2be24b0a55aac2b
  - role: worker
    image: kindest/node:v1.31.14@sha256:6f86cf509dbb42767b6e79debc3f2c32e4ee01386f0489b3b2be24b0a55aac2b
```

Create the cluster:

```bash
kind version
kind create cluster --config kind-vela.yaml --wait 5m
kubectl config current-context
kubectl get nodes -o wide
```

kind node images bundle a particular Kubernetes version. The kind v0.33.0 default is Kubernetes v1.37.0, outside KubeVela v1.11's documented range, which is why this configuration pins an older image. Kubernetes v1.31 is also upstream end-of-life, so use this pairing only for the disposable lab described here. Recheck the support page for the KubeVela release you actually install and select an image documented for the kind release you use. In reproducible CI, pin both the kind version and the full node image reference, including the digest published by kind.

## Verify the cluster network before installing KubeVela

Inspect node Pod CIDRs and confirm that the built-in Kubernetes Service received an address from the intended Service CIDR:

```bash
kubectl get nodes \
  -o custom-columns=NAME:.metadata.name,POD_CIDR:.spec.podCIDR
kubectl get service kubernetes \
  -o custom-columns=NAME:.metadata.name,CLUSTER_IP:.spec.clusterIP
kubectl get pods --all-namespaces -o wide
```

Every node should receive a subrange within the configured Pod CIDR. CoreDNS and the kind networking components should be ready before KubeVela is added:

```bash
kubectl wait --namespace kube-system \
  --for=condition=Ready pod --all --timeout=5m
```

If this fails, troubleshoot kind/CNI networking first. Installing another controller adds noise but cannot repair an overlapping host route.

## Install KubeVela

The official Helm installation is:

```bash
helm repo add kubevela https://kubevela.github.io/charts
helm repo update
helm search repo kubevela/vela-core --versions

helm install kubevela kubevela/vela-core \
  --namespace vela-system \
  --create-namespace \
  --version 1.11.0 \
  --wait \
  --timeout 15m
```

This example pins the KubeVela v1.11.0 chart. If you select another release, use a chart version compatible with the selected Kubernetes version and pin a compatible `vela` CLI. The current KubeVela guide also supports `vela install`; using Helm explicitly is helpful in CI because release name, namespace, and chart version are visible.

Check the result:

```bash
helm status kubevela --namespace vela-system
kubectl get pods --namespace vela-system -o wide
vela version
```

Pod addresses for the KubeVela controllers should fall inside the configured Pod CIDR. Their Kubernetes Services should use the Service CIDR.

## Run a smoke-test Application

Create `hello-vela.yaml`:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: hello-vela
  namespace: default
spec:
  components:
    - name: web
      type: webservice
      properties:
        image: nginx:1.27
        ports:
          - port: 80
            expose: true
```

Before relying on an example, inspect the installed schema because built-in definitions evolve:

```bash
vela show webservice
vela up --file hello-vela.yaml
vela status hello-vela --tree --detail
kubectl get pods,services -l app.oam.dev/name=hello-vela -o wide
```

If the label query differs in your release, use `vela status hello-vela --tree` to discover the resources. Port-forward the generated Service rather than adding host routes to Pod IPs:

```bash
vela port-forward hello-vela
```

Pod IPs are internal and ephemeral; exposing them directly to the host defeats Kubernetes Service discovery and often fails on Docker Desktop networking.

## Diagnose CIDR-related failures

An overlap often looks like selective timeouts: the host can reach Kubernetes, but Pods cannot reach a VPN subnet, DNS replies disappear, or traffic follows the Docker bridge instead of the intended route. Capture evidence from both host and cluster:

```bash
kubectl get nodes -o yaml | sed -n '/podCIDR/,+2p'
kubectl get pods --all-namespaces -o wide
docker network inspect kind
kubectl -n kube-system logs -l k8s-app=kindnet --tail=200
```

The networking label and implementation can vary, so list kube-system Pods before choosing a log selector. Also distinguish the Pod CIDR from the Service CIDR. Service `ClusterIP` addresses are virtual and must not overlap Pod or reachable external networks.

For a test cluster, preserve manifests and logs, then recreate with corrected ranges:

```bash
kind delete cluster --name vela-lab
kind create cluster --config kind-vela.yaml --wait 5m
```

Deletion removes the entire kind cluster. Never run it against a name you have not verified with `kind get clusters`.

## Official Documentation

- [kind cluster configuration](https://kind.sigs.k8s.io/docs/user/configuration/)
- [kind quick start and node images](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [KubeVela installation on Kubernetes](https://kubevela.io/docs/installation/kubernetes/)
- [Kubernetes cluster networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes Service ClusterIP allocation](https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/)

## Conclusion

Set kind's `podSubnet` and `serviceSubnet` before cluster creation, after checking every host, Docker, VPN, and remote-cluster route they may meet. Verify CoreDNS and node CIDRs before installing a version-pinned KubeVela chart, then use a small Application to test rendering, scheduling, Service creation, and port forwarding. When ranges overlap, recreating a disposable kind cluster is safer and clearer than trying to rewrite live networking state.
