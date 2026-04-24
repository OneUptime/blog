# How to Set Up Pod Affinity and Anti-Affinity via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Pod Affinity, Scheduling, Infrastructure

Description: Configure Kubernetes pod affinity and anti-affinity rules to control pod co-location for performance and availability.

## Introduction

Pod affinity and anti-affinity rules control which nodes pods can be scheduled on based on labels of other pods already running in the relevant topology domain. Affinity brings related pods together (reducing latency), while anti-affinity spreads pods apart (improving availability). Portainer's YAML editor supports these scheduling rules.

## Affinity Types

- **requiredDuringSchedulingIgnoredDuringExecution**: Hard rule (pod won't schedule if not satisfied)
- **preferredDuringSchedulingIgnoredDuringExecution**: Soft rule (scheduler tries but proceeds if not possible)

## Pod Anti-Affinity for High Availability

```yaml
# anti-affinity-ha.yml - deploy via Portainer

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      affinity:
        podAntiAffinity:
          # REQUIRED: Never place two web-api pods on the same node
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web-api
            topologyKey: kubernetes.io/hostname
          # PREFERRED: Try to spread across availability zones
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web-api
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: api
        image: myapp:latest
```

## Pod Affinity for Co-location

```yaml
# affinity-colocation.yml
# Place app pods near their cache pods to reduce latency
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      affinity:
        podAffinity:
          # PREFERRED: Run near Redis pods
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: redis-cache
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myapp:latest
```

## Topology Spread Constraints (Modern Alternative)

```yaml
# topology-spread.yml
# More flexible than affinity for spreading pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      topologySpreadConstraints:
      # Spread evenly across zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule  # Hard requirement
        labelSelector:
          matchLabels:
            app: web-frontend
      # Spread evenly across nodes
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway  # Soft requirement
        labelSelector:
          matchLabels:
            app: web-frontend
      containers:
      - name: frontend
        image: myapp:latest
```

## Database Pods: Strict Anti-Affinity

```yaml
# Database replicas must be on different nodes
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  clusterIP: None
  selector:
    app: mongodb
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  replicas: 3
  serviceName: mongodb
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: mongodb
            topologyKey: kubernetes.io/hostname
          - labelSelector:
              matchLabels:
                app: mongodb
            topologyKey: topology.kubernetes.io/zone  # Also different zones
      containers:
      - name: mongodb
        image: mongo:latest
```

## Conclusion

Pod affinity and anti-affinity rules deployed via Portainer give you precise control over pod placement for performance and availability. Use anti-affinity to spread replicas across nodes and zones for high availability. Use affinity to co-locate related services for lower latency. Topology spread constraints provide a more expressive and flexible alternative for even distribution across failure domains.
