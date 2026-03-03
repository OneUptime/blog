# How to Set Up AdGuard Home on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, AdGuard Home, DNS, Home Lab, Ad Blocking

Description: Deploy AdGuard Home as a network-wide DNS ad blocker on a Talos Linux Kubernetes cluster for cleaner browsing across all your devices.

---

AdGuard Home is a network-wide ad and tracker blocker that works as a DNS server. Instead of installing ad blockers on every device, you point your entire network's DNS to AdGuard Home and ads get blocked before they ever reach your devices. Running it on a Talos Linux Kubernetes cluster means it benefits from automatic restarts, persistent configuration, and the general reliability you expect from a DNS service.

This guide covers deploying AdGuard Home on Talos Linux with proper DNS configuration and high availability.

## Why AdGuard Home Over Pi-hole

Both AdGuard Home and Pi-hole are excellent DNS-based ad blockers. AdGuard Home has a few advantages that make it a better fit for Kubernetes deployments: it is a single binary (no dependency on PHP and lighttpd), it has a modern web UI, it supports DNS-over-HTTPS and DNS-over-TLS out of the box, and its configuration is stored in a single YAML file that is easy to back up and restore.

## Planning the Deployment

DNS is a critical service. If your DNS server goes down, nothing on your network can resolve hostnames. Plan for reliability:

- Use a LoadBalancer IP that is stable and predictable
- Configure your router's DHCP to hand out this IP as the DNS server
- Consider running two instances for redundancy
- Keep a fallback DNS (like 1.1.1.1) configured on your router

## Deploying AdGuard Home

```yaml
# adguard-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: adguard
---
# adguard-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adguard-initial-config
  namespace: adguard
data:
  AdGuardHome.yaml: |
    http:
      pprof:
        port: 6060
        enabled: false
      address: 0.0.0.0:3000
      session_ttl: 720h
    users:
      - name: admin
        password: "$2y$10$changethishashaftersetup"
    dns:
      bind_hosts:
        - 0.0.0.0
      port: 53
      upstream_dns:
        - https://dns.cloudflare.com/dns-query
        - https://dns.google/dns-query
        - 1.1.1.1
        - 8.8.8.8
      bootstrap_dns:
        - 1.1.1.1
        - 8.8.8.8
      all_servers: false
      cache_size: 4194304
      cache_ttl_min: 300
      cache_ttl_max: 86400
    filtering:
      enabled: true
      url: https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt
    filters:
      - enabled: true
        url: https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt
        name: AdGuard DNS filter
      - enabled: true
        url: https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
        name: Steven Black Unified
---
# adguard-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: adguard-data
  namespace: adguard
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
# adguard-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adguard-home
  namespace: adguard
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: adguard-home
  template:
    metadata:
      labels:
        app: adguard-home
    spec:
      initContainers:
        - name: copy-config
          image: busybox
          command:
            - sh
            - -c
            - |
              if [ ! -f /opt/adguardhome/conf/AdGuardHome.yaml ]; then
                cp /tmp/AdGuardHome.yaml /opt/adguardhome/conf/AdGuardHome.yaml
              fi
          volumeMounts:
            - name: config
              mountPath: /opt/adguardhome/conf
            - name: initial-config
              mountPath: /tmp/AdGuardHome.yaml
              subPath: AdGuardHome.yaml
      containers:
        - name: adguard-home
          image: adguard/adguardhome:latest
          ports:
            - containerPort: 53
              name: dns-tcp
              protocol: TCP
            - containerPort: 53
              name: dns-udp
              protocol: UDP
            - containerPort: 3000
              name: http
              protocol: TCP
            - containerPort: 443
              name: https
              protocol: TCP
            - containerPort: 853
              name: dns-tls
              protocol: TCP
          volumeMounts:
            - name: config
              mountPath: /opt/adguardhome/conf
            - name: data
              mountPath: /opt/adguardhome/work
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: adguard-data
        - name: data
          persistentVolumeClaim:
            claimName: adguard-data
        - name: initial-config
          configMap:
            name: adguard-initial-config
```

## Service Configuration

DNS needs to be accessible on port 53, which requires a LoadBalancer service. The web UI can be on a separate service or the same one:

```yaml
# adguard-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: adguard-dns
  namespace: adguard
  annotations:
    metallb.universe.tf/loadBalancerIPs: "192.168.1.53"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: adguard-home
  ports:
    - port: 53
      targetPort: 53
      name: dns-tcp
      protocol: TCP
    - port: 53
      targetPort: 53
      name: dns-udp
      protocol: UDP
---
apiVersion: v1
kind: Service
metadata:
  name: adguard-web
  namespace: adguard
spec:
  type: LoadBalancer
  selector:
    app: adguard-home
  ports:
    - port: 80
      targetPort: 3000
      name: http
    - port: 443
      targetPort: 443
      name: https
    - port: 853
      targetPort: 853
      name: dns-tls
```

Deploy everything:

```bash
kubectl apply -f adguard-namespace.yaml
kubectl apply -f adguard-config.yaml
kubectl apply -f adguard-pvc.yaml
kubectl apply -f adguard-deployment.yaml
kubectl apply -f adguard-service.yaml
```

## Configuring Your Network

Once AdGuard Home is running, point your network's DNS to it.

### Router Configuration

Log into your router and change the DHCP DNS settings to point to the AdGuard Home IP (192.168.1.53 in our example). This way, every device that connects to your network automatically uses AdGuard Home for DNS.

### Talos Node DNS

Update your Talos nodes to use AdGuard Home as well:

```yaml
machine:
  network:
    nameservers:
      - 192.168.1.53
      - 1.1.1.1  # Fallback in case AdGuard is down
```

Be careful with circular dependencies here. If the Talos node running AdGuard needs DNS to function but its DNS points to AdGuard running on itself, you can hit a chicken-and-egg problem. Always include an external fallback DNS.

## Custom DNS Rewrites

AdGuard Home supports DNS rewrites, which let you create custom DNS entries for your local services. This is one of the most useful features for a home lab:

Through the web UI at http://192.168.1.53, go to Filters > DNS rewrites and add entries:

```text
jellyfin.home.lab  -> 192.168.1.210
grafana.home.lab   -> 192.168.1.211
ha.home.lab        -> 192.168.1.212
plex.home.lab      -> 192.168.1.213
```

Now every device on your network can access your home lab services by hostname without any hosts file modifications.

## Adding Block Lists

The default AdGuard DNS filter catches most ads. For better coverage, add more block lists through the web UI:

Popular block lists to add:

```text
# Steven Black's Unified Hosts (already in our config)
https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts

# OISD - one of the most comprehensive lists
https://big.oisd.nl

# Hagezi's DNS Blocklist - Multi Pro
https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/multi.txt

# 1Hosts Lite
https://o0.pages.dev/Lite/adblock.txt
```

Start with one or two lists and add more as needed. Too many lists can cause false positives that block legitimate sites.

## DNS-over-HTTPS and DNS-over-TLS

AdGuard Home supports encrypted DNS protocols. To enable DNS-over-HTTPS:

1. Get a TLS certificate (Let's Encrypt via cert-manager works)
2. Configure AdGuard Home's TLS settings through the web UI
3. Point clients to `https://dns.home.lab/dns-query`

```yaml
# cert for AdGuard DNS-over-HTTPS
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: adguard-tls
  namespace: adguard
spec:
  secretName: adguard-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - dns.yourdomain.com
```

## Monitoring and Statistics

AdGuard Home provides built-in statistics showing:
- Total queries and blocked queries
- Top blocked domains
- Top clients
- Query log with filtering

Access these through the web dashboard. For integration with Prometheus, use the AdGuard Home Prometheus exporter:

```yaml
# adguard-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adguard-exporter
  namespace: adguard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: adguard-exporter
  template:
    metadata:
      labels:
        app: adguard-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9617"
    spec:
      containers:
        - name: exporter
          image: ebrianne/adguard-exporter:latest
          ports:
            - containerPort: 9617
          env:
            - name: adguard_protocol
              value: "http"
            - name: adguard_hostname
              value: "adguard-web.adguard.svc"
            - name: adguard_username
              value: "admin"
            - name: adguard_password
              valueFrom:
                secretKeyRef:
                  name: adguard-credentials
                  key: password
            - name: adguard_port
              value: "80"
```

## Backup and Recovery

AdGuard Home stores its configuration in a single YAML file and its data in a work directory. Back them up regularly:

```bash
# Backup the config
kubectl cp adguard/adguard-home-xxx:/opt/adguardhome/conf/AdGuardHome.yaml ./adguard-backup.yaml

# For a full backup including query logs and statistics
kubectl exec -n adguard deployment/adguard-home -- \
  tar czf /tmp/adguard-full-backup.tar.gz /opt/adguardhome/
kubectl cp adguard/adguard-home-xxx:/tmp/adguard-full-backup.tar.gz ./adguard-full-backup.tar.gz
```

## Summary

AdGuard Home on Talos Linux provides network-wide ad blocking that is reliable, easy to manage, and integrates well with the rest of your home lab. Deploy it with a stable MetalLB IP, point your router's DHCP DNS settings to that IP, and every device on your network gets ad-free browsing without installing anything. The DNS rewrites feature is a bonus that makes accessing your other home lab services by hostname seamless. Just remember to always have a fallback DNS configured to avoid being locked out if something goes wrong with the deployment.
