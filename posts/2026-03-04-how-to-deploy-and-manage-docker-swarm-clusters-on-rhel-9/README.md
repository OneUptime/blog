# How to Deploy and Manage Docker Swarm Clusters on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Docker

Description: Step-by-step guide on deploy and manage docker swarm clusters on rhel 9 with practical examples and commands.

---

Docker Swarm provides simple container orchestration on RHEL 9. This guide covers deploying and managing Swarm clusters.

## Install Docker on RHEL 9

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
```

## Initialize the Swarm

On the manager node:

```bash
sudo docker swarm init --advertise-addr 10.0.1.10
```

Save the join token for worker nodes.

## Join Worker Nodes

On each worker:

```bash
sudo docker swarm join --token SWMTKN-1-xxx 10.0.1.10:2377
```

## Deploy a Service

```bash
sudo docker service create --name web --replicas 3 -p 80:80 nginx
sudo docker service ls
sudo docker service ps web
```

## Scale Services

```bash
sudo docker service scale web=5
```

## Deploy a Stack

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: nginx
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    ports:
      - "80:80"
  redis:
    image: redis
    deploy:
      replicas: 1
```

```bash
sudo docker stack deploy -c docker-compose.yml myapp
sudo docker stack ls
sudo docker stack services myapp
```

## Conclusion

Docker Swarm on RHEL 9 provides straightforward container orchestration for small to medium deployments. For larger environments, consider Kubernetes or OpenShift.

