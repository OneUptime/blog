# How to Run Pi-hole on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pi-hole, DNS, Ad Blocking, Kubernetes, Networking

Description: Deploy Pi-hole as a network-wide ad blocker on your Talos Linux Kubernetes cluster with persistent configuration and custom DNS settings.

---

Pi-hole is a network-wide ad blocker that acts as a DNS sinkhole, filtering out advertisements and trackers before they ever reach your devices. Running Pi-hole on a Talos Linux Kubernetes cluster is a great option for home labs and small networks because you get the reliability of Kubernetes scheduling along with the security of Talos's immutable operating system. If the pod crashes, Kubernetes restarts it. If you need to update Pi-hole, you just roll out a new container image.

This guide will walk you through deploying Pi-hole on Talos Linux, configuring it as your network's DNS server, and tuning it for optimal performance.

## Prerequisites

You will need:

- A running Talos Linux cluster (a single-node cluster works fine)
- kubectl configured for your cluster
- A storage provisioner for persistent data
- MetalLB or another load balancer solution (to expose DNS on a stable IP)

MetalLB is especially important here because Pi-hole needs to be accessible on a consistent IP address that you can configure as the DNS server in your router.

## Installing MetalLB

If you do not already have MetalLB, install it:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```

Configure an IP address pool:

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.210
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
```

```bash
kubectl apply -f metallb-config.yaml
```

## Creating the Namespace and Storage

```bash
kubectl create namespace pihole
```

Create persistent volume claims for Pi-hole configuration and DNS records:

```yaml
# pihole-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pihole-config
  namespace: pihole
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pihole-dnsmasq
  namespace: pihole
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 500Mi
```

```bash
kubectl apply -f pihole-storage.yaml
```

## Creating the Pi-hole Secret

Set a password for the Pi-hole admin interface:

```bash
# Create a secret for the Pi-hole admin password
kubectl create secret generic pihole-admin \
  --namespace pihole \
  --from-literal=password='your-pihole-password'
```

## Deploying Pi-hole

Create the deployment manifest:

```yaml
# pihole-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pihole
  namespace: pihole
  labels:
    app: pihole
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: pihole
  template:
    metadata:
      labels:
        app: pihole
    spec:
      containers:
        - name: pihole
          image: pihole/pihole:latest
          ports:
            - containerPort: 80
              name: http
              protocol: TCP
            - containerPort: 53
              name: dns-tcp
              protocol: TCP
            - containerPort: 53
              name: dns-udp
              protocol: UDP
          env:
            - name: TZ
              value: "America/New_York"
            - name: WEBPASSWORD
              valueFrom:
                secretKeyRef:
                  name: pihole-admin
                  key: password
            - name: PIHOLE_DNS_
              value: "1.1.1.1;8.8.8.8"
            - name: DNSSEC
              value: "true"
            - name: DNSMASQ_LISTENING
              value: "all"
          volumeMounts:
            - name: pihole-config
              mountPath: /etc/pihole
            - name: pihole-dnsmasq
              mountPath: /etc/dnsmasq.d
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /admin/
              port: 80
            initialDelaySeconds: 60
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /admin/
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: pihole-config
          persistentVolumeClaim:
            claimName: pihole-config
        - name: pihole-dnsmasq
          persistentVolumeClaim:
            claimName: pihole-dnsmasq
```

Apply it:

```bash
kubectl apply -f pihole-deployment.yaml
```

## Exposing Pi-hole Services

Pi-hole needs two services: one for the web interface and one for DNS. DNS needs both TCP and UDP on port 53, and it must be exposed on a LoadBalancer IP that your router can point to:

```yaml
# pihole-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: pihole-dns-tcp
  namespace: pihole
  annotations:
    metallb.universe.tf/allow-shared-ip: pihole-dns
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
    - port: 53
      targetPort: 53
      protocol: TCP
      name: dns-tcp
  selector:
    app: pihole
---
apiVersion: v1
kind: Service
metadata:
  name: pihole-dns-udp
  namespace: pihole
  annotations:
    metallb.universe.tf/allow-shared-ip: pihole-dns
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
    - port: 53
      targetPort: 53
      protocol: UDP
      name: dns-udp
  selector:
    app: pihole
---
apiVersion: v1
kind: Service
metadata:
  name: pihole-web
  namespace: pihole
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
      name: http
  selector:
    app: pihole
```

Apply the services:

```bash
kubectl apply -f pihole-services.yaml
```

## Configuring Your Network

Once Pi-hole is running and the LoadBalancer IP is assigned, configure your router to use 192.168.1.200 as the primary DNS server. This varies by router, but the general steps are:

1. Log into your router's admin interface
2. Find the DHCP or DNS settings
3. Set the primary DNS server to 192.168.1.200
4. Optionally set a secondary DNS server like 1.1.1.1 as fallback

After changing DHCP settings, devices will pick up the new DNS on their next lease renewal. You can force this on individual devices by disconnecting and reconnecting to the network.

## Verifying DNS Resolution

Test that Pi-hole is working correctly:

```bash
# Test DNS resolution through Pi-hole
dig @192.168.1.200 example.com

# Test that ad domains are being blocked
dig @192.168.1.200 ads.google.com
```

The first query should return a valid IP address. The second should return 0.0.0.0, indicating that Pi-hole is blocking the ad domain.

## Adding Custom Blocklists

Pi-hole comes with a default blocklist, but you can add more for better coverage. Access the admin interface at http://192.168.1.200/admin and navigate to Adlists under Group Management. Some popular blocklists include:

```text
https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
https://raw.githubusercontent.com/PolishFiltersTeam/KADhosts/master/KADhosts.txt
https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.Spam/hosts
https://v.firebog.net/hosts/Easyprivacy.txt
https://v.firebog.net/hosts/Prigent-Crypto.txt
```

You can also add these via the command line:

```bash
# Add a blocklist through the Pi-hole CLI
kubectl exec -n pihole deployment/pihole -- pihole -a adlist add \
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"

# Update gravity (process blocklists)
kubectl exec -n pihole deployment/pihole -- pihole -g
```

## Custom DNS Records

Pi-hole can also serve as a local DNS resolver for your home network. Add custom DNS records for your internal services:

```bash
# Add a custom DNS record
kubectl exec -n pihole deployment/pihole -- sh -c \
  'echo "192.168.1.100 myserver.home.local" >> /etc/pihole/custom.list'

# Restart DNS to pick up changes
kubectl exec -n pihole deployment/pihole -- pihole restartdns
```

Or use a ConfigMap for more structured management:

```yaml
# pihole-custom-dns.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pihole-custom-dns
  namespace: pihole
data:
  custom.list: |
    192.168.1.100 server.home.local
    192.168.1.101 nas.home.local
    192.168.1.200 pihole.home.local
```

## Monitoring Pi-hole

Pi-hole has a built-in dashboard that shows query statistics, blocked domains, and client activity. For more detailed monitoring, you can export metrics to Prometheus using a Pi-hole exporter:

```yaml
# pihole-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pihole-exporter
  namespace: pihole
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pihole-exporter
  template:
    metadata:
      labels:
        app: pihole-exporter
    spec:
      containers:
        - name: exporter
          image: ekofr/pihole-exporter:latest
          ports:
            - containerPort: 9617
          env:
            - name: PIHOLE_HOSTNAME
              value: pihole-web.pihole.svc.cluster.local
            - name: PIHOLE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: pihole-admin
                  key: password
            - name: PORT
              value: "9617"
```

## Conclusion

Pi-hole on Talos Linux is a reliable and secure way to block ads and trackers across your entire network. The Kubernetes layer ensures Pi-hole stays running even if the container crashes, while Talos's immutable design protects the underlying infrastructure. With MetalLB providing a stable IP address and persistent volumes keeping your configuration safe, you have a production-quality DNS filtering solution that requires minimal maintenance.
