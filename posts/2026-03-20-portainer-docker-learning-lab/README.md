# How to Set Up a Docker Learning Lab with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Learning, Education, Lab

Description: Build an interactive Docker learning lab using Portainer where students can experiment with containers safely in isolated environments.

## Introduction

A Docker learning lab provides hands-on experience with containers without the risk of breaking production systems. Portainer's access control and team management make it useful for educational settings: students can be given access only to the lab resources assigned to them, instructors have oversight, and the visual interface lowers the barrier to entry. This guide sets up a complete learning lab infrastructure.

## Architecture

The learning lab consists of:
- A Docker host (or small cluster) with Portainer installed
- One Portainer user or team per student or lab group
- Separate stacks and networks per lab, or separate Docker environments when stronger isolation is required
- Pre-built exercise stacks for each lesson

## Step 1: Install Portainer for the Lab

```bash
# Install Docker on the lab server

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Deploy Portainer
sudo docker volume create portainer_data
sudo docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

echo "Portainer running at https://<lab-server>:9443"
```

Log out and back in before running `docker` commands without `sudo`. Portainer uses a self-signed certificate on port `9443` by default, so the API examples below use `curl -k` unless you have installed a trusted certificate.

## Step 2: Create Student Accounts via API

```bash
#!/bin/bash
# create-student-accounts.sh
PORTAINER_URL="https://portainer.lab.local:9443"
ADMIN_TOKEN=$(curl -ks -X POST \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"admin-password"}' \
  "$PORTAINER_URL/api/auth" | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Read student list from CSV: username,email
while IFS=',' read -r username email; do
  # Create user account
  PASSWORD="Lab$(echo $RANDOM | md5sum | head -c8)"
  
  curl -ks -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"Username\":\"$username\",\"Password\":\"$PASSWORD\",\"Role\":2}" \
    "$PORTAINER_URL/api/users"
  
  echo "$username,$PASSWORD" >> student-credentials.csv
  echo "Created account for: $username"
done < students.csv

echo "Credentials saved to student-credentials.csv"
```

After creating users, assign each user or team access to the correct Portainer environment under **Environment-related > Environments > Manage access**. This controls access to Portainer resources; if you need stronger runtime isolation, use a separate Docker environment per student or lab group.

## Step 3: Set Up Lab Exercise Stacks

Create pre-built exercises that students deploy. If multiple students share the same Docker host, publish only the container port so Docker can assign an available host port instead of colliding on a fixed `8080` or `8081`. Portainer will show the published port after deployment.

```yaml
# exercise-01-hello-nginx/docker-compose.yml
services:
  web:
    image: nginx:alpine
    ports:
      - "80"
    networks:
      - lab
    labels:
      lab.managed: "true"
      lab.exercise: "01"
      lab.topic: "nginx-basics"

networks:
  lab:
    labels:
      lab.managed: "true"
      lab.exercise: "01"
```

```yaml
# exercise-02-multi-container/docker-compose.yml
services:
  wordpress:
    image: wordpress:latest
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wp_user
      WORDPRESS_DB_PASSWORD: wp_pass
      WORDPRESS_DB_NAME: wordpress
    ports:
      - "80"
    depends_on:
      - db
    networks:
      - lab
    labels:
      lab.managed: "true"
      lab.exercise: "02"
      lab.topic: "multi-container"

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wp_user
      MYSQL_PASSWORD: wp_pass
      MYSQL_ROOT_PASSWORD: root_pass
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - lab
    labels:
      lab.managed: "true"
      lab.exercise: "02"
      lab.topic: "multi-container"

volumes:
  db_data:
    labels:
      lab.managed: "true"
      lab.exercise: "02"

networks:
  lab:
    labels:
      lab.managed: "true"
      lab.exercise: "02"
```

## Step 4: Configure Resource Limits Per Student

Prevent any student from monopolizing lab resources:

```yaml
# Add limits to each lab service on Docker Standalone
services:
  web:
    image: nginx:alpine
    cpus: 0.50
    mem_limit: 256m
    pids_limit: 100
```

On Docker Standalone, apply these limits in each exercise stack. If you are running a Swarm-based lab instead, use `deploy.resources` for the services in that stack.

## Step 5: Create a Lab Exercises Repository

```bash
# Structure for lab exercises
lab-exercises/
├── 01-run-first-container/
│   ├── README.md          # Instructions
│   ├── docker-compose.yml # Exercise stack
│   └── solution/          # Solution for instructors
├── 02-volumes-and-data/
├── 03-custom-images/
├── 04-multi-service-apps/
├── 05-environment-variables/
└── 06-networking-basics/
```

```bash
# Host exercises in a Git repo and configure Portainer
# Stacks > Add Stack > Git Repository
# Repository URL: https://github.com/your-org/lab-exercises
# Compose path: 01-run-first-container/docker-compose.yml
```

## Step 6: Instructor Dashboard

Create a monitoring view for the instructor:

```bash
#!/bin/bash
# instructor-dashboard.sh - Show all student containers
PORTAINER_URL="https://portainer.lab.local:9443"
ENVIRONMENT_ID=1   # Replace with your lab environment ID
API_KEY="instructor-access-token"

echo "=== Student Container Status ==="
curl -ks \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENVIRONMENT_ID/docker/containers/json?all=true" | \
  python3 -c "
import sys, json
containers = json.load(sys.stdin)
for c in containers:
  labels = c.get('Labels', {})
  exercise = labels.get('lab.exercise', 'unknown')
  name = c['Names'][0] if c['Names'] else 'unnamed'
  status = c['Status']
  print(f'Exercise {exercise}: {name} - {status}')
"
```

## Step 7: Auto-Cleanup Script

Clean up student environments after each lab session:

```bash
#!/bin/bash
# cleanup-lab.sh - Remove all lab containers, volumes, and networks
echo "Cleaning up lab environment..."

# Stop and remove containers with lab labels
docker ps -a --filter "label=lab.managed=true" --format "{{.ID}}" | \
  xargs -r docker rm -f

# Remove lab volumes
docker volume ls --filter "label=lab.managed=true" --format "{{.Name}}" | \
  xargs -r docker volume rm

# Remove lab networks
docker network ls --filter "label=lab.managed=true" --format "{{.Name}}" | \
  xargs -r docker network rm

echo "Lab cleanup complete"
```

## Conclusion

A Portainer-based Docker learning lab provides students with visual container environments that reduce friction in learning Docker concepts. Portainer's access control keeps lab resources separated in the UI, while the API enables automated provisioning and cleanup between sessions. Pre-built exercise stacks let instructors focus on teaching rather than environment setup, making Portainer an effective platform for Docker education at any scale.
